import express from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller";
import { updateRolePermissions } from "../controllers/permission.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Roles", "read"), getAllRoles)
  .post(requirePermission("Roles", "write"), createRole);

router.route("/:id")
  .get(requirePermission("Roles", "read"), getRoleById)
  .put(requirePermission("Roles", "write"), updateRole)
  .delete(requirePermission("Roles", "delete"), deleteRole);

router.patch("/:id/permissions", requirePermission("Roles", "write"), updateRolePermissions);

export default router;
