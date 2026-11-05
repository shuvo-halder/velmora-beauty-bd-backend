import express from "express";
import { createShipment, getShipments, getShipmentById, updateShipmentStatus, deleteShipment } from "../controllers/shipment.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import { createShipmentSchema, updateShipmentStatusSchema } from "../validators/shipment.validator";

const router = express.Router();

router.use(requireAuth);

router.post("/", requirePermission("Orders", "write"), validateBody(createShipmentSchema), createShipment);
router.get("/", requirePermission("Orders", "read"), getShipments);
router.get("/:id", requirePermission("Orders", "read"), validateParamsUUID(["id"]), getShipmentById);
router.put("/:id", requirePermission("Orders", "write"), validateParamsUUID(["id"]), validateBody(updateShipmentStatusSchema), updateShipmentStatus);
router.put("/:id/status", requirePermission("Orders", "write"), validateParamsUUID(["id"]), validateBody(updateShipmentStatusSchema), updateShipmentStatus);

router.delete("/:id", requirePermission("Orders", "write"), validateParamsUUID(["id"]), deleteShipment);

export default router;
