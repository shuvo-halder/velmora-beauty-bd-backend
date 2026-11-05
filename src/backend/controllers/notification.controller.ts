import { Response, NextFunction } from "express";
import { AdminNotificationService } from "../services/notification.service";

export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await AdminNotificationService.getNotifications({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const sendNotification = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { customerId, type, title, message, channel, metadata } = req.body;
    await AdminNotificationService.sendNotification(customerId, type, title, message, channel, metadata);
    res.status(200).json({ status: "success", message: "Notification queued" });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await AdminNotificationService.markAsRead(id);
    res.status(200).json({ status: "success", message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    await AdminNotificationService.markAllAsRead();
    res.status(200).json({ status: "success", message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
