import { Router } from "express";
import { getBlogPosts, getBlogPostBySlug } from "../../controllers/storefront/blog.controller";

const router = Router();

router.get("/", getBlogPosts);
router.get("/:slug", getBlogPostBySlug);

export default router;
