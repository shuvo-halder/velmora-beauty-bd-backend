import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontCheckoutService } from "../../services/storefront/checkout.service";
import crypto from "crypto";
import { CartIdentifier } from "../../services/storefront/cart.service";

/**
 * GET /api/storefront/v1/checkout/session
 * Retrieves current checkout session totals, items, and address setups.
 */

const resolveCartIdentifier = (req: CustomerAuthRequest, res: Response): CartIdentifier => {
  const customerId = req.customer?.id;
  let sessionId = (
    req.headers["x-cart-session-id"] ||
    req.headers["x-session-id"] ||
    req.query.sessionId ||
    req.body?.sessionId
  ) as string | undefined;

  if (!customerId && !sessionId) {
    sessionId = crypto.randomUUID();
    res.setHeader("X-Cart-Session-Id", sessionId);
  } else if (sessionId) {
    res.setHeader("X-Cart-Session-Id", sessionId);
  }

  return { customerId, sessionId };
};

export const getCheckoutSession = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const guestShippingAddress = req.body?.shippingAddress || (req.query?.city || req.query?.district ? req.query : undefined);
    const session = await StorefrontCheckoutService.getCheckoutSession(identifier, guestShippingAddress);

    res.status(200).json({
      status: "success",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/checkout/coupon
 * Applies a coupon to the active checkout session.
 */
export const applyCoupon = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { couponCode } = req.body;

    const session = await StorefrontCheckoutService.applyCoupon(identifier, couponCode);

    res.status(200).json({
      status: "success",
      message: "Coupon applied successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/storefront/v1/checkout/coupon
 * Removes the applied coupon from the active checkout session.
 */
export const removeCoupon = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const session = await StorefrontCheckoutService.removeCoupon(identifier);

    res.status(200).json({
      status: "success",
      message: "Coupon removed successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/checkout/shipping
 * Updates shipping and billing address selections.
 */
export const updateAddresses = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { shippingAddressId, billingAddressId } = req.body;

    const session = await StorefrontCheckoutService.updateAddresses(
      identifier,
      shippingAddressId,
      billingAddressId
    );

    res.status(200).json({
      status: "success",
      message: "Addresses selected successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/storefront/v1/checkout/complete
 * Executes checkout transaction and creates an Order.
 */
export const completeCheckout = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { paymentMethod, clientId, sessionId, shippingAddress, billingAddress } = req.body;

    const order = await StorefrontCheckoutService.completeCheckout(identifier, paymentMethod, clientId, sessionId, shippingAddress, billingAddress);

    res.status(201).json({
      status: "success",
      message: "Order placed successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
