import express from "express";
import {
  getAllPopups,
  getPopupById,
  createPopup,
  updatePopup,
  deletePopup,
} from "../controllers/popup.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

// Public active popups
router.get("/public", getAllPopups);

// Admin routes
router.use(requireAuth);

router.route("/")
  .get(requirePermission("Popups", "read"), getAllPopups)
  .post(requirePermission("Popups", "write"), createPopup);

router.route("/:id")
  .get(requirePermission("Popups", "read"), getPopupById)
  .put(requirePermission("Popups", "write"), updatePopup)
  .delete(requirePermission("Popups", "delete"), deletePopup);

export default router;
