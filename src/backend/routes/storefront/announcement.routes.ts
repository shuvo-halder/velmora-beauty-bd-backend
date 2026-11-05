import express from "express";
import { getAnnouncements } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getAnnouncements);

export default router;
