import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(["true", "false", "1", "0"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["relevance", "newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"]).default("relevance")
}).refine(data => {
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: "minPrice cannot be greater than maxPrice",
  path: ["minPrice"]
});

export type SearchQueryDTO = z.infer<typeof SearchQuerySchema>;

export const SearchFacetsQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(["true", "false", "1", "0"]).optional(),
}).refine(data => {
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: "minPrice cannot be greater than maxPrice",
  path: ["minPrice"]
});

export type SearchFacetsQueryDTO = z.infer<typeof SearchFacetsQuerySchema>;
