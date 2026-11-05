import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { requireAuth, requirePermission } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("Payments", "read"), PaymentController.getPayments);
router.get("/:id", requirePermission("Payments", "read"), PaymentController.getPaymentById);
router.put("/:id", requirePermission("Payments", "write"), PaymentController.updatePaymentStatus);

router.delete("/:id", requirePermission("Payments", "write"), PaymentController.deletePayment);

export default router;
