import express from "express";
import {
  getVariantById,
  updateVariant,
  deleteVariant,
} from "../controllers/variant.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.route("/:id")
  .get(requirePermission("Products", "read"), getVariantById)
  .put(requirePermission("Products", "write"), updateVariant)
  .delete(requirePermission("Products", "delete"), deleteVariant);

export default router;
