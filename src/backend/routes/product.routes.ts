import express from "express";
import multer from "multer";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
  setPrimaryProductImage,
} from "../controllers/product.controller";
import {
  getProductVariants,
  createProductVariant
} from "../controllers/variant.controller";
import {
  getProductFaqs,
  assignProductFaq,
  reorderProductFaqs,
  removeProductFaq,
} from "../controllers/product-faq.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { validateBody, validateParamsUUID } from "../middlewares/validation";
import {
  assignProductFaqSchema,
  reorderProductFaqsSchema,
} from "../validators/product-faq.validator";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(requireAuth);

router.route("/")
  .get(requirePermission("Products", "read"), getAllProducts)
  .post(requirePermission("Products", "write"), createProduct);

router.route("/:productId/variants")
  .get(requirePermission("Products", "read"), getProductVariants)
  .post(requirePermission("Products", "write"), createProductVariant);

// Product FAQ Routes
router.get(
  "/:productId/faqs",
  requirePermission("Products", "read"),
  validateParamsUUID(["productId"]),
  getProductFaqs
);
router.post(
  "/:productId/faqs",
  requirePermission("Products", "write"),
  validateParamsUUID(["productId"]),
  validateBody(assignProductFaqSchema),
  assignProductFaq
);
router.put(
  "/:productId/faqs/reorder",
  requirePermission("Products", "write"),
  validateParamsUUID(["productId"]),
  validateBody(reorderProductFaqsSchema),
  reorderProductFaqs
);
router.delete(
  "/:productId/faqs/:faqId",
  requirePermission("Products", "write"),
  validateParamsUUID(["productId", "faqId"]),
  removeProductFaq
);

// Product Media Routes
router.post("/:id/images", requirePermission("Products", "write"), upload.single("image"), uploadProductImage);
router.delete("/:id/images/:imageId", requirePermission("Products", "write"), deleteProductImage);
router.put("/:id/images/reorder", requirePermission("Products", "write"), reorderProductImages);
router.put("/:id/images/:imageId/primary", requirePermission("Products", "write"), setPrimaryProductImage);

router.route("/:id")
  .get(requirePermission("Products", "read"), getProductById)
  .put(requirePermission("Products", "write"), updateProduct)
  .delete(requirePermission("Products", "delete"), deleteProduct);

export default router;