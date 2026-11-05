import express from "express";
import { getAnalyticsConfig } from "../../controllers/storefront/analytics.controller";

const router = express.Router();

router.get("/config", getAnalyticsConfig);

export default router;
