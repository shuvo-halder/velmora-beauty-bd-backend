import { z } from "zod";

const parseNullableNumber = (val: any) => {
  if (val === null || val === undefined || val === "" || val === "0" || val === 0) {
    return null;
  }
  const num = Number(val);
  return isNaN(num) || num <= 0 ? null : num;
};

const parseScopeArray = (val: any) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const clean = val.map((item) => String(item).trim()).filter(Boolean);
    return clean.length > 0 ? clean : null;
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const clean = parsed.map((item) => String(item).trim()).filter(Boolean);
        return clean.length > 0 ? clean : null;
      }
    } catch {
      const clean = val.split(",").map((s) => s.trim()).filter(Boolean);
      return clean.length > 0 ? clean : null;
    }
  }
  return null;
};

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .max(50, "Coupon code is too long")
    .transform((val) => val.trim().toUpperCase()),
  discountType: z.enum(["percentage", "fixed", "free_shipping"]),
  discountValue: z.coerce.number().min(0, "Discount value must be non-negative").default(0),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  isActive: z.boolean().optional().default(true),
  minOrderAmount: z.any().transform(parseNullableNumber),
  maxDiscountAmount: z.any().transform(parseNullableNumber),
  usageLimit: z.any().transform(parseNullableNumber),
  usagePerCustomer: z.any().transform(parseNullableNumber),
  applicableCategories: z.any().transform(parseScopeArray),
  applicableProducts: z.any().transform(parseScopeArray),
  applicableBrands: z.any().transform(parseScopeArray),
}).refine(
  (data) => {
    const from = new Date(data.validFrom).getTime();
    const until = new Date(data.validUntil).getTime();
    return !isNaN(from) && !isNaN(until) && until >= from;
  },
  {
    message: "Valid until date must be on or after valid from date",
    path: ["validUntil"],
  }
).refine(
  (data) => {
    if (data.discountType === "percentage" && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  }
);

export const updateCouponSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  discountType: z.enum(["percentage", "fixed", "free_shipping"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
  minOrderAmount: z.any().transform(parseNullableNumber).optional(),
  maxDiscountAmount: z.any().transform(parseNullableNumber).optional(),
  usageLimit: z.any().transform(parseNullableNumber).optional(),
  usagePerCustomer: z.any().transform(parseNullableNumber).optional(),
  applicableCategories: z.any().transform(parseScopeArray).optional(),
  applicableProducts: z.any().transform(parseScopeArray).optional(),
  applicableBrands: z.any().transform(parseScopeArray).optional(),
});
