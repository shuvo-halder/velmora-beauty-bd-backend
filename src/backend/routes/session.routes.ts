import express from "express";
import {
  getActiveSessions,
  revokeSession
} from "../controllers/session.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Sessions", "read"), getActiveSessions);
router.delete("/:id", requirePermission("Sessions", "delete"), revokeSession);

export default router;
