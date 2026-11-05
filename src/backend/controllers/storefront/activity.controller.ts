import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontActivityService } from "../../services/storefront/activity.service";

export const getCustomerActivity = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { page, limit, type } = req.query;
    
    const result = await StorefrontActivityService.getCustomerActivity(customerId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as string
    });

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};
