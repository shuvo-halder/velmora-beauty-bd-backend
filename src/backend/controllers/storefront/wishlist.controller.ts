import { Response, NextFunction } from "express";
import { CustomerAuthRequest } from "../../middlewares/customerAuth";
import { StorefrontWishlistService } from "../../services/storefront/wishlist.service";
import { AppError } from "../../utils/AppError";

export const getWishlist = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const wishlist = await StorefrontWishlistService.getWishlist(customerId);

    res.status(200).json({
      status: "success",
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { productId } = req.params;

    if (!productId) {
      return next(new AppError("Product ID parameter is required", 400, "VALIDATION_ERROR"));
    }

    const wishlist = await StorefrontWishlistService.addToWishlist(customerId, productId);

    res.status(200).json({
      status: "success",
      message: "Product added to wishlist successfully",
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.customer!.id;
    const { productId } = req.params;

    if (!productId) {
      return next(new AppError("Product ID parameter is required", 400, "VALIDATION_ERROR"));
    }

    const wishlist = await StorefrontWishlistService.removeFromWishlist(customerId, productId);

    res.status(200).json({
      status: "success",
      message: "Product removed from wishlist successfully",
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};
