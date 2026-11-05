import express from "express";
import { getNotifications, sendNotification, markAsRead, markAllAsRead } from "../controllers/notification.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import { sendNotificationSchema } from "../validators/notification.validator";

const router = express.Router();

router.use(requireAuth);
router.get("/", requirePermission("Customers", "read"), getNotifications);
router.post("/send", requirePermission("Customers", "write"), validateBody(sendNotificationSchema), sendNotification);
router.post("/read-all", requirePermission("Customers", "write"), markAllAsRead);
router.post("/:id/read", requirePermission("Customers", "write"), validateParamsUUID(["id"]), markAsRead);

export default router;
