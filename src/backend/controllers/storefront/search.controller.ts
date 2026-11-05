import { Request, Response } from "express";
import { SearchQuerySchema, SearchFacetsQuerySchema } from "../../dtos/storefront/search.dto";
import { logger } from "../../config/logger";
import { storefrontSearchService } from "../../services/storefront/search.service";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = SearchQuerySchema.parse(req.query);

  let inStockBool: boolean | undefined = undefined;
  if (query.inStock !== undefined) {
    inStockBool = query.inStock === "true" || query.inStock === "1";
  }

  const result = await storefrontSearchService.searchProducts({
    q: query.q,
    category: query.category,
    brand: query.brand,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: inStockBool,
    page: query.page,
    limit: query.limit,
    sort: query.sort
  });

  res.json({
    data: result.data,
    meta: result.meta
  });
});

export const getFacets = asyncHandler(async (req: Request, res: Response) => {
  const query = SearchFacetsQuerySchema.parse(req.query);

  let inStockBool: boolean | undefined = undefined;
  if (query.inStock !== undefined) {
    inStockBool = query.inStock === "true" || query.inStock === "1";
  }

  const result = await storefrontSearchService.getFacets({
    q: query.q,
    category: query.category,
    brand: query.brand,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: inStockBool,
  });

  logger.info(`Facets aggregation executed in ${result.duration}ms`);

  res.json({
    success: true,
    data: {
      categories: result.categories,
      brands: result.brands,
      priceRange: result.priceRange,
      availability: result.availability
    }
  });
});
