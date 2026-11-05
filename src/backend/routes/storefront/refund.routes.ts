import express from "express";
import { requestRefund, getMyRefunds } from "../../controllers/storefront/refund.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateBody } from "../../middlewares/validation";
import { customerRefundRequestSchema } from "../../validators/refund.validator";

const router = express.Router();

router.use(requireCustomerAuth);
router.post("/request", validateBody(customerRefundRequestSchema), requestRefund);
router.get("/", getMyRefunds);

export default router;
