import express from "express";
import { searchProducts, getFacets } from "../../controllers/storefront/search.controller";

const router = express.Router();

router.get("/facets", getFacets);
router.get("/", searchProducts);

export default router;
