import { Request, Response } from "express";
import { SeoSlugSchema, SeoSearchQuerySchema } from "../../dtos/storefront/seo.dto";
import { seoService } from "../../services/storefront/seo.service";
import { logger } from "../../config/logger";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getProductSeo = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { slug } = SeoSlugSchema.parse(req.params);
  const host = req.get("host") || "domain.com";

  const data = await seoService.getProductSeo(slug, host);

  const duration = Date.now() - startTime;
  logger.info({
    message: "SEO lookup completed",
    endpoint: req.originalUrl,
    entityType: "product",
    slug,
    responseTimeMs: duration
  });

  if (!data) {
    return res.status(404).json({ success: false, message: "Product SEO metadata not found" });
  }

  res.json({ success: true, data });
});

export const getCategorySeo = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { slug } = SeoSlugSchema.parse(req.params);
  const host = req.get("host") || "domain.com";

  const data = await seoService.getCategorySeo(slug, host);

  const duration = Date.now() - startTime;
  logger.info({
    message: "SEO lookup completed",
    endpoint: req.originalUrl,
    entityType: "category",
    slug,
    responseTimeMs: duration
  });

  if (!data) {
    return res.status(404).json({ success: false, message: "Category SEO metadata not found" });
  }

  res.json({ success: true, data });
});

export const getBrandSeo = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { slug } = SeoSlugSchema.parse(req.params);
  const host = req.get("host") || "domain.com";

  const data = await seoService.getBrandSeo(slug, host);

  const duration = Date.now() - startTime;
  logger.info({
    message: "SEO lookup completed",
    endpoint: req.originalUrl,
    entityType: "brand",
    slug,
    responseTimeMs: duration
  });

  if (!data) {
    return res.status(404).json({ success: false, message: "Brand SEO metadata not found" });
  }

  res.json({ success: true, data });
});

export const getSearchSeo = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { q } = SeoSearchQuerySchema.parse(req.query);
  const host = req.get("host") || "domain.com";

  const data = await seoService.getSearchSeo(q, host);

  const duration = Date.now() - startTime;
  logger.info({
    message: "SEO lookup completed",
    endpoint: req.originalUrl,
    entityType: "search",
    slug: q,
    responseTimeMs: duration
  });

  res.json({ success: true, data });
});
