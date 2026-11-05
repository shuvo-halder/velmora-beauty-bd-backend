import express from "express";
import { getCustomerActivity } from "../../controllers/storefront/activity.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";

const router = express.Router();

router.use(requireCustomerAuth);
router.get("/", getCustomerActivity);

export default router;
