import express from "express";
import {
  getDashboardOverview,
  getRecentOrders,
  getRecentCustomers,
  getInventoryAlerts,
} from "../controllers/dashboard.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

// Admin Authentication required for all dashboard operations
router.use(requireAuth);

router.get("/overview", requirePermission("Dashboard", "read"), getDashboardOverview);
router.get("/recent-orders", requirePermission("Dashboard", "read"), getRecentOrders);
router.get("/recent-customers", requirePermission("Dashboard", "read"), getRecentCustomers);
router.get("/inventory-alerts", requirePermission("Dashboard", "read"), getInventoryAlerts);

export default router;
