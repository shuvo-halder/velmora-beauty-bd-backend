import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/db";
import { PermissionPair, PermissionService } from "../services/permission.service";
import { AuditService } from "../services/audit.service";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
    permissions: PermissionPair[];
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      return next();
    }

    let token: string | undefined;
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

    // JWT Hardening: signature, expiration, issuer, audience verification
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: "ecommerce-admin-api",
      audience: "ecommerce-admin-app",
    }) as any;

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!currentUser || !currentUser.isActive || currentUser.deletedAt) {
      return next(
        new AppError("The user belonging to this token no longer exists or is inactive.", 401, "UNAUTHORIZED")
      );
    }

    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      roleId: currentUser.roleId,
      roleName: currentUser.role?.name || "",
      permissions: (currentUser.role?.permissions || []).map((p) => ({
        module: p.module,
        action: p.action,
      })),
    };

    next();
  } catch (error: any) {
    const ip = req.ip || req.socket.remoteAddress || "Unknown";
    console.warn(`[SECURITY] Invalid or malformed JWT Token attempt from IP: ${ip}, error: ${error.message}`);

    await AuditService.createLog(
      null,
      "INVALID_TOKEN",
      "Security",
      null,
      null,
      {
        reason: error.message || "JWT verification failed",
        tokenFragment: req.headers.authorization ? req.headers.authorization.substring(0, 15) + "..." : null,
      },
      req
    );

    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
};

/**
 * Reusable permission verification middleware.
 * Supports:
 * - requirePermission("Products", "read")
 * - requirePermission("products.read")
 * - requirePermission("products:create")
 * - requirePermission({ module: "Products", action: "write" })
 */
export const requirePermission = (
  permissionOrModule: string | PermissionPair,
  action?: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
      }

      // Safe SuperAdmin bypass check directly from database user role
      if (PermissionService.isSuperAdmin(req.user)) {
        return next();
      }

      const hasPerm = PermissionService.hasPermission(
        req.user,
        permissionOrModule,
        action
      );

      if (!hasPerm) {
        const requiredStr =
          action !== undefined && typeof permissionOrModule === "string"
            ? `${permissionOrModule}.${action}`
            : JSON.stringify(permissionOrModule);

        console.warn(
          `[SECURITY] Access Denied: User ${req.user.email} lacks required permission (${requiredStr})`
        );

        await AuditService.logAccessDenied(
          req.user.id,
          requiredStr,
          req
        );

        return next(
          new AppError(
            `You do not have permission (${requiredStr}) to perform this action`,
            403,
            "FORBIDDEN"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require AT LEAST ONE permission from a list.
 */
export const requireAnyPermission = (
  permissions: Array<string | PermissionPair | [string, string]>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
      }

      if (PermissionService.isSuperAdmin(req.user)) {
        return next();
      }

      const hasPerm = PermissionService.hasAnyPermission(req.user, permissions);

      if (!hasPerm) {
        const requiredStr = permissions
          .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
          .join(" OR ");

        console.warn(
          `[SECURITY] Access Denied: User ${req.user.email} lacks any of (${requiredStr})`
        );

        await AuditService.logAccessDenied(
          req.user.id,
          requiredStr,
          req
        );

        return next(
          new AppError(
            `You do not have permission (${requiredStr}) to perform this action`,
            403,
            "FORBIDDEN"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require ALL permissions from a list.
 */
export const requireAllPermissions = (
  permissions: Array<string | PermissionPair | [string, string]>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
      }

      if (PermissionService.isSuperAdmin(req.user)) {
        return next();
      }

      const hasPerm = PermissionService.hasAllPermissions(req.user, permissions);

      if (!hasPerm) {
        const requiredStr = permissions
          .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
          .join(" AND ");

        console.warn(
          `[SECURITY] Access Denied: User ${req.user.email} lacks all required permissions (${requiredStr})`
        );

        await AuditService.logAccessDenied(
          req.user.id,
          requiredStr,
          req
        );

        return next(
          new AppError(
            `You do not have required permissions (${requiredStr}) to perform this action`,
            403,
            "FORBIDDEN"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require genuine SuperAdmin role.
 */
export const requireSuperAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !PermissionService.isSuperAdmin(req.user)) {
    const userId = req.user?.id || null;
    console.warn(`[SECURITY] SuperAdmin access denied for user ${req.user?.email || "Anonymous"}`);

    await AuditService.logPrivilegeEscalationAttempt(
      userId,
      "UNAUTHORIZED_SUPERADMIN_ENDPOINT_ACCESS",
      {
        path: req.originalUrl,
        method: req.method,
      },
      req
    );

    return next(new AppError("Only SuperAdmin can perform this action", 403, "FORBIDDEN"));
  }
  next();
};
