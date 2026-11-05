import express from "express";
import { getPromotions } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getPromotions);

export default router;
