import { Request, Response } from "express";
import { merchantService } from "../../services/storefront/merchant.service";
import { logger } from "../../config/logger";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getXmlFeed = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const host = req.get('host') || 'domain.com';
  const items = await merchantService.getFeedData(host);
  const xml = merchantService.generateXmlFeed(items, host);

  const duration = Date.now() - startTime;
  logger.info(`Merchant XML feed generated in ${duration}ms for ${items.length} products`);

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

export const getJsonFeed = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const host = req.get('host') || 'domain.com';
  const items = await merchantService.getFeedData(host);

  const duration = Date.now() - startTime;
  logger.info(`Merchant JSON feed generated in ${duration}ms for ${items.length} products`);

  res.json({
    title: "Storefront Feed",
    link: `https://${host}`,
    description: "Product feed for Google Merchant Center",
    items
  });
});
