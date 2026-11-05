import express from "express";
import { getXmlFeed, getJsonFeed } from "../../controllers/storefront/merchant.controller";

const router = express.Router();

router.get("/feed.xml", getXmlFeed);
router.get("/feed.json", getJsonFeed);

export default router;
