import { z } from "zod";

export const guestReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  rating: z.number().int().min(1).max(5),
  reviewHeadline: z.string().max(150, "Headline too long").optional().nullable(),
  reviewComment: z.string().min(1, "Review comment is required").max(1000, "Review comment cannot exceed 1000 characters"),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
});

export const authenticatedReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID").optional(),
  orderItemId: z.string().uuid("Invalid order item ID").optional(),
  rating: z.coerce.number().int().min(1).max(5),
  headline: z.string().max(150, "Headline too long").optional().nullable(),
  reviewHeadline: z.string().max(150, "Headline too long").optional().nullable(),
  comment: z.string().max(1000, "Review comment cannot exceed 1000 characters").optional().nullable(),
  reviewComment: z.string().max(1000, "Review comment cannot exceed 1000 characters").optional().nullable(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
});

export const customerCreateReviewSchema = authenticatedReviewSchema;

export const getFeaturedReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});
