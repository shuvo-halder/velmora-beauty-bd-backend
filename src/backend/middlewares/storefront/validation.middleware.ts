import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  q: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z.enum(["featured", "bestsellers", "newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"]).optional(),
}).refine(data => {
  if (data.min_price !== undefined && data.max_price !== undefined) {
    return data.min_price <= data.max_price;
  }
  return true;
}, {
  message: "min_price must be <= max_price",
  path: ["min_price", "max_price"]
});

export const validateProductListQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query = productListQuerySchema.parse(req.query) as any;
    next();
  } catch (error) {
    next(error);
  }
};

const categoryListQuerySchema = z.object({
  tree: z.enum(["true", "false"]).optional(),
});

export const validateCategoryListQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query = categoryListQuerySchema.parse(req.query) as any;
    next();
  } catch (error) {
    next(error);
  }
};

const brandListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const validateBrandListQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query = brandListQuerySchema.parse(req.query) as any;
    next();
  } catch (error) {
    next(error);
  }
};


export const validateSlugParam = (req: Request, res: Response, next: NextFunction) => {
  const { slug } = req.params;
  const slugRegex = /^[a-z0-9-]+$/;
  
  if (!slug || typeof slug !== 'string' || !slugRegex.test(slug)) {
    return res.status(400).json({
      success: false,
      message: "Invalid slug"
    });
  }
  
  next();
};
