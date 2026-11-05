import { Request, Response } from "express";
import { storefrontContentService } from "../../services/storefront/content.service";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
  const data = await storefrontContentService.getFaqs();
  res.json({
    success: true,
    data,
    meta: {},
  });
});
