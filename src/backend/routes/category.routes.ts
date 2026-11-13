import express from "express";
import {
  getAllCategories,
  getCategoryById,
  getCategoryBreadcrumb,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateParamsUUID } from "../middlewares/validation";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Categories", "read"), getAllCategories)
  .post(requirePermission("Categories", "write"), createCategory);

router.get("/:id/breadcrumb", requirePermission("Categories", "read"), validateParamsUUID(["id"]), getCategoryBreadcrumb);

router.route("/:id")
  .get(requirePermission("Categories", "read"), validateParamsUUID(["id"]), getCategoryById)
  .put(requirePermission("Categories", "write"), validateParamsUUID(["id"]), updateCategory)
  .delete(requirePermission("Categories", "delete"), validateParamsUUID(["id"]), deleteCategory);

export default router;
