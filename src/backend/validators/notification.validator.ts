import { z } from "zod";

export const sendNotificationSchema = z.object({
  customerId: z.string().uuid("Invalid Customer ID"),
  type: z.enum(["ORDER_CREATED", "PAYMENT_SUCCESS", "PAYMENT_FAILED", "ORDER_SHIPPED", "OUT_FOR_DELIVERY", "ORDER_DELIVERED", "RETURN_REQUESTED", "RETURN_APPROVED", "REFUND_COMPLETED", "ACCOUNT_SECURITY", "GENERAL"]),
  channel: z.enum(["EMAIL", "SMS", "IN_APP"]).optional(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  metadata: z.any().optional()
});

export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
});
