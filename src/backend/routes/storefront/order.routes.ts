import express from "express";
import {
  getMyOrders,
  getMyOrderById,
  getMyOrderTimeline,
  getMyOrderShipments,
  getMyOrderTracking,
  trackGuestOrder,
  claimGuestOrders,
} from "../../controllers/storefront/order.controller";
import { getOrderPayments } from "../../controllers/storefront/payment.controller";
import { getOrderRefunds } from "../../controllers/storefront/refund.controller";
import { getOrderReturns } from "../../controllers/storefront/return.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateParamsUUID } from "../../middlewares/validation";

const router = express.Router();

// Guest order tracking (secured via matching phone/email check)
router.post("/track", trackGuestOrder);
router.get("/track", trackGuestOrder);

router.use(requireCustomerAuth);

router.post("/claim-guest-orders", claimGuestOrders);
router.get("/", getMyOrders);
router.get("/:id", validateParamsUUID(["id"]), getMyOrderById);
router.get("/:id/timeline", validateParamsUUID(["id"]), getMyOrderTimeline);

router.get("/:id/shipments", validateParamsUUID(["id"]), getMyOrderShipments);
router.get("/:id/tracking", validateParamsUUID(["id"]), getMyOrderTracking);

router.get("/:id/payments", validateParamsUUID(["id"]), getOrderPayments);
router.get("/:id/refunds", validateParamsUUID(["id"]), getOrderRefunds);
router.get("/:id/returns", validateParamsUUID(["id"]), getOrderReturns);

export default router;
