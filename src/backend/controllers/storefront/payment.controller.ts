import { Response, NextFunction, Request } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontPaymentService } from "../../services/storefront/payment.service";

export const getMyPayments = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string | undefined;

    const result = await StorefrontPaymentService.getCustomerPayments(customerId, {
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

export const getOrderPayments = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const orderId = req.params.orderId || req.params.id;

    const result = await StorefrontPaymentService.getOrderPayments(customerId, orderId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/payment/initiate
 */
export const initiatePayment = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { orderId, provider } = req.body;

    const result = await StorefrontPaymentService.initiatePayment(customerId, orderId, provider);

    res.status(200).json({
      status: "success",
      message: "Payment initiated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/storefront/v1/payment/:id
 */
export const getPaymentStatus = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const paymentId = req.params.id;

    const payment = await StorefrontPaymentService.getPaymentStatus(customerId, paymentId);

    res.status(200).json({
      status: "success",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/payment/verify
 */
export const verifyPayment = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { paymentId, providerTransactionId } = req.body;

    const payment = await StorefrontPaymentService.verifyPayment(customerId, paymentId, providerTransactionId);

    res.status(200).json({
      status: "success",
      message: "Payment verification completed",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/payment/webhook/:provider
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const provider = req.params.provider.toUpperCase();
    const payload = req.body;
    const rawBody = (req as any).rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const signature = (
      req.headers["stripe-signature"] ||
      req.headers["x-signature"] ||
      req.headers["x-webhook-signature"] ||
      req.body?.verify_sign ||
      req.query?.verify_sign
    ) as string | undefined;

    const result = await StorefrontPaymentService.handleWebhook(provider, rawBody, payload, signature);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
