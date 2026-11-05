import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import bcrypt from "bcryptjs";
import { generateCustomerAccessToken, generateCustomerRefreshToken } from "../utils/customerJwt";
import { env } from "../config/env";
import { CustomerAuthRequest } from "../middlewares/customerAuth";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { emailService } from "../services/email.service";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Duplicate email protection
    const existingEmail = await prisma.customer.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return next(new AppError("Email already in use", 400, "BAD_REQUEST"));
    }

    // Duplicate phone protection (if phone is provided)
    if (phone) {
      // Assuming phone is not strictly unique at schema level, but we enforce here
      const existingPhone = await prisma.customer.findFirst({
        where: { phone },
      });
      if (existingPhone) {
        return next(new AppError("Phone number already in use", 400, "BAD_REQUEST"));
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        verificationToken: verificationTokenHash,
        verificationExpires,
        emailVerified: false,
        provider: "LOCAL",
      },
    });

    try {
      await emailService.sendVerificationEmail(email, firstName, rawVerificationToken);
    } catch (err: any) {
      console.warn("[AUTH] Failed to send verification email:", err?.message);
    }

    res.status(201).json({
      status: "success",
      message: "Customer registered successfully. Please check your email to verify your account.",
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
    const { email, password } = req.body;

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
    
    // Hash refresh token for DB storage
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";

    // Also store session in new CustomerSession model as well as CustomerRefreshToken
    await prisma.$transaction([
      prisma.customerRefreshToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      }),
      prisma.customerSession.create({
        data: {
          customerId: customer.id,
          token: tokenHash, // using tokenHash as the identifier
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      })
    ]);

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

export const logout = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      
      await prisma.$transaction([
        prisma.customerRefreshToken.update({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        }),
        prisma.customerSession.delete({
          where: { token: tokenHash }
        })
      ]).catch(() => {
        // Ignore errors if token doesn't exist
      });
    }

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};


const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return next(new AppError("ID Token is required", 400, "BAD_REQUEST"));
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return next(new AppError("Invalid Google token", 401, "UNAUTHORIZED"));
    }

    const { sub, email, given_name, family_name, picture, email_verified } = payload;
    
    if (!email) {
      return next(new AppError("Email is required from Google provider", 400, "BAD_REQUEST"));
    }

    let customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (customer) {
      // Update existing customer
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          provider: "GOOGLE",
          providerId: sub,
          avatarUrl: picture || customer.avatarUrl,
          emailVerified: email_verified || customer.emailVerified,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          email,
          firstName: given_name || "Google User",
          lastName: family_name,
          provider: "GOOGLE",
          providerId: sub,
          avatarUrl: picture,
          emailVerified: email_verified || false,
          lastLoginAt: new Date(),
        },
      });
    }

    if (!customer.isActive || customer.deletedAt) {
      return next(new AppError("Account is inactive", 401, "UNAUTHORIZED"));
    }

    const accessToken = generateCustomerAccessToken(customer.id, customer.email);
    const refreshToken = generateCustomerRefreshToken(customer.id, customer.email);
    
    // Hash refresh token for DB storage
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";

    await prisma.$transaction([
      prisma.customerRefreshToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      }),
      prisma.customerSession.create({
        data: {
          customerId: customer.id,
          token: tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      })
    ]);

    res.status(200).json({
      status: "success",
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          emailVerified: customer.emailVerified,
          avatarUrl: customer.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });

  } catch (error: any) {
    console.error("Google Auth Error:", error);
    next(new AppError("Authentication failed: " + (error.message || "Unknown error"), 401, "UNAUTHORIZED"));
  }
};


export const facebookAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken: fbAccessToken } = req.body;
    if (!fbAccessToken) {
      return next(new AppError("Facebook access token is required", 400, "BAD_REQUEST"));
    }

    // Verify token with Facebook Graph API
    const response = await fetch(`https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture.type(large)&access_token=${fbAccessToken}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      return next(new AppError("Invalid Facebook token", 401, "UNAUTHORIZED"));
    }

    const { id: fbId, email, first_name, last_name, picture } = data;

    if (!email) {
      return next(new AppError("Email is required from Facebook provider. Please ensure you have granted email permissions.", 400, "BAD_REQUEST"));
    }

    let customer = await prisma.customer.findUnique({
      where: { email },
    });

    const avatarUrl = picture?.data?.url;

    if (customer) {
      // Update existing customer
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          provider: "FACEBOOK",
          providerId: fbId,
          avatarUrl: avatarUrl || customer.avatarUrl,
          emailVerified: true, // Assuming FB emails are verified
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          email,
          firstName: first_name || "Facebook User",
          lastName: last_name,
          provider: "FACEBOOK",
          providerId: fbId,
          avatarUrl: avatarUrl,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    if (!customer.isActive || customer.deletedAt) {
      return next(new AppError("Account is inactive", 401, "UNAUTHORIZED"));
    }

    const accessToken = generateCustomerAccessToken(customer.id, customer.email);
    const refreshToken = generateCustomerRefreshToken(customer.id, customer.email);
    
    // Hash refresh token for DB storage
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresInDays = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";

    await prisma.$transaction([
      prisma.customerRefreshToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      }),
      prisma.customerSession.create({
        data: {
          customerId: customer.id,
          token: tokenHash,
          expiresAt,
          ipAddress: ip,
          userAgent,
        }
      })
    ]);

    res.status(200).json({
      status: "success",
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          emailVerified: customer.emailVerified,
          avatarUrl: customer.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });

  } catch (error: any) {
    console.error("Facebook Auth Error:", error);
    next(new AppError("Authentication failed: " + (error.message || "Unknown error"), 401, "UNAUTHORIZED"));
  }
};


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const customer = await prisma.customer.findUnique({ where: { email } });

    if (!customer || !customer.isActive || customer.deletedAt !== null) {
      return res.status(200).json({ status: "success", message: "If an account with that email exists, we sent a password reset link." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.customer.update({
      where: { email },
      data: { resetPasswordToken, resetPasswordExpires },
    });

    try {
      await emailService.sendPasswordResetEmail(customer.email, customer.firstName, resetToken);
    } catch (err: any) {
      console.warn("[AUTH] Failed to send customer password reset email:", err?.message);
    }

    res.status(200).json({ status: "success", message: "If an account with that email exists, we sent a password reset link." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        resetPasswordToken,
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

    // Revoke all existing sessions for security
    await prisma.customerRefreshToken.updateMany({
      where: { customerId: customer.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await prisma.customerSession.deleteMany({
      where: { customerId: customer.id }
    });

    res.status(200).json({ status: "success", message: "Password reset successful. Please log in." });
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
    const verificationTokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { verificationToken: verificationTokenHash },
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

    res.status(200).json({ status: "success", message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};
