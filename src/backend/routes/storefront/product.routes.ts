import { Router } from "express";
import { getProducts, getProductBySlug } from "../../controllers/storefront/product.controller";
import { validateProductListQuery , validateSlugParam } from "../../middlewares/storefront/validation.middleware";

const router = Router();

router.get("/", validateProductListQuery, getProducts);
router.get("/:slug", validateSlugParam, getProductBySlug);

export default router;
