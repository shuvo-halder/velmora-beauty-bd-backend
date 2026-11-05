import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middlewares/auth";
import { AuditService } from "../services/audit.service";
import { emailService } from "../services/email.service";
import { logger } from "../config/logger";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400, "MISSING_CREDENTIALS"));
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      await AuditService.logLogin(null, email, false, req, { reason: "User not found" });
      return next(new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS"));
    }

    // Check if user is locked out
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await AuditService.logLogin(user.id, user.email, false, req, { reason: "Account locked" });
      return next(new AppError("Your account is locked due to multiple failed attempts. Please try again later.", 403, "ACCOUNT_LOCKED"));
    }

    if (!user.isActive) {
      await AuditService.logLogin(user.id, user.email, false, req, { reason: "Inactive user" });
      return next(new AppError("Invalid credentials or inactive user", 401, "INVALID_CREDENTIALS"));
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;
      let isLocked = false;

      if (newAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        isLocked = true;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (isLocked) {
        await AuditService.logAccountLocked(user.id, user.email, req, { reason: "5 consecutive failed login attempts" });
        return next(new AppError("Your account has been locked due to too many failed attempts. Please try again after 15 minutes.", 403, "ACCOUNT_LOCKED"));
      } else {
        await AuditService.logLogin(user.id, user.email, false, req, { reason: `Failed password attempt ${newAttempts}/5` });
        return next(new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS"));
      }
    }

    // On success: reset login failures
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Create access token (JWT - 15 minutes) with issuer & audience hardening
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name }, 
      env.JWT_SECRET, 
      { 
        expiresIn: "15m",
        issuer: "ecommerce-admin-api",
        audience: "ecommerce-admin-app"
      }
    );

    // Create refresh token (7 days)
    const refreshTokenString = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await AuditService.logLogin(user.id, user.email, true, req);

    res.status(200).json({
      status: "success",
      token,
      refreshToken: refreshTokenString,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: {
            id: user.role.id,
            name: user.role.name,
            permissions: user.role.permissions.map(p => ({ module: p.module, action: p.action }))
          }
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError("Please provide a refresh token", 400, "MISSING_REFRESH_TOKEN"));
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });

      await AuditService.logLogout(tokenRecord.userId, req);
    }

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError("Please provide a refresh token", 400, "MISSING_REFRESH_TOKEN"));
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!tokenRecord) {
      return next(new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN"));
    }

    if (tokenRecord.revokedAt) {
      // Token reuse attempt - revoke all tokens for security
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revokedAt: new Date() },
      });
      await AuditService.logSecurityAlert(tokenRecord.userId, "REFRESH_TOKEN_REUSE_ATTEMPT", { reason: "Revoked refresh token reuse detected! All user sessions revoked." }, req);
      return next(new AppError("Session expired or compromised. Please login again.", 401, "COMPROMISED_SESSION"));
    }

    if (tokenRecord.expiresAt < new Date()) {
      return next(new AppError("Refresh token expired. Please login again.", 401, "EXPIRED_SESSION"));
    }

    if (!tokenRecord.user.isActive) {
      return next(new AppError("User account is inactive", 401, "INACTIVE_USER"));
    }

    // Generate new Access and Refresh Token (Rotation) with issuer & audience hardening
    const newAccessToken = jwt.sign(
      { id: tokenRecord.user.id, email: tokenRecord.user.email, role: tokenRecord.user.role.name },
      env.JWT_SECRET,
      { 
        expiresIn: "15m",
        issuer: "ecommerce-admin-api",
        audience: "ecommerce-admin-app"
      }
    );

    const newRefreshTokenString = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByToken: newRefreshTokenString,
        },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshTokenString,
          userId: tokenRecord.userId,
          expiresAt,
          ipAddress,
          userAgent,
        },
      }),
    ]);

    res.status(200).json({
      status: "success",
      token: newAccessToken,
      refreshToken: newRefreshTokenString,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError("Please provide an email address", 400, "MISSING_EMAIL"));
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      await AuditService.logSecurityAlert(null, "FORGOT_PASSWORD_INVALID_EMAIL", { email, reason: "Forgot password attempt for invalid/inactive email" }, req);
      return res.status(200).json({
        status: "success",
        message: "If your email is registered, you will receive a reset link.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    await AuditService.logSecurityAlert(user.id, "PASSWORD_RESET_REQUESTED", { email: user.email }, req);

    try {
      await emailService.sendAdminPasswordResetEmail(user.email, user.firstName, resetToken);
    } catch (emailError: any) {
      logger.error("[AUTH] Failed to send admin password reset email", {
        code: emailError?.code,
        message: emailError?.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: "If your email is registered, you will receive a reset link.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return next(new AppError("Please provide token and new password", 400, "MISSING_FIELDS"));
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: hashedToken },
    });

    if (!user || !user.isActive) {
      return next(new AppError("Invalid or expired token", 400, "INVALID_TOKEN"));
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return next(new AppError("Token has expired", 400, "EXPIRED_TOKEN"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate/revoke all active refresh tokens for this user upon password reset
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await AuditService.logPasswordReset(null, user.id, user.email, req);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new AppError("Please provide current password and new password", 400, "MISSING_FIELDS"));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordCorrect) {
      return next(new AppError("Incorrect current password", 401, "INVALID_CREDENTIALS"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await AuditService.logPasswordChanged(user.id, req, { reason: "Password changed from profile settings" });

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401, "UNAUTHORIZED"));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions.map(p => ({ module: p.module, action: p.action }))
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Part 7 - Cleanup expired/revoked refresh tokens job
export const startRefreshTokenCleanupJob = () => {
  // Run every 6 hours
  setInterval(async () => {
    try {
      console.log("[SECURITY] Running expired refresh token cleanup job...");
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } }
          ]
        }
      });
      console.log(`[SECURITY] Cleaned up ${result.count} expired/revoked refresh tokens.`);
    } catch (err) {
      console.error("[SECURITY] Expired refresh token cleanup failed:", err);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
};

