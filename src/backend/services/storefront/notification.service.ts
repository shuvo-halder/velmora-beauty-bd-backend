import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export class StorefrontNotificationService {
  static async getNotifications(
    customerId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      customerId,
      channel: "IN_APP",
    };

    if (options.unreadOnly) {
      whereClause.status = { not: "READ" };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: { customerId, channel: "IN_APP", status: { not: "READ" } },
      }),
    ]);

    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      status: n.status,
      isRead: n.status === "READ",
      orderId: n.orderId || null,
      createdAt: n.createdAt,
    }));

    return {
      notifications: formattedNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getUnreadCount(customerId: string) {
    const count = await prisma.notification.count({
      where: { customerId, channel: "IN_APP", status: { not: "READ" } },
    });
    return count;
  }

  static async markAsRead(customerId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, customerId },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404, "NOT_FOUND");
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "READ" },
    });
  }

  static async markAllAsRead(customerId: string) {
    await prisma.notification.updateMany({
      where: { customerId, channel: "IN_APP", status: { not: "READ" } },
      data: { status: "READ" },
    });
  }
}

