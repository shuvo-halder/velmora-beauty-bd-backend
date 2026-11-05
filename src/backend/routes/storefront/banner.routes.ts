import express from "express";
import { getBanners } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getBanners);

export default router;
