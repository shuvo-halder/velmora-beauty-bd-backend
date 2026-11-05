import { Request, Response } from "express";
import { storefrontProductService } from "../../services/storefront/product.service";

// Simple async handler to avoid try/catch blocks
const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    page,
    limit,
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    sort
  } = req.query;

  const options = {
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    search: search as string,
    category: category as string,
    brand: brand as string,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    sort: sort as string,
  };

  const result = await storefrontProductService.getProducts(options);

  res.json(result);
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = await storefrontProductService.getProductBySlug(slug);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.json({ data: product });
});


