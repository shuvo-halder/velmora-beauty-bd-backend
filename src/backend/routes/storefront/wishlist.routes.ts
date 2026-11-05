import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../../controllers/storefront/wishlist.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateParamsUUID } from "../../middlewares/validation";

const router = express.Router();

router.use(requireCustomerAuth);

router.get("/", getWishlist);
router.post("/:productId", validateParamsUUID(["productId"]), addToWishlist);
router.delete("/:productId", validateParamsUUID(["productId"]), removeFromWishlist);

export default router;
