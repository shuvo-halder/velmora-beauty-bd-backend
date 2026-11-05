import { Request, Response } from "express";
import { storefrontContentService } from "../../services/storefront/content.service";

const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getBlogPosts = asyncHandler(async (req: Request, res: Response) => {
  const data = await storefrontContentService.getBlogPosts();
  res.json({
    success: true,
    data,
    meta: {},
  });
});

export const getBlogPostBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const data = await storefrontContentService.getBlogPostBySlug(slug);

  if (!data) {
    return res.status(404).json({ success: false, message: "Blog post not found" });
  }

  res.json({
    success: true,
    data,
    meta: {},
  });
});
