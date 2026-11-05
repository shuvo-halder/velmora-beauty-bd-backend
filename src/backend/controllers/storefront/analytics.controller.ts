import { Response, NextFunction } from "express";
import { StorefrontAnalyticsService } from "../../services/storefront/analytics.service";

export const getAnalyticsConfig = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = await StorefrontAnalyticsService.getAnalyticsConfig();
    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};
