import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth";
import { DashboardService } from "../services/dashboard.service";
import { dashboardQuerySchema } from "../validators/dashboard.validator";

/**
 * GET /api/v1/dashboard/overview
 */
export const getDashboardOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = dashboardQuerySchema.parse(req.query);
    const overview = await DashboardService.getOverview(validatedQuery);
    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/dashboard/recent-orders
 */
export const getRecentOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const orders = await DashboardService.getRecentOrders(limit);
    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/dashboard/recent-customers
 */
export const getRecentCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const customers = await DashboardService.getRecentCustomers(limit);
    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/dashboard/inventory-alerts
 */
export const getInventoryAlerts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const alerts = await DashboardService.getInventoryAlerts(limit);
    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return next(error);
  }
};
