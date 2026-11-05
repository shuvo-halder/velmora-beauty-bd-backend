import express from "express";
import { getReturns, getReturnById, updateReturnStatus, approveReturn, rejectReturn, receiveReturn, deleteReturn } from "../controllers/return.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import { adminProcessReturnSchema } from "../validators/return.validator";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Orders", "read"), getReturns);
router.get("/:id", requirePermission("Orders", "read"), validateParamsUUID(["id"]), getReturnById);
router.put("/:id", requirePermission("Orders", "write"), validateParamsUUID(["id"]), updateReturnStatus);
router.post("/:id/approve", requirePermission("Orders", "write"), validateParamsUUID(["id"]), validateBody(adminProcessReturnSchema), approveReturn);
router.post("/:id/reject", requirePermission("Orders", "write"), validateParamsUUID(["id"]), validateBody(adminProcessReturnSchema), rejectReturn);
router.post("/:id/receive", requirePermission("Orders", "write"), validateParamsUUID(["id"]), validateBody(adminProcessReturnSchema), receiveReturn);

router.delete("/:id", requirePermission("Orders", "write"), validateParamsUUID(["id"]), deleteReturn);

export default router;
