import express from "express";
import { 
  getOverview, 
  getCustomers, 
  getProducts,
  getRevenue,
  getOrders,
  getCategories,
  getBrands,
  getGa4
} from "../controllers/analytics.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = express.Router();

router.use(requireAuth);

router.get("/overview", requirePermission("Orders", "read"), getOverview);
router.get("/customers", requirePermission("Customers", "read"), getCustomers);
router.get("/products", requirePermission("Products", "read"), getProducts);
router.get("/revenue", requirePermission("Orders", "read"), getRevenue);
router.get("/orders", requirePermission("Orders", "read"), getOrders);
router.get("/categories", requirePermission("Categories", "read"), getCategories);
router.get("/brands", requirePermission("Brands", "read"), getBrands);
router.get("/ga4", requirePermission("Orders", "read"), getGa4);

export default router;
