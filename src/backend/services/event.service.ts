import { prisma } from "../config/db";
import { ActivityType, NotificationType, NotificationChannel } from "@prisma/client";

export class EventService {
  static async logActivity(customerId: string, type: ActivityType, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    try {
      await prisma.customerActivity.create({
        data: {
          customerId,
          type,
          description,
          metadata: metadata || {},
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }

  static async trackAnalytics(eventName: string, customerId?: string, sessionId?: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventName,
          customerId,
          sessionId,
          metadata: metadata || {},
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      console.error("Failed to track analytics:", error);
    }
  }

  static async sendNotification(customerId: string, type: NotificationType, title: string, message: string, channel: NotificationChannel = "IN_APP", metadata?: any) {
    try {
      const prefs = await prisma.notificationPreference.findUnique({
        where: { customerId }
      });

      let shouldSend = true;
      if (prefs) {
        if (channel === "IN_APP" && !prefs.inApp) shouldSend = false;
        if (channel === "EMAIL" && !prefs.email) shouldSend = false;
        if (channel === "SMS" && !prefs.sms) shouldSend = false;
      }

      if (shouldSend) {
        await prisma.notification.create({
          data: {
            customerId,
            type,
            channel,
            title,
            message,
            metadata: metadata || {}
          }
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }
}
