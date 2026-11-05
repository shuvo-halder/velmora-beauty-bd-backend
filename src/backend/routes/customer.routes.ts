import express from "express";
import {
  getCustomers,
  getCustomerById,
  updateCustomerStatus,
  updateCustomerMobileStatus,
  addCustomerNote,
  resetCustomerPassword,
} from "../controllers/customer.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateParamsUUID } from "../middlewares/validation";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Customers", "read"), getCustomers);
router.get("/:id", requirePermission("Customers", "read"), validateParamsUUID(["id"]), getCustomerById);
router.patch("/:id/status", requirePermission("Customers", "write"), validateParamsUUID(["id"]), updateCustomerStatus);
router.patch("/:id/mobile", requirePermission("Customers", "write"), validateParamsUUID(["id"]), updateCustomerMobileStatus);
router.post("/:id/notes", requirePermission("Customers", "write"), validateParamsUUID(["id"]), addCustomerNote);
router.post("/:id/reset-password", requirePermission("Customers", "write"), validateParamsUUID(["id"]), resetCustomerPassword);

export default router;
