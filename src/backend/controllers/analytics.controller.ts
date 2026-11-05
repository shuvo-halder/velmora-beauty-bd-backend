import { Response, NextFunction } from "express";
import { AdminAnalyticsService } from "../services/analytics.service";

export const getOverview = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getOverview();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getCustomerAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getProductAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getRevenue = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getRevenueAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getOrdersAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getCategoryAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getBrands = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getBrandAnalytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getGa4 = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AdminAnalyticsService.getGa4Analytics();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};
