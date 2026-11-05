import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid Order ID format"),
  provider: z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ", "STRIPE"]),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid Payment ID format"),
  providerTransactionId: z.string().min(1, "Provider transaction ID is required"),
});
