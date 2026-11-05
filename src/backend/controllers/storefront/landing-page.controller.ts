import { Request, Response } from "express";
import { storefrontContentService } from "../../services/storefront/content.service";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getLandingPageBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const data = await storefrontContentService.getLandingPageBySlug(slug);

  if (!data) {
    return res.status(404).json({ success: false, message: "Landing page not found" });
  }

  res.json({
    success: true,
    data,
    meta: {},
  });
});
