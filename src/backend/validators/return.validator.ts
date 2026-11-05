import { z } from "zod";

export const customerReturnRequestSchema = z.object({
  orderId: z.string().uuid("Invalid Order ID"),
  reason: z.string().min(1, "Reason is required"),
  items: z.array(z.object({
    orderItemId: z.string().uuid("Invalid Order Item ID"),
    quantity: z.number().int().positive("Quantity must be positive"),
    reason: z.string().optional(),
    condition: z.string().optional()
  })).min(1, "At least one item is required")
});

export const adminProcessReturnSchema = z.object({
  adminNotes: z.string().optional()
});
