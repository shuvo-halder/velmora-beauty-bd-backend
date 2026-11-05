import { z } from "zod";
import { customerStrongPasswordSchema } from "./storefront-auth.validator";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
  lastName: z.string().trim().optional().nullable(),
  avatarUrl: z.string().trim().url("Invalid avatar URL format").optional().nullable(),
});

export const updateCustomerProfileSchema = updateProfileSchema;

export const updateEmailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: customerStrongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const createAddressSchema = z.object({
  label: z.string().optional().nullable(),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional().nullable(),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const updateNotificationPrefSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
});

export const requestMobileChangeSchema = z.object({
  newPhone: z.string().min(1, "New phone is required"),
});

export const verifyMobileChangeSchema = z.object({
  newPhone: z.string().min(1, "New phone is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
