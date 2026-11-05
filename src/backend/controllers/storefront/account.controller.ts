import { emailService } from "../../services/email.service";
import { Response, NextFunction } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import bcrypt from "bcryptjs";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontAccountService } from "../../services/storefront/account.service";
import crypto from "crypto";
import { StorefrontAuthService } from "../../services/storefront/auth.service";

export const getDashboard = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const dashboard = await StorefrontAccountService.getDashboard(customerId);
    
    res.status(200).json({
      status: "success",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await StorefrontAccountService.getProfile(req.customer!.id);

    res.status(200).json({
      status: "success",
      data: {
        profile: customer,
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, avatarUrl } = req.body;

    const customer = await StorefrontAccountService.updateProfile(req.customer!.id, {
      firstName,
      lastName,
      avatarUrl,
    });

    res.status(200).json({
      status: "success",
      data: {
        profile: customer,
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmail = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword } = req.body;
    let newEmail = req.body.newEmail;
    if (newEmail) newEmail = newEmail.trim().toLowerCase();
    const customerId = req.customer!.id;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.passwordHash || "");
    if (!isMatch) {
      return next(new AppError("Invalid current password", 401, "UNAUTHORIZED"));
    }

    if (newEmail.toLowerCase() === customer.email.toLowerCase()) {
      return next(new AppError("New email must be different", 400, "BAD_REQUEST"));
    }

    const existingEmail = await prisma.customer.findFirst({ 
      where: { 
        OR: [
          { email: newEmail },
          { pendingEmail: newEmail }
        ]
      } 
    });
    if (existingEmail) {
      return next(new AppError("Email already in use or pending verification", 400, "BAD_REQUEST"));
    }

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        pendingEmail: newEmail,
        pendingEmailVerificationToken: verificationTokenHash,
        pendingEmailVerificationExpires: verificationExpires,
      },
    });

    try {
      await emailService.sendEmailChangeVerificationEmail(newEmail, customer.firstName, rawVerificationToken);
    } catch (err) {
      // Revert pending email changes on SMTP failure
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          pendingEmail: null,
          pendingEmailVerificationToken: null,
          pendingEmailVerificationExpires: null,
        }
      });
      return next(new AppError("Failed to send verification email to the new address. Please try again.", 500, "EMAIL_SEND_FAILED"));
    }

    res.status(200).json({
      status: "success",
      message: "A verification email has been sent to your new address. Your current email will remain active until verified.",
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const customerId = req.customer!.id;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.passwordHash || "");
    if (!isMatch) {
      return next(new AppError("Invalid current password", 401, "UNAUTHORIZED"));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });

    // Revoke all sessions, forcing re-login
    await StorefrontAccountService.revokeAllSessionsExcept(customerId, null);

    res.status(200).json({
      status: "success",
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: req.customer!.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.status(200).json({
      status: "success",
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

export const getAddressById = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const address = await prisma.customerAddress.findFirst({
      where: { id, customerId: req.customer!.id },
    });

    if (!address) {
      return next(new AppError("Address not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { isDefault, ...addressData } = req.body;

    const existingAddressesCount = await prisma.customerAddress.count({
      where: { customerId }
    });

    const shouldBeDefault = existingAddressesCount === 0 || isDefault;

    const address = await prisma.customerAddress.create({
      data: {
        ...addressData,
        customerId,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault && existingAddressesCount > 0) {
      await StorefrontAccountService.setDefaultAddress(customerId, address.id);
    }

    res.status(201).json({
      status: "success",
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerId = req.customer!.id;
    const { isDefault, ...addressData } = req.body;

    const address = await prisma.customerAddress.findFirst({
      where: { id, customerId },
    });

    if (!address) {
      return next(new AppError("Address not found", 404, "NOT_FOUND"));
    }

    const updatedAddress = await prisma.customerAddress.update({
      where: { id },
      data: { ...addressData },
    });

    if (isDefault && !address.isDefault) {
      await StorefrontAccountService.setDefaultAddress(customerId, id);
    } else if (isDefault === false && address.isDefault) {
      await prisma.customerAddress.update({
        where: { id },
        data: { isDefault: false },
      });
    }

    res.status(200).json({
      status: "success",
      data: { address: updatedAddress },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerId = req.customer!.id;

    const address = await prisma.customerAddress.findFirst({
      where: { id, customerId },
    });

    if (!address) {
      return next(new AppError("Address not found", 404, "NOT_FOUND"));
    }

    await prisma.customerAddress.delete({
      where: { id },
    });

    if (address.isDefault) {
      const anotherAddress = await prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });

      if (anotherAddress) {
        await StorefrontAccountService.setDefaultAddress(customerId, anotherAddress.id);
      }
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const sessions = await StorefrontAccountService.getSessions(customerId);
    
    // Identify current session
    let currentSessionHash = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      const token = req.headers.authorization.split(" ")[1];
      // Since it's access token, we can't easily match with refresh token.
      // But we are sending the response. We can skip currentSession tagging for now or just return list.
    }

    res.status(200).json({
      status: "success",
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerId = req.customer!.id;

    await StorefrontAccountService.revokeSession(customerId, id);

    res.status(200).json({
      status: "success",
      message: "Session revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const revokeAllOtherSessions = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    
    // In a real app we might pass the refresh token to keep the current one active,
    // For this endpoint we'll revoke all sessions for simplicity, forcing a re-login
    // or keeping only the current access token valid until it expires.
    await StorefrontAccountService.revokeAllSessionsExcept(customerId, null);

    res.status(200).json({
      status: "success",
      message: "All other sessions revoked",
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationPreferences = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    let prefs = await prisma.notificationPreference.findUnique({
      where: { customerId }
    });
    
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { customerId }
      });
    }

    res.status(200).json({
      status: "success",
      data: { preferences: prefs },
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationPreferences = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { email, sms, inApp } = req.body;
    
    const prefs = await prisma.notificationPreference.upsert({
      where: { customerId },
      update: { email, sms, inApp },
      create: { customerId, email: email ?? true, sms: sms ?? false, inApp: inApp ?? true },
    });

    res.status(200).json({
      status: "success",
      data: { preferences: prefs },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const customerId = req.customer!.id;

    if (!token || typeof token !== "string") {
      return next(new AppError("Token is required", 400, "BAD_REQUEST"));
    }

    const trimmedToken = token.trim();
    const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          { pendingEmailVerificationToken: tokenHash },
          { pendingEmailVerificationToken: trimmedToken }
        ],
        pendingEmailVerificationExpires: { gt: new Date() },
      },
    });

    if (!customer || !customer.pendingEmail) {
      return next(new AppError("Token is invalid or has expired", 400, "BAD_REQUEST"));
    }

    // Ensure the pending email wasn't taken by someone else in the meantime
    const existing = await prisma.customer.findUnique({
      where: { email: customer.pendingEmail }
    });
    if (existing) {
      return next(new AppError("This email is already in use by another account", 400, "BAD_REQUEST"));
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        email: customer.pendingEmail,
        emailVerified: true,
        pendingEmail: null,
        pendingEmailVerificationToken: null,
        pendingEmailVerificationExpires: null,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Email changed and verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};
