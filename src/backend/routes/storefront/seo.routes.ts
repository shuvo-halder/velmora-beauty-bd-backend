import express from "express";
import {
  getProductSeo,
  getCategorySeo,
  getBrandSeo,
  getSearchSeo
} from "../../controllers/storefront/seo.controller";

const router = express.Router();

router.get("/product/:slug", getProductSeo);
router.get("/category/:slug", getCategorySeo);
router.get("/brand/:slug", getBrandSeo);
router.get("/search", getSearchSeo);

export default router;
