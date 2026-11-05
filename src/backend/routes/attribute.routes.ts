import express from "express";
import {
  getAllAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from "../controllers/attribute.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Attributes", "read"), getAllAttributes)
  .post(requirePermission("Attributes", "write"), createAttribute);

router.route("/:id")
  .get(requirePermission("Attributes", "read"), getAttributeById)
  .put(requirePermission("Attributes", "write"), updateAttribute)
  .delete(requirePermission("Attributes", "delete"), deleteAttribute);

export default router;
