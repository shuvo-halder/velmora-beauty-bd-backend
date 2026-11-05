import express from "express";
import { getPublicSettings, getShippingSettings } from "../../controllers/storefront/setting.controller";
import { publicLimiter } from "../../middlewares/rateLimiter";

const router = express.Router();

router.get("/", publicLimiter, getPublicSettings);
router.get("/public", publicLimiter, getPublicSettings);
router.get("/shipping", publicLimiter, getShippingSettings);
router.get("/shipping-rates", publicLimiter, getShippingSettings);

export default router;
