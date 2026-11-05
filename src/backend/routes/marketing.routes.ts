import express from "express";
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getMarketingAnalytics,
} from "../controllers/marketing.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.get("/analytics", requirePermission("Marketing", "read"), getMarketingAnalytics);

router.route("/campaigns")
  .get(requirePermission("Marketing", "read"), getAllCampaigns)
  .post(requirePermission("Marketing", "write"), createCampaign);

router.route("/campaigns/:id")
  .get(requirePermission("Marketing", "read"), getCampaignById)
  .put(requirePermission("Marketing", "write"), updateCampaign)
  .delete(requirePermission("Marketing", "delete"), deleteCampaign);

router.patch("/campaigns/:id/status", requirePermission("Marketing", "write"), updateCampaignStatus);

export default router;
