import { Request, Response, NextFunction } from "express";
import { StorefrontReviewService } from "../../services/storefront/review.service";

export const getFeaturedReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const result = await StorefrontReviewService.getFeaturedReviews(limit);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    let page = Number(req.query.page) || 1;
    if (page < 1 || isNaN(page)) page = 1;
    let limit = Number(req.query.limit) || 10;
    if (limit < 1 || isNaN(limit)) limit = 10;
    if (limit > 50) limit = 50;
    
    const result = await StorefrontReviewService.getProductReviews(productId, page, limit);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const checkGuestEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({ status: "error", code: "MOBILE_REQUIRED", message: "Mobile number is required" });
    }
    const result = await StorefrontReviewService.checkGuestEligibility(productId, mobile);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const submitGuestReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const payload = {
      productId,
      ...req.body
    };
    const review = await StorefrontReviewService.submitGuestReview(payload);
    res.status(201).json({ status: "success", data: review, message: "Review submitted successfully and is pending approval" });
  } catch (error) {
    next(error);
  }
};

export const checkAuthenticatedEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const customerId = (req as any).customer.id;
    
    const result = await StorefrontReviewService.checkAuthenticatedEligibility(productId, customerId);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const submitAuthenticatedReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const customerId = (req as any).customer.id;
    const payload = {
      productId,
      ...req.body
    };
    const review = await StorefrontReviewService.submitAuthenticatedReview(payload, customerId);
    res.status(201).json({ status: "success", data: review, message: "Review submitted successfully and is pending approval" });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = (req as any).customer.id;
    let page = Number(req.query.page) || 1;
    if (page < 1 || isNaN(page)) page = 1;
    let limit = Number(req.query.limit) || 10;
    if (limit < 1 || isNaN(limit)) limit = 10;
    if (limit > 50) limit = 50;
    const result = await StorefrontReviewService.getMyReviews(customerId, page, limit);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getEligibleReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = (req as any).customer.id;
    const result = await StorefrontReviewService.getEligibleReviews(customerId);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const createCustomerReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = (req as any).customer.id;
    const payload = req.body;
    const review = await StorefrontReviewService.submitAuthenticatedReview(payload, customerId);
    res.status(201).json({
      status: "success",
      data: review,
      message: "Review submitted successfully and is pending approval",
    });
  } catch (error) {
    next(error);
  }
};

export const uploadReviewImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No image file provided" });
    }
    
    // Check mime type safely
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ status: "error", message: "Only image files are allowed" });
    }

    const result = await StorefrontReviewService.uploadReviewImage(req.file.buffer);
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};
