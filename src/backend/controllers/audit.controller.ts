import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../middlewares/auth";
import { AppError } from "../utils/AppError";

// GET /api/v1/audit-logs
export const getAllAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      action,
      entityType,
      keyword,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    // Date Range Filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    // Actor User Filter
    if (userId) {
      whereClause.userId = userId as string;
    }

    // Action Filter
    if (action) {
      whereClause.action = action as string;
    }

    // Entity Type Filter
    if (entityType) {
      whereClause.entityType = entityType as string;
    }

    // Keyword Search
    if (keyword) {
      const keywordStr = keyword as string;
      whereClause.OR = [
        { action: { contains: keywordStr, mode: "insensitive" } },
        { entityType: { contains: keywordStr, mode: "insensitive" } },
        { entityId: { contains: keywordStr, mode: "insensitive" } },
        { details: { contains: keywordStr, mode: "insensitive" } },
        { ipAddress: { contains: keywordStr, mode: "insensitive" } },
        {
          user: {
            OR: [
              { email: { contains: keywordStr, mode: "insensitive" } },
              { firstName: { contains: keywordStr, mode: "insensitive" } },
              { lastName: { contains: keywordStr, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const sortField = ["createdAt", "action", "entityType"].includes(sortBy as string)
      ? (sortBy as string)
      : "createdAt";
    const sortDir = ["asc", "desc"].includes((sortOrder as string).toLowerCase())
      ? (sortOrder as string).toLowerCase()
      : "desc";

    const [logs, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { [sortField]: sortDir },
        skip,
        take: limitNum,
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/audit-logs/:id
export const getAuditLogById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const log = await prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!log) {
      return next(new AppError("Audit log not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { log },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/audit-logs/export
export const exportAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      action,
      entityType,
      keyword,
      format = "json",
    } = req.query;

    const whereClause: any = {};

    // Date Range Filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    // Actor User Filter
    if (userId) {
      whereClause.userId = userId as string;
    }

    // Action Filter
    if (action) {
      whereClause.action = action as string;
    }

    // Entity Type Filter
    if (entityType) {
      whereClause.entityType = entityType as string;
    }

    // Keyword Search
    if (keyword) {
      const keywordStr = keyword as string;
      whereClause.OR = [
        { action: { contains: keywordStr, mode: "insensitive" } },
        { entityType: { contains: keywordStr, mode: "insensitive" } },
        { entityId: { contains: keywordStr, mode: "insensitive" } },
        { details: { contains: keywordStr, mode: "insensitive" } },
        { ipAddress: { contains: keywordStr, mode: "insensitive" } },
        {
          user: {
            OR: [
              { email: { contains: keywordStr, mode: "insensitive" } },
              { firstName: { contains: keywordStr, mode: "insensitive" } },
              { lastName: { contains: keywordStr, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.csv`);

      let csv = "ID,Timestamp,Actor Email,Actor Name,Action,Entity Type,Entity ID,IP Address,Details\n";
      for (const log of logs) {
        const actorEmail = log.user?.email || "System";
        const actorName = log.user ? `${log.user.firstName} ${log.user.lastName || ""}`.trim() : "System";
        const detailsEscaped = (log.details || "").replace(/"/g, '""');

        csv += `"${log.id}","${log.createdAt.toISOString()}","${actorEmail}","${actorName}","${log.action}","${log.entityType}","${log.entityId || ""}","${log.ipAddress || ""}","${detailsEscaped}"\n`;
      }
      return res.status(200).send(csv);
    }

    // Default to JSON
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.json`);
    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
