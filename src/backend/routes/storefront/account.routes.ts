import express from "express";
import {
  getDashboard,
  getMyProfile,
  updateMyProfile,
  updateEmail,
  verifyEmailChange,
  changePassword,
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../controllers/storefront/account.controller";
import {
  requestMobileChange,
  verifyMobileChange,
} from "../../controllers/storefront/account-mobile.controller";
import { getMyPayments, getOrderPayments } from "../../controllers/storefront/payment.controller";
import { getMyRefunds, getOrderRefunds } from "../../controllers/storefront/refund.controller";
import { getMyReturns, getOrderReturns } from "../../controllers/storefront/return.controller";
import {
  getMyShipments,
  getShipmentById,
  getOrderShipments,
  getOrderTracking,
} from "../../controllers/storefront/shipment.controller";
import {
  getMyReviews,
  getEligibleReviews,
  createCustomerReview,
} from "../../controllers/storefront/review.controller";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../controllers/storefront/notification.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { verifyEmailLimiter } from "../../middlewares/rateLimiter";
import { validateBody, validateParamsUUID } from "../../middlewares/validation";
import {
  updateProfileSchema,
  updateEmailSchema,
  changePasswordSchema,
  createAddressSchema,
  updateAddressSchema,
  updateNotificationPrefSchema,
  requestMobileChangeSchema,
  verifyMobileChangeSchema,
} from "../../validators/account.validator";
import { customerCreateReviewSchema } from "../../validators/review.validator";

const router = express.Router();

router.use(requireCustomerAuth);

router.get("/dashboard", getDashboard);
router.get("/profile", getMyProfile);
router.patch("/profile", validateBody(updateProfileSchema), updateMyProfile);
router.put("/profile", validateBody(updateProfileSchema), updateMyProfile);
router.get("/me", getMyProfile);
router.patch("/me", validateBody(updateProfileSchema), updateMyProfile);
router.put("/me", validateBody(updateProfileSchema), updateMyProfile);

router.put("/email", validateBody(updateEmailSchema), updateEmail);
router.post("/verify-email-change", verifyEmailLimiter, verifyEmailChange);

// Mobile updates
router.post("/mobile", validateBody(requestMobileChangeSchema), requestMobileChange);
router.post("/verify-mobile-change", validateBody(verifyMobileChangeSchema), verifyMobileChange);

router.put("/password", validateBody(changePasswordSchema), changePassword);

router.get("/addresses", getAddresses);
router.get("/addresses/:id", validateParamsUUID(["id"]), getAddressById);
router.post("/addresses", validateBody(createAddressSchema), createAddress);
router.put("/addresses/:id", validateParamsUUID(["id"]), validateBody(updateAddressSchema), updateAddress);
router.delete("/addresses/:id", validateParamsUUID(["id"]), deleteAddress);

router.get("/sessions", getSessions);
router.delete("/sessions/:id", validateParamsUUID(["id"]), revokeSession);
router.delete("/sessions", revokeAllOtherSessions);

router.get("/notification-preferences", getNotificationPreferences);
router.put("/notification-preferences", validateBody(updateNotificationPrefSchema), updateNotificationPreferences);

// Customer Notifications
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllAsRead);
router.post("/notifications/read-all", markAllAsRead);
router.patch("/notifications/:id/read", validateParamsUUID(["id"]), markAsRead);
router.post("/notifications/:id/read", validateParamsUUID(["id"]), markAsRead);

// Customer Payments, Refunds, Returns, Shipments, Reviews
router.get("/payments", getMyPayments);
router.get("/refunds", getMyRefunds);
router.get("/returns", getMyReturns);
router.get("/shipments", getMyShipments);
router.get("/shipments/:shipmentId", validateParamsUUID(["shipmentId"]), getShipmentById);

// Customer Reviews & Eligibility
router.get("/reviews", getMyReviews);
router.get("/reviews/eligible", getEligibleReviews);
router.post("/reviews", validateBody(customerCreateReviewSchema), createCustomerReview);

// Customer Order Payments, Refunds, Returns, Shipments, Tracking
router.get("/orders/:orderId/payments", validateParamsUUID(["orderId"]), getOrderPayments);
router.get("/orders/:orderId/refunds", validateParamsUUID(["orderId"]), getOrderRefunds);
router.get("/orders/:orderId/returns", validateParamsUUID(["orderId"]), getOrderReturns);
router.get("/orders/:orderId/shipments", validateParamsUUID(["orderId"]), getOrderShipments);
router.get("/orders/:orderId/tracking", validateParamsUUID(["orderId"]), getOrderTracking);

export default router;
