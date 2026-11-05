import express from "express";
import { 
  testSMTP,
  getGeneral, updateGeneral,
  getStore, updateStore,
  getBranding, updateBranding,
  getSEO, updateSEO,
  getSMTP, updateSMTP,
  getAnalytics, updateAnalytics,
  getSecurity, updateSecurity,
  getShipping, updateShipping,
  getTax, updateTax
} from "../controllers/setting.controller";
import { CourierController } from "../controllers/courier.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody } from "../middlewares/validation";
import { 
  updateBrandingSettingsSchema,
  updateSEOSettingsSchema,
  updateSMTPSettingsSchema,
  updateAnalyticsSettingsSchema,
  updateSecuritySettingsSchema,
  updateShippingSettingsSchema,
  updateTaxSettingsSchema
} from "../validators/setting.validator";

const router = express.Router();

router.use(requireAuth);

router.get("/general", requirePermission("Settings", "read"), getGeneral);
router.put("/general", requirePermission("Settings", "write"), updateGeneral);

router.get("/branding", requirePermission("Settings", "read"), getBranding);
router.put("/branding", requirePermission("Settings", "write"), validateBody(updateBrandingSettingsSchema), updateBranding);

router.get("/seo", requirePermission("Settings", "read"), getSEO);
router.put("/seo", requirePermission("Settings", "write"), validateBody(updateSEOSettingsSchema), updateSEO);

router.get("/smtp", requirePermission("Settings", "read"), getSMTP);
router.put("/smtp", requirePermission("Settings", "write"), validateBody(updateSMTPSettingsSchema), updateSMTP);
router.post("/smtp/test", requirePermission("Settings", "write"), testSMTP);

router.get("/analytics", requirePermission("Settings", "read"), getAnalytics);
router.put("/analytics", requirePermission("Settings", "write"), validateBody(updateAnalyticsSettingsSchema), updateAnalytics);

router.get("/security", requirePermission("Settings", "read"), getSecurity);
router.put("/security", requirePermission("Settings", "write"), validateBody(updateSecuritySettingsSchema), updateSecurity);

router.get("/shipping", requirePermission("Settings", "read"), getShipping);
router.put("/shipping", requirePermission("Settings", "write"), validateBody(updateShippingSettingsSchema), updateShipping);

router.get("/tax", requirePermission("Settings", "read"), getTax);
router.put("/tax", requirePermission("Settings", "write"), validateBody(updateTaxSettingsSchema), updateTax);

router.get('/store', requirePermission('Settings', 'read'), getStore);
router.put('/store', requirePermission('Settings', 'write'), updateStore);

// Courier provider endpoints under settings
router.get("/couriers", requirePermission("Settings", "read"), CourierController.listProviders);
router.get("/couriers/:id", requirePermission("Settings", "read"), CourierController.getProvider);
router.put("/couriers/:id", requirePermission("Settings", "write"), CourierController.updateProviderConfig);
router.post("/couriers/:id/test", requirePermission("Settings", "write"), CourierController.testProvider);
router.post("/couriers/active", requirePermission("Settings", "write"), CourierController.setActiveProvider);

export default router;
