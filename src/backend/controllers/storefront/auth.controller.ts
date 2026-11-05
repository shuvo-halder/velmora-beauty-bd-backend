import { emailService } from "../../services/email.service";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateCustomerAccessToken, generateCustomerRefreshToken, verifyCustomerToken } from "../../utils/customerJwt";
import { StorefrontAuthService } from "../../services/storefront/auth.service";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { env } from "../../config/env";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      if (!existingCustomer.emailVerified) {
        return next(new AppError("Email already registered but not verified. Please verify your email or request a new verification link.", 400, "UNVERIFIED_EMAIL"));
      }
      return next(new AppError("Email already in use", 400, "BAD_REQUEST"));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        emailVerified: false,
        verificationToken: verificationTokenHash,
        verificationExpires,
      },
    });

    let emailSent = true;
    try {
      await emailService.sendVerificationEmail(email, firstName, rawVerificationToken);
    } catch (err: any) {
      console.warn("[AUTH] Failed to send registration email, but customer created:", err?.message);
      emailSent = false;
    }

    res.status(201).json({
      status: "success",
      message: emailSent 
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful, but we could not send the verification email. Please try logging in and using 'resend verification'.",
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer || !customer.isActive || customer.deletedAt) {
      return next(new AppError("Invalid credentials or inactive account", 401, "UNAUTHORIZED"));
    }

    if (!customer.passwordHash) {
      return next(new AppError("Invalid credentials", 401, "UNAUTHORIZED"));
    }

    const isMatch = await bcrypt.compare(password, customer.passwordHash);

    if (!isMatch) {
      return next(new AppError("Invalid credentials", 401, "UNAUTHORIZED"));
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateCustomerAccessToken(customer.id, customer.email);
    const refreshToken = generateCustomerRefreshToken(customer.id, customer.email);

    // Default refresh token expiry is 7d
    const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";
    await StorefrontAuthService.createCustomerRefreshToken(customer.id, refreshToken, expiresAt, ip, userAgent);

    res.status(200).json({
      status: "success",
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          emailVerified: customer.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400, "BAD_REQUEST"));
    }

    let decoded;
    try {
      decoded = verifyCustomerToken(refreshToken);
    } catch (err) {
      return next(new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED"));
    }

    if (decoded.tokenType !== "refresh") {
      return next(new AppError("Invalid token type", 401, "UNAUTHORIZED"));
    }

    const tokenHash = StorefrontAuthService.hashToken(refreshToken);

    const storedToken = await prisma.customerRefreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      return next(new AppError("Invalid refresh token", 401, "UNAUTHORIZED"));
    }

    if (storedToken.revokedAt) {
      // Security: Token reuse detected. Revoke all tokens for this customer.
      console.warn(`[SECURITY] Customer refresh token reuse detected for customer ID: ${storedToken.customerId}`);
      await StorefrontAuthService.revokeAllCustomerRefreshTokens(storedToken.customerId);
      return next(new AppError("Token reuse detected. Please login again.", 401, "UNAUTHORIZED"));
    }

    if (storedToken.expiresAt < new Date()) {
      return next(new AppError("Refresh token expired", 401, "UNAUTHORIZED"));
    }

    const customer = await prisma.customer.findUnique({
      where: { id: storedToken.customerId },
    });

    if (!customer || !customer.isActive || customer.deletedAt) {
      return next(new AppError("Customer not found or inactive", 401, "UNAUTHORIZED"));
    }

    // Revoke old token
    await StorefrontAuthService.revokeCustomerRefreshToken(tokenHash);

    // Issue new tokens
    const newAccessToken = generateCustomerAccessToken(customer.id, customer.email);
    const newRefreshToken = generateCustomerRefreshToken(customer.id, customer.email);

    const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";
    await StorefrontAuthService.createCustomerRefreshToken(customer.id, newRefreshToken, expiresAt, ip, userAgent);

    res.status(200).json({
      status: "success",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const tokenHash = StorefrontAuthService.hashToken(refreshToken);
      await StorefrontAuthService.revokeCustomerRefreshToken(tokenHash);
    }

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer || !customer.isActive || customer.deletedAt) {
      // Don't leak whether the email exists
      return res.status(200).json({
        status: "success",
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: resetExpires,
      },
    });

    try {
      await emailService.sendPasswordResetEmail(customer.email, customer.firstName, resetToken);
    } catch (err) {
      console.warn("[AUTH] Failed to send password reset email:", err.message);
      // We still return success to prevent email enumeration, but we log internally
    }

    res.status(200).json({
      status: "success",
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!customer) {
      return next(new AppError("Token is invalid or has expired", 400, "BAD_REQUEST"));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Security: Revoke all refresh tokens on password reset
    await StorefrontAuthService.revokeAllCustomerRefreshTokens(customer.id);

    res.status(200).json({
      status: "success",
      message: "Password has been successfully reset. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    
    if (!token || typeof token !== "string") {
       return next(new AppError("Token is required", 400, "BAD_REQUEST"));
    }

    const trimmedToken = token.trim();
    const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { verificationToken: tokenHash },
          { verificationToken: trimmedToken }
        ],
        verificationExpires: { gt: new Date() },
      },
    });

    if (!customer) {
      return next(new AppError("Token is invalid or has expired", 400, "BAD_REQUEST"));
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    // Link unassigned guest orders matching customer's verified email address
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const claimResult = await StorefrontAuthService.linkGuestOrdersToCustomer(
      customer.id,
      customer.phone,
      customer.email,
      ip
    ).catch(() => ({ linkedOrdersCount: 0, linkedOrderIds: [] }));

    res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      data: {
        emailVerified: true,
        linkedOrdersCount: claimResult.linkedOrdersCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    
    if (!email) {
      return next(new AppError("Email is required", 400, "BAD_REQUEST"));
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    // Safe handling: do not leak account existence
    if (!customer || !customer.isActive || customer.deletedAt !== null) {
      return res.status(200).json({
        status: "success",
        message: "If your account is registered and unverified, a verification email has been sent.",
      });
    }

    if (customer.emailVerified) {
      return res.status(200).json({
        status: "success",
        message: "Your email is already verified. Please proceed to log in.",
      });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        verificationToken: verificationTokenHash,
        verificationExpires,
      },
    });

    try {
      await emailService.sendVerificationEmail(email, customer.firstName, rawVerificationToken);
    } catch (err: any) {
      console.warn("[AUTH] Failed to send resend-verification email:", err?.message);
    }

    res.status(200).json({
      status: "success",
      message: "If your account is registered and unverified, a verification email has been sent.",
    });
  } catch (error) {
    next(error);
  }
};
