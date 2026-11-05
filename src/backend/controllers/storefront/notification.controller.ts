import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontNotificationService } from "../../services/storefront/notification.service";

export const getNotifications = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { page, limit, unreadOnly } = req.query;

    const isUnreadOnly = unreadOnly === "true" || unreadOnly === "1" || (unreadOnly as unknown) === true;
    
    const result = await StorefrontNotificationService.getNotifications(customerId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      unreadOnly: isUnreadOnly,
    });

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const count = await StorefrontNotificationService.getUnreadCount(customerId);
    res.status(200).json({ status: "success", data: { count } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { id } = req.params;
    await StorefrontNotificationService.markAsRead(customerId, id);
    res.status(200).json({ status: "success", message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    await StorefrontNotificationService.markAllAsRead(customerId);
    res.status(200).json({ status: "success", message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
