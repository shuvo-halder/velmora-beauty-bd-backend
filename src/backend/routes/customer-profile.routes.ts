import express from "express";
import { 
  getProfile, 
  updateProfile, 
  changePassword,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getPreferences,
  updatePreferences
} from "../controllers/customer-profile.controller";
import { getDashboard } from "../controllers/storefront/account.controller";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import { 
  updateProfileSchema, 
  changePasswordSchema, 
  addressSchema,
  preferencesSchema
} from "../validators/customer-profile.validator";
import { requireCustomerAuth } from "../middlewares/customerAuth";

const router = express.Router();

// Require auth for all profile routes
router.use(requireCustomerAuth);

// Dashboard
router.get("/dashboard", getDashboard);

// Profile
router.get("/profile", getProfile);
router.put("/profile", validateBody(updateProfileSchema), updateProfile);
router.put("/change-password", validateBody(changePasswordSchema), changePassword);

// Preferences
router.get("/preferences", getPreferences);
router.put("/preferences", validateBody(preferencesSchema), updatePreferences);

// Addresses
router.get("/addresses", getAddresses);
router.post("/addresses", validateBody(addressSchema), createAddress);
router.put("/addresses/:id", validateParamsUUID(["id"]), validateBody(addressSchema), updateAddress);
router.delete("/addresses/:id", validateParamsUUID(["id"]), deleteAddress);

export default router;
