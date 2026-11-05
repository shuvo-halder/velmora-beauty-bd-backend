import { z } from "zod";

export const customerRefundRequestSchema = z.object({
  orderId: z.string().uuid("Invalid Order ID format"),
  reason: z.string().min(1, "Reason is required"),
  amount: z.union([z.string(), z.number()]).optional(),
});

export const adminProcessRefundSchema = z.object({
  approve: z.boolean(),
  providerReference: z.string().optional(),
});

export const adminInitiateRefundSchema = z.object({
  orderId: z.string().uuid("Invalid Order ID format"),
  paymentId: z.string().uuid("Invalid Payment ID format"),
  amount: z.union([z.string(), z.number()]),
  reason: z.string().min(1, "Reason is required"),
});
