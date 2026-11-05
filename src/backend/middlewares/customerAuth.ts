import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/db";
import { verifyCustomerToken } from "../utils/customerJwt";

export interface CustomerAuthRequest extends Request {
  customer?: {
    id: string;
    email: string | null;
    firstName: string;
  };
}

export const optionalCustomerAuth = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyCustomerToken(token);
      if (decoded.tokenType === "access") {
        const currentCustomer = await prisma.customer.findUnique({
          where: { id: decoded.id },
        });

        if (currentCustomer && currentCustomer.isActive && !currentCustomer.deletedAt) {
          req.customer = {
            id: currentCustomer.id,
            email: currentCustomer.email,
            firstName: currentCustomer.firstName,
          };
        }
      }
    } catch {
      // For optional auth, an invalid token simply leaves req.customer undefined (guest mode)
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireCustomerAuth = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401, "UNAUTHORIZED")
      );
    }

    const decoded = verifyCustomerToken(token);

    if (decoded.tokenType !== "access") {
      return next(new AppError("Invalid token type", 401, "UNAUTHORIZED"));
    }

    const currentCustomer = await prisma.customer.findUnique({
      where: { id: decoded.id },
    });

    if (!currentCustomer || !currentCustomer.isActive || currentCustomer.deletedAt) {
      return next(
        new AppError("The customer belonging to this token no longer exists or is inactive.", 401, "UNAUTHORIZED")
      );
    }

    req.customer = {
      id: currentCustomer.id,
      email: currentCustomer.email,
      firstName: currentCustomer.firstName,
    };

    next();
  } catch (error: any) {
    const isExpired = error.message === "jwt expired" || error.name === "TokenExpiredError";
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    
    if (!isExpired) {
      console.warn(`[SECURITY] Invalid customer JWT Token attempt from IP: ${ip}, error: ${error.message}`);
      try {
        await prisma.activityLog.create({
          data: {
            userId: null,
            action: "INVALID_CUSTOMER_TOKEN",
            entityType: "Security",
            entityId: null,
            ipAddress: ip,
            details: JSON.stringify({
              reason: error.message || "JWT verification failed",
              tokenFragment: req.headers.authorization ? req.headers.authorization.substring(0, 15) + "..." : null,
              timestamp: new Date().toISOString()
            })
          }
        });
      } catch (logErr) {
        console.error("Failed to log invalid customer token to activity log:", logErr);
      }
    }

    return next(new AppError(isExpired ? "Token expired" : "Invalid token", 401, "UNAUTHORIZED"));
  }
};
