import { Router } from "express";
import { getLandingPageBySlug } from "../../controllers/storefront/landing-page.controller";

const router = Router();

router.get("/:slug", getLandingPageBySlug);

export default router;
