import express from "express";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../../controllers/storefront/notification.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateParamsUUID } from "../../middlewares/validation";

const router = express.Router();

router.use(requireCustomerAuth);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.post("/read-all", markAllAsRead);
router.patch("/:id/read", validateParamsUUID(["id"]), markAsRead);
router.post("/:id/read", validateParamsUUID(["id"]), markAsRead);

export default router;
