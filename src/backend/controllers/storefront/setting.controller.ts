import { Response, NextFunction } from "express";
import { StorefrontSettingService } from "../../services/storefront/setting.service";

export const getPublicSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await StorefrontSettingService.getPublicSettings();
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const getShippingSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await StorefrontSettingService.getShippingSettings();
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};
