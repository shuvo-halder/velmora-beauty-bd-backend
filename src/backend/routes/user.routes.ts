import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  forceLogoutUser,
} from "../controllers/user.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  validateBody,
  validateQuery,
  validateParamsUUID,
  createUserSchema,
  updateUserSchema,
  querySchema,
} from "../middlewares/validation";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Users", "read"), validateQuery(querySchema), getAllUsers)
  .post(requirePermission("Users", "write"), validateBody(createUserSchema), createUser);

router.route("/:id")
  .get(requirePermission("Users", "read"), validateParamsUUID(["id"]), getUserById)
  .put(requirePermission("Users", "write"), validateParamsUUID(["id"]), validateBody(updateUserSchema), updateUser)
  .delete(requirePermission("Users", "delete"), validateParamsUUID(["id"]), deleteUser);

router.patch("/:id/status", requirePermission("Users", "write"), validateParamsUUID(["id"]), updateUserStatus);
router.patch("/:id/role", requirePermission("Users", "write"), validateParamsUUID(["id"]), updateUserRole);
router.patch("/:id/reset-password", requirePermission("Users", "write"), validateParamsUUID(["id"]), adminResetPassword);
router.post("/:id/force-logout", requirePermission("Users", "write"), validateParamsUUID(["id"]), forceLogoutUser);

export default router;
