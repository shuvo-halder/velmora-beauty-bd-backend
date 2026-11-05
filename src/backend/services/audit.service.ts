import { Request } from "express";
import { prisma } from "../config/db";

export class AuditService {
  private static extractRequestInfo(req?: Request) {
    if (!req) {
      return { ipAddress: null, userAgent: null };
    }
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;
    return { ipAddress, userAgent };
  }

  public static async createLog(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    targetUserId: string | null,
    customDetails: any,
    req?: Request
  ) {
    try {
      const { ipAddress, userAgent } = this.extractRequestInfo(req);
      const detailsObj = {
        targetUserId,
        userAgent,
        timestamp: new Date().toISOString(),
        ...(customDetails || {}),
      };

      return await prisma.activityLog.create({
        data: {
          userId: actorUserId,
          action,
          entityType,
          entityId,
          ipAddress,
          details: JSON.stringify(detailsObj),
        },
      });
    } catch (error: any) {
      // In development/test environments without live DB, avoid crashing or loud stack traces
      if (process.env.NODE_ENV !== "test") {
        console.warn("Audit logging skipped (DB unavailable):", error?.message || error);
      }
    }
  }

  static async logLogin(userId: string | null, email: string, success: boolean, req: Request, details?: any) {
    return this.createLog(
      userId,
      success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      "Auth",
      userId,
      userId,
      { email, success, ...details },
      req
    );
  }

  static async logLogout(userId: string, req: Request) {
    return this.createLog(userId, "LOGOUT", "Auth", userId, userId, {}, req);
  }

  static async logUserCreated(actorUserId: string | null, targetUserId: string, targetEmail: string, roleName: string, req: Request) {
    return this.createLog(
      actorUserId,
      "USER_CREATED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail, roleName },
      req
    );
  }

  static async logUserUpdated(actorUserId: string | null, targetUserId: string, targetEmail: string, changes: any, req: Request) {
    return this.createLog(
      actorUserId,
      "USER_UPDATED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail, changes },
      req
    );
  }

  static async logUserDeleted(actorUserId: string | null, targetUserId: string, targetEmail: string, req: Request) {
    return this.createLog(
      actorUserId,
      "USER_DELETED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail },
      req
    );
  }

  static async logUserDisabled(actorUserId: string | null, targetUserId: string, targetEmail: string, req: Request) {
    return this.createLog(
      actorUserId,
      "USER_DISABLED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail },
      req
    );
  }

  static async logUserEnabled(actorUserId: string | null, targetUserId: string, targetEmail: string, req: Request) {
    return this.createLog(
      actorUserId,
      "USER_ENABLED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail },
      req
    );
  }

  static async logRoleCreated(actorUserId: string | null, roleId: string, roleName: string, req: Request) {
    return this.createLog(
      actorUserId,
      "ROLE_CREATED",
      "Role",
      roleId,
      null,
      { roleName },
      req
    );
  }

  static async logRoleUpdated(actorUserId: string | null, roleId: string, roleName: string, changes: any, req: Request) {
    return this.createLog(
      actorUserId,
      "ROLE_UPDATED",
      "Role",
      roleId,
      null,
      { roleName, changes },
      req
    );
  }

  static async logRoleDeleted(actorUserId: string | null, roleId: string, roleName: string, req: Request) {
    return this.createLog(
      actorUserId,
      "ROLE_DELETED",
      "Role",
      roleId,
      null,
      { roleName },
      req
    );
  }

  static async logPermissionChanged(actorUserId: string | null, roleId: string, roleName: string, details: any, req: Request) {
    return this.createLog(
      actorUserId,
      "PERMISSION_CHANGED",
      "Role",
      roleId,
      null,
      { roleName, ...details },
      req
    );
  }

  static async logProductCreated(actorUserId: string | null, productId: string, productName: string, req: Request) {
    return this.createLog(
      actorUserId,
      "PRODUCT_CREATED",
      "Product",
      productId,
      null,
      { productName },
      req
    );
  }

  static async logProductUpdated(actorUserId: string | null, productId: string, productName: string, changes: any, req: Request) {
    return this.createLog(
      actorUserId,
      "PRODUCT_UPDATED",
      "Product",
      productId,
      null,
      { productName, changes },
      req
    );
  }

  static async logProductDeleted(actorUserId: string | null, productId: string, productName: string, req: Request) {
    return this.createLog(
      actorUserId,
      "PRODUCT_DELETED",
      "Product",
      productId,
      null,
      { productName },
      req
    );
  }

  static async logInventoryUpdated(actorUserId: string | null, inventoryId: string, details: any, req: Request) {
    return this.createLog(
      actorUserId,
      "INVENTORY_UPDATED",
      "Inventory",
      inventoryId,
      null,
      details,
      req
    );
  }

  static async logSecurityAlert(actorUserId: string | null, alertType: string, details: any, req: Request) {
    return this.createLog(
      actorUserId,
      "SECURITY_ALERT",
      "Security",
      null,
      null,
      { alertType, ...details },
      req
    );
  }

  static async logAccountLocked(userId: string | null, email: string, req: Request, details?: any) {
    return this.createLog(
      userId,
      "ACCOUNT_LOCKED",
      "Security",
      userId,
      userId,
      { email, ...details },
      req
    );
  }

  static async logPasswordChanged(userId: string, req: Request, details?: any) {
    return this.createLog(
      userId,
      "PASSWORD_CHANGED",
      "User",
      userId,
      userId,
      details,
      req
    );
  }

  static async logPasswordReset(actorUserId: string | null, targetUserId: string, targetEmail: string, req: Request) {
    return this.createLog(
      actorUserId,
      "PASSWORD_RESET",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail },
      req
    );
  }

  static async logRoleChanged(actorUserId: string | null, targetUserId: string, targetEmail: string, oldRole: string, newRole: string, req: Request) {
    return this.createLog(
      actorUserId,
      "ROLE_CHANGED",
      "User",
      targetUserId,
      targetUserId,
      { email: targetEmail, oldRole, newRole },
      req
    );
  }

  static async logTokenRevoked(actorUserId: string | null, targetUserId: string, reason: string, req: Request) {
    return this.createLog(
      actorUserId,
      "TOKEN_REVOKED",
      "Security",
      targetUserId,
      targetUserId,
      { reason },
      req
    );
  }

  static async logPrivilegeEscalationAttempt(
    actorUserId: string | null,
    attemptType: string,
    details: any,
    req?: Request
  ) {
    return this.createLog(
      actorUserId,
      "PRIVILEGE_ESCALATION_ATTEMPT",
      "Security",
      null,
      details?.targetUserId || null,
      { attemptType, ...details },
      req
    );
  }

  static async logAccessDenied(
    actorUserId: string | null,
    requiredPrivilege: string,
    req?: Request
  ) {
    return this.createLog(
      actorUserId,
      "ACCESS_DENIED",
      "Security",
      null,
      null,
      { requiredPrivilege },
      req
    );
  }
}
