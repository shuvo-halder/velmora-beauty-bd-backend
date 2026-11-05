import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import bcrypt from "bcryptjs";
import { CustomerAuthRequest } from "../middlewares/customerAuth";

export const getProfile = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        provider: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { firstName, lastName, phone, avatarUrl } = req.body;

    // Optional: add duplicate phone check if required, but omitted for brevity unless specified
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        provider: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { currentPassword, newPassword } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    if (!customer.passwordHash) {
      return next(new AppError("This account does not have a password configured (likely uses social login).", 400, "BAD_REQUEST"));
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!isMatch) {
      return next(new AppError("Incorrect current password", 401, "UNAUTHORIZED"));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });

    // Optionally revoke all sessions here so they have to log in again on other devices
    await prisma.customerRefreshToken.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await prisma.customerSession.deleteMany({
      where: { customerId }
    });

    res.status(200).json({
      status: "success",
      message: "Password changed successfully. You may need to log in again.",
    });
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;

    const addresses = await prisma.customerAddress.findMany({
      where: { customerId },
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

export const createAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const data = req.body;

    if (data.isDefault) {
      // Unset previous defaults
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.customerAddress.create({
      data: {
        ...data,
        customerId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Address created successfully",
      data: { address },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const addressId = req.params.id;
    const data = req.body;

    const address = await prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address || address.customerId !== customerId) {
      return next(new AppError("Address not found", 404, "NOT_FOUND"));
    }

    if (data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });

    res.status(200).json({
      status: "success",
      message: "Address updated successfully",
      data: { address: updatedAddress },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const addressId = req.params.id;

    const address = await prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address || address.customerId !== customerId) {
      return next(new AppError("Address not found", 404, "NOT_FOUND"));
    }

    await prisma.customerAddress.delete({
      where: { id: addressId },
    });

    res.status(200).json({
      status: "success",
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const getPreferences = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    let preferences = await prisma.notificationPreference.findUnique({
      where: { customerId }
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { customerId }
      });
    }

    res.status(200).json({ status: "success", data: { preferences } });
  } catch(error) {
    next(error);
  }
};

export const updatePreferences = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { email, sms, inApp } = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { customerId },
      update: {
        ...(email !== undefined && { email }),
        ...(sms !== undefined && { sms }),
        ...(inApp !== undefined && { inApp }),
      },
      create: {
        customerId,
        email: email ?? true,
        sms: sms ?? false,
        inApp: inApp ?? true,
      }
    });

    res.status(200).json({ status: "success", message: "Preferences updated", data: { preferences } });
  } catch(error) {
    next(error);
  }
};
