import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);

  const isProd = process.env.NODE_ENV === "production";
  
  // Detect Prisma and JWT errors
  const isPrismaError = 
    err.name?.includes("Prisma") || 
    err.message?.includes("prisma") || 
    err.code?.startsWith("P20") || 
    err.message?.toLowerCase().includes("select ") ||
    err.message?.toLowerCase().includes("insert into") ||
    err.message?.toLowerCase().includes("postgresql");

  const isJwtError = 
    err.name?.includes("JsonWebTokenError") || 
    err.name?.includes("NotBeforeError") || 
    err.name?.includes("TokenExpiredError") || 
    err.message?.toLowerCase().includes("jwt");

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "Internal Server Error";

  if (isPrismaError) {
    if (err.code === "P2002") {
      statusCode = 409;
      code = "CONFLICT";
      message = "A resource with this unique property already exists.";
    } else if (err.code === "P2025") {
      statusCode = 404;
      code = "NOT_FOUND";
      message = "The requested resource could not be found in the database.";
    } else if (err.code === "P2003") {
      statusCode = 400;
      code = "BAD_REQUEST";
      message = "Related database record not found.";
    } else {
      statusCode = 400;
      code = "DATABASE_ERROR";
      message = isProd ? "A database operation error occurred." : message;
    }
  } else if (isJwtError) {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Invalid or expired authentication token.";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    code = "FILE_TOO_LARGE";
    message = "File size exceeds 10MB limit";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    code = "UNEXPECTED_FILE_FIELD";
    message = "Unexpected file upload field name";
  }

  // Sanitize internal server errors in production
  if (isProd && statusCode === 500) {
    message = "An unexpected server error occurred. Please contact the administrator if this persists.";
  }

  // Clean up paths in production
  if (isProd && typeof message === "string") {
    message = message.replace(/\/[\w\-\.\/]+/g, "[path]");
  }

  const isStorefront = req.originalUrl.startsWith("/api/storefront");
  
  if (isStorefront) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation Error",
        errors: ((err as any).errors || (err as any).issues || []).map((e: any) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      });
    }
    
    return res.status(statusCode).json({
      status: "error",
      message: message,
      errors: (err as any).errors || []
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: ((err as any).errors || (err as any).issues || []).map((e: any) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    },
  });
};
