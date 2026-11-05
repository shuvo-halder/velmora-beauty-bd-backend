import { Router } from "express";
import { 
  getProductReviews, 
  checkGuestEligibility, 
  submitGuestReview, 
  checkAuthenticatedEligibility,
  submitAuthenticatedReview,
  getFeaturedReviews,
  getMyReviews,
  uploadReviewImage
} from "../../controllers/storefront/review.controller";
import { validateBody, validateQuery } from "../../middlewares/validation";
import { guestReviewSchema, authenticatedReviewSchema, getFeaturedReviewsQuerySchema } from "../../validators/review.validator";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import rateLimit from "express-rate-limit";

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 images per windowMs
  message: { status: "error", message: "Too many images uploaded from this IP, please try again after 15 minutes" }
});
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Publicly accessible
router.get("/featured", validateQuery(getFeaturedReviewsQuerySchema), getFeaturedReviews);
router.get("/:productId", getProductReviews);

// Guest actions
router.post("/:productId/guest/eligibility", checkGuestEligibility);
router.post("/:productId/guest", validateBody(guestReviewSchema.omit({ productId: true })), submitGuestReview);

// Authenticated actions
router.get("/me/history", requireCustomerAuth, getMyReviews);
router.post("/:productId/eligibility", requireCustomerAuth, checkAuthenticatedEligibility);
router.post("/:productId", requireCustomerAuth, validateBody(authenticatedReviewSchema.omit({ productId: true })), submitAuthenticatedReview);
router.post("/upload-image", uploadLimiter, upload.single("image"), uploadReviewImage);

export default router;
