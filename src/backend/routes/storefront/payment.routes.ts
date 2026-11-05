import express from "express";
import {
  initiatePayment,
  getPaymentStatus,
  verifyPayment,
  handleWebhook,
  getMyPayments,
} from "../../controllers/storefront/payment.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateBody, validateParamsUUID } from "../../middlewares/validation";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "../../validators/payment.validator";

const router = express.Router();

// Webhook endpoint (Public, provider verifies it)
router.post(
  "/webhook/:provider",
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
  handleWebhook
);

// Protected endpoints
router.use(requireCustomerAuth);

router.get("/", getMyPayments);
router.post("/initiate", validateBody(initiatePaymentSchema), initiatePayment);
router.post("/verify", validateBody(verifyPaymentSchema), verifyPayment);
router.get("/:id", validateParamsUUID(["id"]), getPaymentStatus);

export default router;
