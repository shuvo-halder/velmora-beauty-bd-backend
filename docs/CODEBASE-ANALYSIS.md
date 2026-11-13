# Comprehensive Codebase Analysis & Technical Audit

## 1. Overall Codebase Health Assessment

The **Velmora Beauty Platform** codebase demonstrates enterprise-grade ambition and high architectural maturity in several key domains, notably:
- **Sophisticated Database Concurrency**: Strategic application of PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) in financial and checkout pipelines.
- **Strict Authorization Engine**: Granular Role-Based Access Control (RBAC) with self-lockout guards and privilege escalation prevention.
- **Enterprise Middleware**: Helmet CSP configuration, multi-tiered IP rate limiting, and recursive deep sanitization against prototype pollution and XSS.

However, the codebase currently suffers from **staged/uncommitted dependency fragmentation**: several routes, controllers, and components were partially authored or removed, leaving broken imports that prevent the backend server and frontend SPA from compiling cleanly without intervention.

---

## 2. Verified Implementation Strengths

1. **Transactional Integrity & Row-Level Locking**:
   - `src/backend/controllers/order.controller.ts:238`: Locks `Payment` row before canceling orders to prevent race conditions with ongoing capture or refunds.
   - `src/backend/services/refund.service.ts:139, 146, 213, 222, 359`: Pessimistically locks both `Payment` and `Refund` rows to guarantee idempotent, non-duplicative payouts.
   - `src/backend/services/storefront/checkout.service.ts:624`: Locks `Coupon` rows to prevent coupon usage exhaustion bypasses under concurrent shopping loads.
2. **Comprehensive Security Sanitizer (`src/backend/middlewares/validation.ts`)**:
   - Implements recursive sanitization across nested objects and arrays.
   - Strips prototype pollution attempts (`__proto__`, `constructor`, `prototype`).
   - Removes malicious `<script>`, `onerror`, `onload`, and `javascript:` vectors while routing recognized rich-text fields (`description`, `content`) to safe HTML sanitizers (`sanitizeRichText`).
3. **Auditing & Forensic Logging (`src/backend/services/audit.service.ts`)**:
   - Captures detailed forensic metadata (user ID, client IP, user agent, entity type, before/after changes) into `ActivityLog`.
   - Logs security-sensitive events including rate limit breaches, suspicious payloads, unauthorized privilege escalation, and account lockouts.
4. **Token Rotation & Session Protection (`src/backend/controllers/auth.controller.ts`)**:
   - Implements strict refresh token rotation.
   - Enforces immediate revocation of all active sessions if reuse of a revoked token is detected (`COMPROMISED_SESSION`).

---

## 3. Security Audit & Vulnerability Classification

### 3.1 Critical Severity

#### SEC-CRIT-01: Hardcoded Dummy Fallbacks for Production Payment Secrets
- **File**: `src/backend/services/storefront/paymentSecurity.service.ts:27-39`
- **Description**: If payment gateway environment variables are missing, the helper defaults to hardcoded strings:
  ```typescript
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "dummy_stripe_secret_key",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "dummy_stripe_webhook_secret",
  bkashAppKey: process.env.BKASH_APP_KEY || "dummy_bkash_app_key",
  bkashAppSecret: process.env.BKASH_APP_SECRET || "dummy_bkash_app_secret",
  bkashWebhookSecret: process.env.BKASH_WEBHOOK_SECRET || "dummy_bkash_webhook_secret",
  sslStorePass: process.env.SSLCOMMERZ_STORE_PASSWORD || "dummy_ssl_store_pass",
  ```
- **Risk**: In staging or misconfigured production deployments, fallback secrets could allow attackers to forge webhook verification signatures or spoof successful payments.
- **Remediation**: Enforce strict startup validation that aborts process execution if payment provider secrets are undefined when payment gateways are enabled.

---

### 3.2 High Severity

#### SEC-HIGH-01: Hardcoded Client-Side Permission Bypass in Media Library
- **File**: `src/pages/admin/media/MediaLibrary.tsx:47-49`
- **Code**:
  ```typescript
  const canRead = hasPermission('Media', 'read') || true;
  const canWrite = hasPermission('Media', 'write') || true;
  const canDelete = hasPermission('Media', 'delete') || true;
  ```
- **Risk**: The `|| true` logical operator completely disables permission checks in the Admin Media Library UI. Any authenticated staff member (including read-only `Viewer`) can upload, edit, or batch-delete media assets from the UI.
- **Remediation**: Remove `|| true` and enforce strict evaluations:
  ```typescript
  const canRead = hasPermission('Media', 'read');
  const canWrite = hasPermission('Media', 'write');
  const canDelete = hasPermission('Media', 'delete');
  ```

#### SEC-HIGH-02: Silent Refresh Token Leak on Logout
- **File**: `src/context/AuthContext.tsx:113-120` & `src/backend/controllers/auth.controller.ts:133-140`
- **Code in AuthContext**:
  ```typescript
  const logout = async () => {
    try {
      await api.post("/auth/logout"); // DOES NOT SEND refreshToken IN REQUEST BODY
    } catch (e) {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };
  ```
- **Code in Backend Controller**:
  ```typescript
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError("Please provide a refresh token", 400, "MISSING_REFRESH_TOKEN"));
  }
  ```
- **Risk**: When an admin logs out, the frontend fails to send `refreshToken` in the POST body. The backend rejects the request with HTTP 400, which the frontend silently swallows. Consequently, **the refresh token remains valid in the PostgreSQL `RefreshToken` table** until its 7-day expiration. If intercepted prior to logout, it can continue to be exchanged for fresh access tokens.
- **Remediation**: Update `AuthContext.logout()` to pass `{ refreshToken }`:
  ```typescript
  const refreshToken = localStorage.getItem("refreshToken");
  await api.post("/auth/logout", { refreshToken });
  ```

---

### 3.3 Medium Severity

#### SEC-MED-01: Disconnected Frontend Register Endpoint
- **File**: `src/pages/auth/Register.tsx:26`
- **Code**: `await api.post("/users/register", formData);`
- **Risk**: No `/users/register` route exists on the backend. Furthermore, `src/backend/routes/user.routes.ts:25` applies `router.use(requireAuth)` across all `/users` routes. Unauthenticated visitors attempting to sign up receive an error.
- **Remediation**: Determine whether public admin registration is permitted. If administrative accounts must only be provisioned internally, remove the `/register` route and page link from `/login`.

#### SEC-MED-02: RBAC Permission Module Mismatches in Sales Routes
- **Files**:
  - `src/backend/routes/shipment.routes.ts:11-17`: Checks `requirePermission("Orders", "read" / "write")`
  - `src/backend/routes/return.routes.ts:11-18`: Checks `requirePermission("Orders", "read" / "write")`
  - `src/backend/routes/refund.routes.ts:19-51`: Checks `requirePermission("Orders", "read" / "write")`
  - `src/backend/routes/analytics.routes.ts:18-25`: Checks `requirePermission("Orders", "read")`
- **Risk**: In `prisma/seed.ts`, `Shipments`, `Returns`, `Refunds`, and `Analytics` are seeded as distinct permission modules. The frontend navigation in `Sidebar.tsx` and route guards in `App.tsx` guard these screens with their respective module names (`Shipments.read`, `Returns.read`, etc.). A user granted `Shipments.read` without `Orders.read` can view the page on the frontend, but every backend API call fails with 403 Forbidden.
- **Remediation**: Reconcile backend routes to check their respective domain permissions (`Shipments`, `Returns`, `Refunds`, `Analytics`).

---

### 3.4 Low Severity & Informational

- **SEC-LOW-01: Permissive Development JWT Fallbacks (`src/backend/config/env.ts:10-11`)**: Default secret `"super-secret-jwt-key-change-in-prod"` is protected in production by `missingVars` startup check, but should never be used in any shared staging environment.
- **SEC-INFO-01: Development Query Logging (`src/backend/config/db.ts:13-17`)**: Prisma query parameters are logged to Winston console at `debug` level; ensure `NODE_ENV=production` in all deployed environments to prevent logging sensitive user parameters.

---

## 4. Broken Imports & Missing Source Files Catalog

The following table documents all **14 verified missing files** causing broken imports across the application:

| # | Referencing Source File | Broken Import Statement | Missing File Path | Impact / Root Cause |
| :- | :--- | :--- | :--- | :--- |
| 1 | `server.ts:32` | `import pathaoRouter from "./src/backend/routes/pathao.routes";` | `src/backend/routes/pathao.routes.ts` | Server crashes on startup (`MODULE_NOT_FOUND`). |
| 2 | `server.ts:52` | `import archiveRouter from "./src/backend/routes/archive.routes";` | `src/backend/routes/archive.routes.ts` | Server crashes on startup (`MODULE_NOT_FOUND`). |
| 3 | `server.ts:54` | `import courierRouter from "./src/backend/routes/courier.routes";` | `src/backend/routes/courier.routes.ts` | Server crashes on startup (`MODULE_NOT_FOUND`). |
| 4 | `server.ts:96` | `import { PathaoStatusSyncService } from "./src/backend/integrations/pathao/pathao-sync.service";` | `src/backend/integrations/pathao/pathao-sync.service.ts` | Server crashes on startup (`MODULE_NOT_FOUND`). |
| 5 | `src/backend/routes/setting.routes.ts:14` | `import { CourierController } from "../controllers/courier.controller";` | `src/backend/controllers/courier.controller.ts` | Route registration fails (`MODULE_NOT_FOUND`). |
| 6 | `src/backend/services/shipment.service.ts:5-6` | `import { courierRegistry } ... from "../integrations/courier/..."` | `src/backend/integrations/courier/*` | Shipment service compilation fails. |
| 7 | `src/backend/controllers/product.controller.ts:23` | `import { ... } from "./product-faq.controller";` | `src/backend/controllers/product-faq.controller.ts` | Product controller compilation fails. |
| 8 | `src/backend/middlewares/validation.ts:291` | `export * from "../validators/product-faq.validator";` | `src/backend/validators/product-faq.validator.ts` | Validation middleware compilation fails. |
| 9 | `src/backend/controllers/media.controller.ts:3` | `import { MediaUsageService } from '../services/media-usage.service';` | `src/backend/services/media-usage.service.ts` | Media controller compilation fails. |
| 10 | `src/backend/routes/storefront/account.routes.ts:23,32` | `import { ... } from "../../controllers/storefront/account-mobile.controller";` | `src/backend/controllers/storefront/account-mobile.controller.ts` | Account router compilation fails. |
| 11 | `src/backend/routes/storefront/auth.routes.ts:18` | `import { ... } from "../../controllers/storefront/auth-mobile.controller";` | `src/backend/controllers/storefront/auth-mobile.controller.ts` | Storefront auth router compilation fails. |
| 12 | `src/App.tsx:68` | `import { ArchiveList } from './pages/admin/archive/ArchiveList';` | `src/pages/admin/archive/ArchiveList.tsx` | Frontend SPA bundling fails (`vite build`). |
| 13 | `src/pages/admin/orders/OrderDetail.tsx:35-36` | `import { PathaoShipmentCard, DeliveryBillingSection } ...` | `src/components/admin/orders/*` | Order detail page bundling fails. |
| 14 | `src/pages/admin/settings/Settings.tsx:16` | `import { CourierProvidersSection } ...` | `src/components/admin/settings/CourierProvidersSection.tsx` | Settings page bundling fails. |
| 15 | `src/pages/products/ProductForm.tsx:9` | `import { ProductFaqsTab } from '@/src/components/products/ProductFaqsTab';` | `src/components/products/ProductFaqsTab.tsx` | Product form page bundling fails. |

---

## 5. Performance & Scalability Bottlenecks

1. **Inventory Low Stock Query Runtime Failure**:
   - `src/backend/controllers/inventory.controller.ts:9` attempts to query `lte: prisma.inventory.fields.lowStockThreshold`. In Prisma 5, this throws a runtime exception, crashing `GET /api/v1/inventory/low-stock`.
2. **Missing In-Memory Pagination on Facet Aggregations**:
   - `src/backend/services/storefront/search.service.ts: getFacets()` loads matching category and brand counts across all matching products. While accurate for small inventories, large catalogs (50,000+ SKUs) will experience elevated query latencies without caching or materialized views.
3. **N+1 Query Pattern in Inventory Valuation**:
   - `src/backend/controllers/inventory.controller.ts:54-78`: Fetches all inventory records and iterates through them in JavaScript to compute `totalValue`. This should be replaced with a database aggregation (`_sum` or raw SQL `SUM(quantityAvailable * price)`).
4. **Package.json Test Target Mismatch**:
   - Script `"test": "tsx --test src/backend/__tests__/*.test.ts"` references a non-existent folder. Actual test suites reside in `src/backend/routes/storefront/__tests__/` and `src/backend/dtos/storefront/__tests__/`.
