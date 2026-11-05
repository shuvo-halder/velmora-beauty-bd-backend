import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/audit.service";

export const getActiveSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.refreshToken.findUnique({
      where: { id }
    });

    if (!session) {
      return next(new AppError("Session not found", 404, "NOT_FOUND"));
    }

    await prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date()
      }
    });

    await AuditService.createLog(
      req.user!.id,
      "REVOKE_SESSION",
      "Security",
      id,
      `Session revoked by ${req.user!.email}`,
      { sessionId: id },
      req
    );

    res.json({
      success: true,
      message: "Session revoked successfully"
    });
  } catch (error) {
    next(error);
  }
};
