import express from "express";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/banner.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

// Public active banners
router.get("/public", getAllBanners);

// Admin routes
router.use(requireAuth);

router.route("/")
  .get(requirePermission("Banners", "read"), getAllBanners)
  .post(requirePermission("Banners", "write"), createBanner);

router.route("/:id")
  .get(requirePermission("Banners", "read"), getBannerById)
  .put(requirePermission("Banners", "write"), updateBanner)
  .delete(requirePermission("Banners", "delete"), deleteBanner);

export default router;
