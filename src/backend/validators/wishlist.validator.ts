import { z } from "zod";

export const addWishlistItemSchema = z.object({
  productId: z.string().uuid("Invalid Product ID format"),
});
