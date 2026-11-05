import express from "express";
import {
  getRefunds,
  getRefundById,
  approveRefund,
  rejectRefund,
  processRefund,
  initiateRefund,
  deleteRefund,
} from "../controllers/refund.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import { adminProcessRefundSchema, adminInitiateRefundSchema } from "../validators/refund.validator";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Orders", "read"), getRefunds);
router.get("/:id", requirePermission("Orders", "read"), validateParamsUUID(["id"]), getRefundById);

router.post(
  "/initiate",
  requirePermission("Orders", "write"),
  validateBody(adminInitiateRefundSchema),
  initiateRefund
);

router.post(
  "/:id/process",
  requirePermission("Orders", "write"),
  validateParamsUUID(["id"]),
  validateBody(adminProcessRefundSchema),
  processRefund
);

router.post(
  "/:id/approve",
  requirePermission("Orders", "write"),
  validateParamsUUID(["id"]),
  approveRefund
);

router.post(
  "/:id/reject",
  requirePermission("Orders", "write"),
  validateParamsUUID(["id"]),
  rejectRefund
);

router.delete("/:id", requirePermission("Orders", "write"), validateParamsUUID(["id"]), deleteRefund);

export default router;

