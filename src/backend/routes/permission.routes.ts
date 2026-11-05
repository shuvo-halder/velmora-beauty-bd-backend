import express from "express";
import { getAllPermissions } from "../controllers/permission.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("Permissions", "read"), getAllPermissions);

export default router;
