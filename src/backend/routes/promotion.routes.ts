import express from "express";
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionActive,
  deletePromotion,
  applyPromotions,
} from "../controllers/promotion.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

// Automatic evaluation endpoint
router.post("/apply", applyPromotions);

// Admin routes
router.use(requireAuth);

router.route("/")
  .get(requirePermission("Promotions", "read"), getAllPromotions)
  .post(requirePermission("Promotions", "write"), createPromotion);

router.route("/:id")
  .get(requirePermission("Promotions", "read"), getPromotionById)
  .put(requirePermission("Promotions", "write"), updatePromotion)
  .delete(requirePermission("Promotions", "delete"), deletePromotion);

router.patch("/:id/toggle", requirePermission("Promotions", "write"), togglePromotionActive);

export default router;
