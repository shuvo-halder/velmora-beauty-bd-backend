import "dotenv/config";
import "express-async-errors";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { createServer as createViteServer } from "vite";
import { env } from "./src/backend/config/env";
import { errorHandler } from "./src/backend/middlewares/errorHandler";
import { logger } from "./src/backend/config/logger";
import { swaggerSpec } from "./src/backend/config/swagger";

// Import routers here once created
import authRouter from "./src/backend/routes/auth.routes";
import notificationRouter from "./src/backend/routes/notification.routes";
import analyticsRouter from "./src/backend/routes/analytics.routes";
import dashboardRouter from "./src/backend/routes/dashboard.routes";
import productRouter from "./src/backend/routes/product.routes";
import categoryRouter from "./src/backend/routes/category.routes";
import brandRouter from "./src/backend/routes/brand.routes";
import attributeRouter from "./src/backend/routes/attribute.routes";
import attributeValueRouter from "./src/backend/routes/attribute-value.routes";
import variantRouter from "./src/backend/routes/variant.routes";
import inventoryRouter from "./src/backend/routes/inventory.routes";
import userRouter from "./src/backend/routes/user.routes";
import roleRouter from "./src/backend/routes/role.routes";
import permissionRouter from "./src/backend/routes/permission.routes";
import auditRouter from "./src/backend/routes/audit.routes";
import sessionRouter from "./src/backend/routes/session.routes";
import shipmentRouter from "./src/backend/routes/shipment.routes";
import pathaoRouter from "./src/backend/routes/pathao.routes";
import returnRouter from "./src/backend/routes/return.routes";
import refundRouter from "./src/backend/routes/refund.routes";
import paymentRouter from "./src/backend/routes/payment.routes";
import orderRouter from "./src/backend/routes/order.routes";
import customerAuthRouter from "./src/backend/routes/customer-auth.routes";
import customerProfileRouter from "./src/backend/routes/customer-profile.routes";
import customerRouter from "./src/backend/routes/customer.routes";
import couponRouter from "./src/backend/routes/coupon.routes";
import promotionRouter from "./src/backend/routes/promotion.routes";
import marketingRouter from "./src/backend/routes/marketing.routes";
import bannerRouter from "./src/backend/routes/banner.routes";
import popupRouter from "./src/backend/routes/popup.routes";
import pageRouter from "./src/backend/routes/page.routes";
import landingPageRouter from "./src/backend/routes/landing-page.routes";
import blogRouter from "./src/backend/routes/blog.routes";
import mediaRouter, { richTextUpload, richTextUploadMiddleware } from "./src/backend/routes/media.routes";
import { MediaController } from "./src/backend/controllers/media.controller";
import { requireAuth, requirePermission } from "./src/backend/middlewares/auth";
import faqRouter from "./src/backend/routes/faq.routes";
import archiveRouter from "./src/backend/routes/archive.routes";
import settingRouter from "./src/backend/routes/setting.routes";
import courierRouter from "./src/backend/routes/courier.routes";
import seoRouter from "./src/backend/routes/seo.routes";

import storefrontProductRouter from "./src/backend/routes/storefront/product.routes";
import storefrontCategoryRouter from "./src/backend/routes/storefront/category.routes";
import storefrontBrandRouter from "./src/backend/routes/storefront/brand.routes";
import storefrontSearchRouter from "./src/backend/routes/storefront/search.routes";
import storefrontMerchantRouter from "./src/backend/routes/storefront/merchant.routes";
import storefrontSettingRouter from "./src/backend/routes/storefront/setting.routes";
import storefrontAnalyticsRouter from "./src/backend/routes/storefront/analytics.routes";
import storefrontSeoRouter from "./src/backend/routes/storefront/seo.routes";
import storefrontReviewRouter from "./src/backend/routes/storefront/review.routes";
import reviewRouter from "./src/backend/routes/review.routes";
import { getSitemap, getRobotsTxt } from "./src/backend/controllers/storefront/sitemap.controller";
import storefrontPageRouter from "./src/backend/routes/storefront/page.routes";
import storefrontBlogRouter from "./src/backend/routes/storefront/blog.routes";
import storefrontFaqRouter from "./src/backend/routes/storefront/faq.routes";
import storefrontLandingPageRouter from "./src/backend/routes/storefront/landing-page.routes";
import storefrontActivityRouter from "./src/backend/routes/storefront/activity.routes";
import storefrontNotificationRouter from "./src/backend/routes/storefront/notification.routes";
import storefrontAuthRouter from "./src/backend/routes/storefront/auth.routes";
import storefrontAccountRouter from "./src/backend/routes/storefront/account.routes";
import storefrontWishlistRouter from "./src/backend/routes/storefront/wishlist.routes";
import storefrontOrderRouter from "./src/backend/routes/storefront/order.routes";
import storefrontCartRouter from "./src/backend/routes/storefront/cart.routes";
import storefrontCheckoutRouter from "./src/backend/routes/storefront/checkout.routes";
import storefrontReturnRouter from "./src/backend/routes/storefront/return.routes";
import storefrontRefundRouter from "./src/backend/routes/storefront/refund.routes";
import storefrontPaymentRouter from "./src/backend/routes/storefront/payment.routes";
import storefrontBannerRouter from "./src/backend/routes/storefront/banner.routes";
import storefrontPopupRouter from "./src/backend/routes/storefront/popup.routes";
import storefrontPromotionRouter from "./src/backend/routes/storefront/promotion.routes";
import storefrontCouponRouter from "./src/backend/routes/storefront/coupon.routes";
import storefrontCampaignRouter from "./src/backend/routes/storefront/campaign.routes";
import storefrontAnnouncementRouter from "./src/backend/routes/storefront/announcement.routes";
import storefrontHomeRouter from "./src/backend/routes/storefront/home.routes";
import { storefrontRequestLogger } from "./src/backend/middlewares/storefront/logging.middleware";
import { responseFormatter } from "./src/backend/middlewares/storefront/responseFormatter";
import { globalLimiter } from "./src/backend/middlewares/rateLimiter";
import { sanitizeMiddleware } from "./src/backend/middlewares/validation";
import { startRefreshTokenCleanupJob } from "./src/backend/controllers/auth.controller";
import { UploadCleanupService } from "./src/backend/services/upload-cleanup.service";
import { PathaoStatusSyncService } from "./src/backend/integrations/pathao/pathao-sync.service";

import { ProductMediaService } from "./src/backend/services/product-media.service";

async function startServer() {
  const app = express();
  const PORT = 3000; // Required by infrastructure

  // Enable trust proxy for reverse proxies (Apache HTTP Server, Next.js, PM2)
  app.set("trust proxy", process.env.TRUST_PROXY || ["loopback", "linklocal", "uniquelocal"]);

  // Start automatic background jobs
  startRefreshTokenCleanupJob();
  UploadCleanupService.startCleanupJob();
  PathaoStatusSyncService.startPollingJob();

  // Part 1 & 10 - Enterprise-grade Helmet security headers config
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
        fontSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'self'", "https://*.run.app", "https://ai.studio", "https://*.google.com"], // Allow AI Studio iframe preview
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // COOP
    crossOriginResourcePolicy: { policy: "cross-origin" }, // CORP
    dnsPrefetchControl: { allow: true },
    frameguard: { action: "sameorigin" }, // X-Frame-Options
    hidePoweredBy: true, // Hide X-Powered-By
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Strict-Transport-Security / HSTS
    ieNoOpen: true,
    noSniff: true, // X-Content-Type-Options
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }, // Referrer-Policy
  }));

  // Permissions-Policy & manual frame overrides
  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Restricted CORS configuration (Wildcard blocked in production)
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(o => o.trim()) : [];
  if (process.env.APP_URL) {
    allowedOrigins.push(process.env.APP_URL);
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes("*") ||
        allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed)) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "X-Cart-Session-Id",
      "x-cart-session-id",
      "X-Session-Id",
      "x-session-id",
      "X-Client-Id",
      "x-client-id",
    ],
    exposedHeaders: [
      "X-Cart-Session-Id",
      "x-cart-session-id",
      "X-Session-Id",
      "x-session-id",
    ],
  }));

  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  const apiRouter = express.Router();

  // Part 2 & Part 4 - Attach Global rate limiting and global recursive input sanitization
  apiRouter.use(globalLimiter);
  apiRouter.use(sanitizeMiddleware);

  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Swagger Documentation
  apiRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Mount routes
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/dashboard", dashboardRouter);
  apiRouter.use("/analytics", analyticsRouter);
  apiRouter.use("/notifications", notificationRouter);
  apiRouter.use("/products", productRouter);
  apiRouter.use("/categories", categoryRouter);
  apiRouter.use("/brands", brandRouter);
  apiRouter.use("/attributes", attributeRouter);
  apiRouter.use("/attribute-values", attributeValueRouter);
  apiRouter.use("/variants", variantRouter);
  apiRouter.use("/inventory", inventoryRouter);
  apiRouter.use("/users", userRouter);
  apiRouter.use("/roles", roleRouter);
  apiRouter.use("/permissions", permissionRouter);
  apiRouter.use("/audit-logs", auditRouter);
  apiRouter.use("/sessions", sessionRouter);
  apiRouter.use("/orders", orderRouter);
  apiRouter.use("/shipments", shipmentRouter);
  apiRouter.use("/courier", courierRouter);
  apiRouter.use("/pathao", pathaoRouter);
  apiRouter.use("/returns", returnRouter);
  apiRouter.use("/refunds", refundRouter);
  apiRouter.use("/payments", paymentRouter);
  apiRouter.use("/customer/auth", customerAuthRouter);
  apiRouter.use("/customer", customerProfileRouter);
  apiRouter.use("/customers", customerRouter);
  apiRouter.use("/coupons", couponRouter);
  apiRouter.use("/promotions", promotionRouter);
  apiRouter.use("/marketing", marketingRouter);
  apiRouter.use("/banners", bannerRouter);
  apiRouter.use("/popups", popupRouter);
  apiRouter.use("/pages", pageRouter);
  apiRouter.use("/landing-pages", landingPageRouter);
  apiRouter.use("/blog", blogRouter);
  apiRouter.use("/media", mediaRouter);
  apiRouter.post(
    "/uploads/rich-text-image",
    requireAuth,
    requirePermission("Media", "Write"),
    richTextUploadMiddleware,
    MediaController.uploadRichTextImage
  );
  apiRouter.use("/faqs", faqRouter);
  apiRouter.use("/seo", seoRouter);
  apiRouter.use("/reviews", reviewRouter);
  apiRouter.use("/archive", archiveRouter);
  apiRouter.use("/settings", settingRouter);
  apiRouter.use("/storefront/v1/settings", storefrontSettingRouter);
  
  app.use("/api/v1", apiRouter);

  // Storefront API Routes
  const storefrontRouter = express.Router();
  storefrontRouter.use(storefrontRequestLogger);
  storefrontRouter.use(responseFormatter);
  storefrontRouter.get("/sitemap", getSitemap);
  storefrontRouter.get("/robots.txt", getRobotsTxt);
  console.log("Registered sitemap");

storefrontRouter.use("/banners", storefrontBannerRouter);
  storefrontRouter.use("/popups", storefrontPopupRouter);
  storefrontRouter.use("/promotions", storefrontPromotionRouter);
  storefrontRouter.use("/coupons", storefrontCouponRouter);
  storefrontRouter.use("/campaigns", storefrontCampaignRouter);
  storefrontRouter.use("/announcements", storefrontAnnouncementRouter);
  storefrontRouter.use("/home", storefrontHomeRouter);
  storefrontRouter.use("/products", storefrontProductRouter);
  storefrontRouter.use("/categories", storefrontCategoryRouter);
  storefrontRouter.use("/brands", storefrontBrandRouter);
  storefrontRouter.use("/search", storefrontSearchRouter);
  storefrontRouter.use("/merchant", storefrontMerchantRouter);
  storefrontRouter.use("/seo", storefrontSeoRouter);
  storefrontRouter.use("/reviews", storefrontReviewRouter);
  storefrontRouter.use("/settings", storefrontSettingRouter);
  storefrontRouter.use("/analytics", storefrontAnalyticsRouter);
  storefrontRouter.use("/pages", storefrontPageRouter);
  storefrontRouter.use("/blog", storefrontBlogRouter);
  storefrontRouter.use("/faqs", storefrontFaqRouter);
  storefrontRouter.use("/landing-pages", storefrontLandingPageRouter);
  storefrontRouter.use("/auth", storefrontAuthRouter);
  storefrontRouter.use("/activity", storefrontActivityRouter);
  storefrontRouter.use("/notifications", storefrontNotificationRouter);
  storefrontRouter.use("/account", storefrontAccountRouter);
  storefrontRouter.use("/customer", storefrontAccountRouter);
  storefrontRouter.use("/wishlist", storefrontWishlistRouter);
  storefrontRouter.use("/orders", storefrontOrderRouter);
  storefrontRouter.use("/customer/orders", storefrontOrderRouter);
  storefrontRouter.use("/account/orders", storefrontOrderRouter);
  storefrontRouter.use("/cart", storefrontCartRouter);
  storefrontRouter.use("/checkout", storefrontCheckoutRouter);
  storefrontRouter.use("/payment", storefrontPaymentRouter);
  storefrontRouter.use("/refund", storefrontRefundRouter);
  storefrontRouter.use("/returns", storefrontReturnRouter);
  
  app.use("/api/storefront/v1", storefrontRouter);
  app.use("/api/v1/storefront/v1", storefrontRouter);

  // Error handling middleware (must be registered after routes)
  // 404 handler for API routes
  app.use("/api", (req, res) => {
    res.status(404).json({ status: "error", message: `API route not found: ${req.method} ${req.originalUrl}`, errors: [] });
  });

  app.use(errorHandler);

  // Vite middleware for development
  if (env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since this is Express v4, we use *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Migrate existing product image URL fields into ProductImage records
  ProductMediaService.migrateExistingProductMedia().catch(err => {
    logger.error("Error migrating product media on startup:", err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
