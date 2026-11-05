import { Router } from "express";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  getAllAuditLogs,
  getAuditLogById,
  exportAuditLogs,
} from "../controllers/audit.controller";
import { Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

const router = Router();

router.use(requireAuth);

// Place /export before /:id to prevent routing clash
router.get("/export", requirePermission("AuditLogs", "read"), exportAuditLogs);
router.get("/", requirePermission("AuditLogs", "read"), getAllAuditLogs);
router.get("/:id", requirePermission("AuditLogs", "read"), getAuditLogById);

export default router;
