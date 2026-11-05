import express from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  assignOrderStaff,
  addOrderNote,
  deleteOrder,
} from "../controllers/order.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateParamsUUID } from "../middlewares/validation";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Orders", "read"), getOrders);
router.get("/:id", requirePermission("Orders", "read"), validateParamsUUID(["id"]), getOrderById);
router.put("/:id/status", requirePermission("Orders", "write"), validateParamsUUID(["id"]), updateOrderStatus);
router.patch("/:id/assign", requirePermission("Orders", "write"), validateParamsUUID(["id"]), assignOrderStaff);
router.post("/:id/notes", requirePermission("Orders", "write"), validateParamsUUID(["id"]), addOrderNote);
router.delete("/:id", requirePermission("Orders", "delete"), validateParamsUUID(["id"]), deleteOrder);

export default router;
