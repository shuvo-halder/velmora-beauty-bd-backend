import { Router } from "express";
import { getCategories, getCategoryBySlug } from "../../controllers/storefront/category.controller";
import { validateCategoryListQuery , validateSlugParam } from "../../middlewares/storefront/validation.middleware";

const router = Router();

router.get("/", validateCategoryListQuery, getCategories);

router.get("/:slug", validateSlugParam, getCategoryBySlug);

export default router;
