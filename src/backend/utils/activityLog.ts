import { Request } from "express";
import { prisma } from "../config/db";

export const createActivityLog = async (
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  req: Request
) => {
  try {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
      },
    });
  } catch (err) {
    console.error("Failed to create activity log:", err);
  }
};
