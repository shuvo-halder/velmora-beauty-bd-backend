import express from "express";
import {
  getLowStock,
  getOutOfStock,
  getInventoryValue,
  getAllInventory
} from "../controllers/inventory.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.get("/low-stock", requirePermission("Inventory", "read"), getLowStock);
router.get("/out-of-stock", requirePermission("Inventory", "read"), getOutOfStock);
router.get("/value", requirePermission("Inventory", "read"), getInventoryValue);
router.get("/", requirePermission("Inventory", "read"), getAllInventory);

export default router;
