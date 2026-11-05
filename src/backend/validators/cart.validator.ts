import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.union([z.string().uuid("Invalid Variant ID format"), z.literal(""), z.null()]).optional(),
  quantity: z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1").default(1),
  sessionId: z.string().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
});

