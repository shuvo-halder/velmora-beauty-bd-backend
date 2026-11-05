import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontReturnService } from "../../services/storefront/return.service";

export const requestReturn = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { orderId, reason, items } = req.body;
    const returnRequest = await StorefrontReturnService.requestReturn(customerId, orderId, reason, items);
    res.status(201).json({ status: "success", data: { returnRequest } });
  } catch (error) {
    next(error);
  }
};

export const getMyReturns = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string | undefined;

    const result = await StorefrontReturnService.getReturns(customerId, {
      page,
      limit,
      status,
    });
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getOrderReturns = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const orderId = req.params.orderId || req.params.id;

    const result = await StorefrontReturnService.getOrderReturns(customerId, orderId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyReturnById = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const { id } = req.params;
    const returnReq = await StorefrontReturnService.getReturnById(customerId, id);
    res.status(200).json({ status: "success", data: { returnRequest: returnReq } });
  } catch (error) {
    next(error);
  }
};
