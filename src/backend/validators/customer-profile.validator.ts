import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid image URL").optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().optional().default(false),
});

export const preferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
});
