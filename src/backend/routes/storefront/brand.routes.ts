import { Router } from "express";
import { getBrands, getBrandBySlug } from "../../controllers/storefront/brand.controller";
import { validateBrandListQuery , validateSlugParam } from "../../middlewares/storefront/validation.middleware";

const router = Router();

router.get("/", validateBrandListQuery, getBrands);

router.get("/:slug", validateSlugParam, getBrandBySlug);

export default router;
