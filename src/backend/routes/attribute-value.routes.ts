import express from "express";
import {
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
} from "../controllers/attribute-value.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .post(requirePermission("Attributes", "write"), createAttributeValue);

router.route("/:id")
  .put(requirePermission("Attributes", "write"), updateAttributeValue)
  .delete(requirePermission("Attributes", "delete"), deleteAttributeValue);

export default router;
