import { Router } from "express";
import { getFaqs } from "../../controllers/storefront/faq.controller";

const router = Router();

router.get("/", getFaqs);

export default router;
