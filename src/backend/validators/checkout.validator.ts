import { z } from "zod";

export const applyCouponSchema = z.object({
  couponCode: z.string().optional(),
  code: z.string().optional(),
  promoCode: z.string().optional(),
}).refine(
  (data) => Boolean((data.couponCode && data.couponCode.trim()) || (data.code && data.code.trim()) || (data.promoCode && data.promoCode.trim())),
  {
    message: "Coupon code is required",
    path: ["couponCode"],
  }
).transform((data) => ({
  couponCode: ((data.couponCode || data.code || data.promoCode) as string).trim(),
}));

export const updateShippingSchema = z.object({
  shippingAddressId: z.string().uuid("Invalid Shipping Address ID format"),
  billingAddressId: z.string().uuid("Invalid Billing Address ID format").optional(),
});

export const completeCheckoutSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  clientId: z.string().max(255, "Client ID must not exceed 255 characters").optional(),
  sessionId: z.string().max(255, "Session ID must not exceed 255 characters").optional(),
  shippingAddress: z.any().optional(),
  billingAddress: z.any().optional(),
});
