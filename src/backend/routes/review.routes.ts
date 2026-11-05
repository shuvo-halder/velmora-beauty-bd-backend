import { Router } from "express";
import {
  listReviews,
  getReviewStats,
  getReview,
  updateReviewStatus,
  updateAdminResponse,
  deleteReview,
} from "../controllers/review.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = Router();

// Protect all admin review routes
router.use(requireAuth);

router.get("/stats", requirePermission("Products", "read"), getReviewStats);
router.get("/", requirePermission("Products", "read"), listReviews);
router.get("/:id", requirePermission("Products", "read"), getReview);
router.put("/:id/status", requirePermission("Products", "write"), updateReviewStatus);
router.put("/:id/response", requirePermission("Products", "write"), updateAdminResponse);
router.delete("/:id", requirePermission("Products", "delete"), deleteReview);

export default router;
