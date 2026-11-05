import { z } from "zod";

export const createShipmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  courierId: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  deliveryFee: z.number().min(0, "Delivery fee cannot be negative").optional().nullable(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  recipientAddress: z.string().optional().nullable(),
  codAmount: z.number().min(0).optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  status: z.string().optional().nullable(),
  items: z.array(z.object({
    orderItemId: z.string().min(1, "Order Item ID is required"),
    quantity: z.number().int().positive("Quantity must be positive")
  })).min(1, "At least one item is required").optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "PACKED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY", "RETURNED"]),
  location: z.string().optional(),
  description: z.string().optional(),
  trackingNumber: z.string().optional(),
  courier: z.string().optional(),
  courierId: z.string().optional()
});
