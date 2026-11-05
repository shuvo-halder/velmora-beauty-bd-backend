import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontRefundService } from "../../services/storefront/refund.service";

export const requestRefund = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { orderId, reason, amount } = req.body;

    const refund = await StorefrontRefundService.requestRefund(customerId, orderId, reason, amount);

    res.status(201).json({
      status: "success",
      message: "Refund requested successfully",
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRefunds = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string | undefined;

    const result = await StorefrontRefundService.getCustomerRefunds(customerId, {
      page,
      limit,
      status,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderRefunds = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const orderId = req.params.orderId || req.params.id;

    const result = await StorefrontRefundService.getOrderRefunds(customerId, orderId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
