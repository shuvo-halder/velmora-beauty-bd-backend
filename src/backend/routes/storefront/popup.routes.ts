import express from "express";
import { getPopups } from "../../controllers/storefront/home.controller";

const router = express.Router();
router.get("/", getPopups);

export default router;
