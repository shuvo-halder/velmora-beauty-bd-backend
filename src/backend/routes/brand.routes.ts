import express from "express";
import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Brands", "read"), getAllBrands)
  .post(requirePermission("Brands", "write"), createBrand);

router.route("/:id")
  .get(requirePermission("Brands", "read"), getBrandById)
  .put(requirePermission("Brands", "write"), updateBrand)
  .delete(requirePermission("Brands", "delete"), deleteBrand);

export default router;
