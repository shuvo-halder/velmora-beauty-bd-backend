import { Request, Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontOrderService } from "../../services/storefront/order.service";
import { StorefrontShipmentService } from "../../services/storefront/shipment.service";

export const getMyOrders = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await StorefrontOrderService.getCustomerOrders(customerId, {
      page,
      limit,
      status,
      search,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderById = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { id } = req.params;

    const order = await StorefrontOrderService.getCustomerOrderById(customerId, id);

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderTimeline = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { id } = req.params;

    const timelineData = await StorefrontOrderService.getCustomerOrderTimeline(customerId, id);

    res.status(200).json({
      status: "success",
      data: timelineData,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderShipments = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const orderId = req.params.id || req.params.orderId;
    const result = await StorefrontShipmentService.getOrderShipments(customerId, orderId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderTracking = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.customer!.id;
    const orderId = req.params.id || req.params.orderId;
    const result = await StorefrontShipmentService.getOrderTracking(customerId, orderId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const trackGuestOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderNumber =
      (req.body?.orderNumber as string) ||
      (req.query?.orderNumber as string) ||
      (req.params?.orderNumber as string);

    const phoneOrEmail =
      (req.body?.phoneOrEmail as string) ||
      (req.body?.email as string) ||
      (req.body?.phone as string) ||
      (req.query?.phoneOrEmail as string) ||
      (req.query?.email as string) ||
      (req.query?.phone as string);

    const result = await StorefrontShipmentService.getGuestOrderTracking(orderNumber, phoneOrEmail);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const claimGuestOrders = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Unknown";
    
    const result = await StorefrontOrderService.claimGuestOrders(customerId, ip);
    
    if (result.linkedOrdersCount > 0) {
      res.status(200).json({
        success: true,
        message: "Guest orders synchronized successfully.",
        data: result,
      });
    } else {
      res.status(200).json({
        success: true,
        message: "No new guest orders were found.",
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};
