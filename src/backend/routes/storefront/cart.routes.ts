import express from "express";
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCartCoupon,
  removeCartCoupon,
} from "../../controllers/storefront/cart.controller";
import { optionalCustomerAuth } from "../../middlewares/customerAuth";
import { validateBody, validateParamsUUID } from "../../middlewares/validation";
import { addCartItemSchema, updateCartItemSchema } from "../../validators/cart.validator";
import { applyCouponSchema } from "../../validators/checkout.validator";

const router = express.Router();

router.use(optionalCustomerAuth);

router.get("/", getCart);
router.get("/items", getCart);

router.post("/items", validateBody(addCartItemSchema), addItemToCart);
router.post("/item", validateBody(addCartItemSchema), addItemToCart);

router.put("/items/:id", validateParamsUUID(["id"]), validateBody(updateCartItemSchema), updateCartItem);
router.put("/item/:id", validateParamsUUID(["id"]), validateBody(updateCartItemSchema), updateCartItem);

router.delete("/items/:id", validateParamsUUID(["id"]), removeCartItem);
router.delete("/item/:id", validateParamsUUID(["id"]), removeCartItem);

router.post("/coupon", validateBody(applyCouponSchema), applyCartCoupon);
router.delete("/coupon", removeCartCoupon);
router.post("/coupon/remove", removeCartCoupon);

router.delete("/", clearCart);

export default router;
