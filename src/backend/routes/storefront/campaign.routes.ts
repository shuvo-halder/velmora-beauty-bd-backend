import express from "express";
import { getCampaigns } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getCampaigns);

export default router;
