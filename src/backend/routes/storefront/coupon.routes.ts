import express from "express";
import { getCoupons } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getCoupons);

export default router;
