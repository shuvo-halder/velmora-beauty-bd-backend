import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/audit.service";
import { RICH_TEXT_FIELDS, sanitizeRichText } from "../utils/richTextSanitizer";

// Part 12 - Password Policy Schema
// Minimum: 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: strongPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
  roleId: z.string().uuid("Invalid Role ID (must be a valid UUID)"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  password: strongPasswordSchema.optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// Part 3 - UUID & Query Schema
export const uuidSchema = z.string().uuid("Invalid ID format (must be a valid UUID)");

export const querySchema = z.object({
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 10), z.number().int().min(1).max(100).default(10)),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  keyword: z.string().optional(),
});

// Middleware factory for validating Request Body
export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError || error?.name === "ZodError") {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMsg = issues.length > 0 
          ? issues.map((e: any) => `${e.path?.join(".") || "field"}: ${e.message}`).join(", ")
          : error.message || "Invalid request payload";
        return next(new AppError(errorMsg, 400, "VALIDATION_ERROR"));
      }
      next(error);
    }
  };
};

// Middleware factory for validating Request Query Params
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query) as any;
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError || error?.name === "ZodError") {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMsg = issues.length > 0 
          ? issues.map((e: any) => `${e.path?.join(".") || "field"}: ${e.message}`).join(", ")
          : error.message || "Invalid query parameters";
        return next(new AppError(errorMsg, 400, "VALIDATION_ERROR"));
      }
      next(error);
    }
  };
};

// Middleware for validating route UUID parameters
export const validateParamsUUID = (paramNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const name of paramNames) {
      const val = req.params[name];
      if (val) {
        const result = uuidSchema.safeParse(val);
        if (!result.success) {
          return next(new AppError(`Invalid UUID for parameter '${name}'`, 400, "INVALID_ID"));
        }
      }
    }
    next();
  };
};

// Recursive Sanitization function (Part 4 & Rich Text Aware)
function sanitizeValue(value: any, keyName?: string): any {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // If field is a recognized rich text field, use server-side rich text sanitizer
    if (keyName && RICH_TEXT_FIELDS.has(keyName)) {
      return sanitizeRichText(value);
    }

    let cleaned = value;

    // 1. Prototype Pollution protection in strings
    if (cleaned.includes("__proto__") || cleaned.includes("constructor") || cleaned.includes("prototype")) {
      cleaned = cleaned.replace(/__proto__|constructor|prototype/g, "");
    }

    // 2. XSS protection: strip HTML and scripts for standard text fields
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleaned = cleaned.replace(/<[^>]*>/g, ""); // Strip general HTML tags for standard string fields
    cleaned = cleaned.replace(/javascript\s*:/gi, "");
    cleaned = cleaned.replace(/onerror\s*=/gi, "");
    cleaned = cleaned.replace(/onload\s*=/gi, "");

    // 3. Basic SQL Injection characters (prepared statements handles this, but sanitizing is extra safe)
    cleaned = cleaned.replace(/('|--|\/\*|\*\/)/g, "");

    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, keyName));
  }

  if (typeof value === "object") {
    const sanitizedObj: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        // Prototype Pollution prevention on keys
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          continue;
        }

        // NoSQL Injection prevention: strip prefix $ if used maliciously
        let sanitizedKey = key;
        if (key.startsWith("$")) {
          sanitizedKey = key.substring(1);
        }

        sanitizedObj[sanitizedKey] = sanitizeValue(value[key], sanitizedKey);
      }
    }
    return sanitizedObj;
  }

  return value;
}

// Sanitization middleware (Part 4 & Part 13)
export const sanitizeMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyStr = req.body ? JSON.stringify(req.body) : "";
    const queryStr = req.query ? JSON.stringify(req.query) : "";

    // Detect suspicious activity like prototype pollution or script tags
    const containsSuspicious =
      bodyStr.includes("__proto__") ||
      bodyStr.includes("<script") ||
      queryStr.includes("__proto__") ||
      queryStr.includes("<script");

    if (containsSuspicious) {
      console.warn(`[SECURITY] Suspicious activity detected from IP: ${req.ip || req.socket.remoteAddress}`);
      await AuditService.createLog(
        null,
        "SUSPICIOUS_ACTIVITY",
        "Security",
        null,
        null,
        {
          type: "SUSPICIOUS_PAYLOAD_PATTERN",
          path: req.originalUrl,
          userAgent: req.headers["user-agent"],
        },
        req
      );
    }

    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// CMS Validation schemas
export const createPageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional().default("DRAFT"),
  pageType: z.enum(["HOME", "ABOUT", "CONTACT", "POLICY", "CUSTOM"]).optional().default("CUSTOM"),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
});

export const updatePageSchema = createPageSchema.partial();

export const createLandingPageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional().default("DRAFT"),
});

export const updateLandingPageSchema = createLandingPageSchema.partial();

export const createBlogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional().default("DRAFT"),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
  authorId: z.string().uuid("Invalid author ID").optional().nullable(),
  featuredImageId: z.string().uuid("Invalid image ID").optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const createFAQSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
  orderIndex: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isGlobal: z.boolean().optional().default(true),
});

export const updateFAQSchema = createFAQSchema.partial();

export const createMediaAssetSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(0),
  url: z.string().url("Invalid URL"),
  folder: z.string().optional().default("root"),
  altText: z.string().optional().nullable(),
});

export const updateMediaAssetSchema = createMediaAssetSchema.partial();

export const updateGlobalSeoSchema = z.object({
  siteTitle: z.string().min(1, "Site title is required"),
  siteDescription: z.string().min(1, "Site description is required"),
  metaKeywords: z.string().optional().nullable(),
  defaultOgImage: z.string().url("Invalid URL").optional().nullable(),
  robotsConfig: z.string().optional().nullable(),
});

export * from "../validators/product-faq.validator";
