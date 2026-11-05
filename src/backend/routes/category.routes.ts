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

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Categories", "read"), getAllCategories)
  .post(requirePermission("Categories", "write"), createCategory);

router.get("/:id/breadcrumb", requirePermission("Categories", "read"), getCategoryBreadcrumb);

router.route("/:id")
  .get(requirePermission("Categories", "read"), getCategoryById)
  .put(requirePermission("Categories", "write"), updateCategory)
  .delete(requirePermission("Categories", "delete"), deleteCategory);

export default router;
