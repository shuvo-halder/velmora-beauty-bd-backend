import { Response, NextFunction } from "express";
import crypto from "crypto";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontCartService, CartIdentifier } from "../../services/storefront/cart.service";
import { StorefrontCheckoutService } from "../../services/storefront/checkout.service";

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

export const getCart = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const cart = await StorefrontCartService.getCart(identifier);

    res.status(200).json({
      status: "success",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addItemToCart = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { productId, variantId, quantity } = req.body;

    const cart = await StorefrontCartService.addItem(identifier, {
      productId,
      variantId,
      quantity: Number(quantity) || 1,
    });

    res.status(200).json({
      status: "success",
      message: "Item added to cart successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { id } = req.params;
    const { quantity } = req.body;

    const cart = await StorefrontCartService.updateItem(identifier, id, Number(quantity));

    res.status(200).json({
      status: "success",
      message: "Cart item updated successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { id } = req.params;

    const cart = await StorefrontCartService.removeItem(identifier, id);

    res.status(200).json({
      status: "success",
      message: "Item removed from cart successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const cart = await StorefrontCartService.clearCart(identifier);

    res.status(200).json({
      status: "success",
      message: "Cart cleared successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const applyCartCoupon = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);
    const { couponCode } = req.body;

    await StorefrontCheckoutService.applyCoupon(identifier, couponCode);
    const cart = await StorefrontCartService.getCart(identifier);

    res.status(200).json({
      status: "success",
      message: "Coupon applied successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartCoupon = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = resolveCartIdentifier(req, res);

    await StorefrontCheckoutService.removeCoupon(identifier);
    const cart = await StorefrontCartService.getCart(identifier);

    res.status(200).json({
      status: "success",
      message: "Coupon removed successfully",
      data: {
        cart,
        ...cart,
      },
    });
  } catch (error) {
    next(error);
  }
};
