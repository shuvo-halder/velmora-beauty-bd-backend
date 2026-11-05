import express from "express";
import { requestReturn, getMyReturns, getMyReturnById } from "../../controllers/storefront/return.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import { validateBody, validateParamsUUID } from "../../middlewares/validation";
import { customerReturnRequestSchema } from "../../validators/return.validator";

const router = express.Router();

router.use(requireCustomerAuth);
router.post("/request", validateBody(customerReturnRequestSchema), requestReturn);
router.get("/", getMyReturns);
router.get("/:id", validateParamsUUID(["id"]), getMyReturnById);

export default router;
