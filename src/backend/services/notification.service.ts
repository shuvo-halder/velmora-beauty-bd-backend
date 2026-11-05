import { prisma } from "../config/db";
import { NotificationType, NotificationChannel, NotificationStatus } from "@prisma/client";
import { EventService } from "./event.service";
import { AppError } from "../utils/AppError";

export class AdminNotificationService {
  static async getNotifications(options: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }),
      prisma.notification.count()
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async sendNotification(customerId: string, type: NotificationType, title: string, message: string, channel: NotificationChannel, metadata?: any) {
    await EventService.sendNotification(customerId, type, title, message, channel, metadata);
    return { success: true };
  }

  static async markAsRead(id: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    return prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ }
    });
  }

  static async markAllAsRead() {
    return prisma.notification.updateMany({
      data: { status: NotificationStatus.READ }
    });
  }
}
