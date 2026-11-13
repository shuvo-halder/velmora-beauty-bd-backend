# Enterprise Architecture Specification: Velmora Beauty Platform

## 1. Executive Summary & System Overview

The **Velmora Beauty Platform** is a unified monorepo containing a full-scale digital commerce engine and enterprise Operations Management System (OMS). It incorporates:
1. **Express.js API Gateway & Business Engine**: Modular backend service providing dual API surfaces:
   - **Admin Management API** (`/api/v1`): Secured via strict Role-Based Access Control (RBAC), multi-role permissions, audit logging, and transactional order/inventory processing.
   - **Storefront API** (`/api/storefront/v1` and `/api/v1/storefront/v1`): Public and customer-authenticated digital commerce surface providing catalog discovery, faceted search, guest/customer carts, multi-step checkout, payment initiation, returns, and reviews.
2. **React 19 Administrative Dashboard**: Modern Single-Page Application (SPA) compiled with Vite v6 and Tailwind CSS v4, supporting real-time analytics with Recharts, rich text product editing with TipTap, granular permission matrix management, and operational queues.
3. **Prisma ORM & PostgreSQL Database**: Highly relational data layer comprising 53 database models, 13 enums, row-level locking for concurrent transactions, and soft-delete capabilities.

---

## 2. Actual Verified Technology Stack

| Layer | Technologies & Libraries | Version / Specification |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (ESM), Express.js | Node 22 (ESM), Express 4.21.2 |
| **Database & ORM** | PostgreSQL 15+, Prisma ORM | Prisma Client & CLI v5.22.0 |
| **Database Concurrency** | Pessimistic Row-Level Locking | PostgreSQL `SELECT ... FOR UPDATE` via `tx.$executeRaw` |
| **API Architecture** | RESTful JSON, Dual API Gateway | Admin (`/api/v1`) & Storefront (`/api/storefront/v1`) |
| **Frontend Framework** | React.js (TypeScript) | React 19.0.1, React DOM 19.0.1 |
| **Client Routing** | React Router | React Router DOM v7.18.2 |
| **Client State & Cache** | TanStack React Query, Zustand | React Query v5.101.4, Zustand v5.0.14 |
| **Styling & Design System** | Tailwind CSS, Radix UI Primitives | Tailwind CSS v4.1.14, Radix UI React Slot/Dialog/Dropdown |
| **Icons & Visuals** | Lucide React, Motion (Framer), Recharts | Lucide 0.546.0, Motion 12.23.24, Recharts 3.10.1 |
| **Rich Text Engine** | TipTap Core & Extensions | TipTap v3.31.4 (Starter Kit, Image, Table, Color, Link) |
| **Authentication** | JWT (JsonWebToken), Bcrypt.js, Crypto | JWT 9.0.3, Bcrypt.js 3.0.3, Crypto SHA-256/HMAC |
| **Validation & Sanitization**| Zod, DOMPurify, Sanitize-HTML | Zod v4.4.3, Sanitize-HTML 2.17.7, DOMPurify 3.4.14 |
| **Security & Middleware** | Helmet, Express Rate Limit, CORS | Helmet 8.3.0, Express Rate Limit 8.6.2, CORS 2.8.6 |
| **File Storage & Media** | Multer (Memory Storage), Cloudinary SDK | Multer 2.2.0, Cloudinary v2.10.0 |
| **Email & Notifications** | Nodemailer | Nodemailer 9.0.5 (SMTP with Port 587 STARTTLS) |
| **Analytics & AI** | Google Analytics 4, Gemini AI | @google-analytics/data 7.0.0, @google/genai 2.4.0 |
| **Build & Tooling** | Vite, ESBuild, TSX, TypeScript | Vite 6.2.3, ESBuild 0.25.0, TSX 4.21.0, TS 5.8.2 |
| **API Documentation** | Swagger JSDoc, Swagger UI Express | Swagger JSDoc 6.3.0, Swagger UI Express 5.0.1 |

---

## 3. High-Level System Architecture Diagram

```
                                  +-------------------------------------------------------------+
                                  |                     End-User Clients                        |
                                  |   [Admin Portal SPA]                [Storefront Customers]  |
                                  +-------------------------------------------------------------+
                                                |                                      |
                                  HTTPS (Bearer JWT / Admin)             HTTPS (Bearer JWT / Guest)
                                                |                                      |
                                                v                                      v
+---------------------------------------------------------------------------------------------------------------+
|                                      Express.js Server Application (server.ts)                                |
|                                                                                                               |
|  [Global Middleware Pipeline]:                                                                                |
|  - Trust Proxy (Reverse Proxy IP resolution)                                                                  |
|  - Helmet HTTP Security Headers (CSP, HSTS, noSniff, COOP, CORP)                                              |
|  - CORS Config (Dynamic origin matching, credentials, custom headers: X-Cart-Session-Id, X-Session-Id)         |
|  - Express JSON Body Parser (rawBody byte buffer capture for payment webhook signature validation)           |
|                                                                                                               |
|  -----------------------------------------------------------------------------------------------------------  |
|                                                                                                               |
|  [ADMIN API ROUTER: /api/v1]                               [STOREFRONT API ROUTER: /api/storefront/v1]        |
|  - Global Rate Limiter (300 req/min)                       - Storefront Request Logger                        |
|  - Recursive Input Sanitizer (XSS / Prototype Pollution)   - Response Formatter Middleware                    |
|  - Swagger UI Documentation (/api/v1/docs)                 - Public SEO, Sitemap & Robots (/sitemap, /robots) |
|  - Health Endpoint (/api/v1/health)                        - Public Catalogs (Products, Categories, Brands)   |
|  - Authentication Router (/auth)                           - Faceted Search Engine (/search, /search/facets)  |
|  - RBAC Protected Routers:                                 - Guest / Auth Cart Engine (/cart)                 |
|    * Products, Categories, Brands, Attributes, Inventory   - Multi-step Checkout (/checkout)                  |
|    * Orders, Payments, Refunds, Returns, Shipments         - Customer Auth & Profiles (/auth, /account)       |
|    * Users, Roles, Permissions, Sessions, Audit Logs       - Payment Gateway Webhooks (/payment/webhook/*)    |
|    * CMS Pages, Blog, FAQs, Media Library, SEO, Settings   - Customer Reviews & RMA (/reviews, /returns)      |
|                                                                                                               |
|  -----------------------------------------------------------------------------------------------------------  |
|                                                                                                               |
|  [Central Error Handling Middleware]:                                                                         |
|  - Dual Error Serialization: Admin ({success: false, error}) vs Storefront ({status: "error", message})       |
|  - Prisma P2002/P2025/P2003 code translation to HTTP 409/404/400                                             |
|  - Production error message sanitization (stack and path stripping)                                          |
|                                                                                                               |
|  -----------------------------------------------------------------------------------------------------------  |
|                                                                                                               |
|  [Development & Static Assets Delivery]:                                                                      |
|  - Non-production: Vite Dev Server Middleware (createViteServer, HMR, SPA appType)                           |
|  - Production: express.static('dist') + fallback wildcard handler serving dist/index.html                     |
+---------------------------------------------------------------------------------------------------------------+
                                                |
                                    Prisma Client Instance (src/backend/config/db.ts)
                                                |
                                                v
+---------------------------------------------------------------------------------------------------------------+
|                                      PostgreSQL 15+ Relational Database                                       |
|                                                                                                               |
|  - 53 Data Models across 8 Core Domains                                                                       |
|  - Soft Deletes (deletedAt timestamp pattern across 27 models)                                                |
|  - Pessimistic Row Locks (FOR UPDATE) for Checkout, Payments, and Refunds                                     |
|  - Idempotency Constraints (Shipment.idempotencyKey, PaymentWebhookLog.provider_eventId)                     |
+---------------------------------------------------------------------------------------------------------------+
```

---

## 4. Complete Project Directory Layout

```
.
├── .env.example                               # Environment variable blueprint
├── .gitignore                                 # Git ignore patterns
├── index.html                                 # Single-Page Application HTML entry point
├── metadata.json                              # Project metadata descriptor
├── package.json                               # Dependencies manifest, npm scripts, Prisma config
├── package-lock.json                          # Pinned dependency lockfile
├── README.md                                  # Platform overview & setup documentation
├── server.ts                                  # Express API bootstrap & Vite dev server entry
├── tsconfig.json                              # TypeScript strict compiler configuration
├── vite.config.ts                             # Vite configuration with @ path alias to root
├── docs/                                      # Master Architecture Documentation
│   ├── ARCHITECTURE.md                        # This system architecture specification
│   ├── DATABASE-ARCHITECTURE.md               # Prisma schema & relational models analysis
│   ├── API-DOCUMENTATION.md                   # Verified REST API endpoints and contracts
│   ├── ADMIN-PANEL-ARCHITECTURE.md            # React 19 UI structure, routing, and state
│   ├── CODEBASE-ANALYSIS.md                   # Technical debt, security audit, and bug catalog
│   ├── IMPLEMENTATION-STATUS.md               # Feature matrix and module readiness
│   └── AI-HANDOFF.md                          # Future agent developer guide and locked rules
├── prisma/
│   ├── migration.sql                          # Raw initialization migration SQL script
│   ├── schema.prisma                          # Complete Prisma schema definition (1,621 lines)
│   ├── seed.ts                                # Seeder script (Permissions, Roles, Admin, Settings)
│   └── migrations/
│       ├── 20260820000000_add_pending_email/
│       │   └── migration.sql                  # Pending email verification migration
│       └── 20260821000000_add_return_item_warehouse_id/
│           └── migration.sql                  # ReturnItem warehouseId link migration
├── tests/
│   └── postgresql-integration.test.ts         # Direct PostgreSQL integration suite for reviews
└── src/
    ├── App.tsx                                # Root React component & route tree
    ├── index.css                              # Tailwind CSS v4 styling entry point
    ├── main.tsx                               # DOM mounting entry point with StrictMode
    ├── backend/
    │   ├── config/
    │   │   ├── cloudinary.ts                  # Cloudinary v2 SDK configuration
    │   │   ├── db.ts                          # Prisma Client instance & query logging
    │   │   ├── env.ts                         # Zod environment variable parsing & validation
    │   │   ├── logger.ts                      # Winston logger with colorized console output
    │   │   └── swagger.ts                     # OpenAPI / Swagger definition and spec builder
    │   ├── controllers/                       # Express request handlers for Admin API (37 files)
    │   │   ├── storefront/                    # Request handlers for Storefront API (23 files)
    │   ├── dtos/
    │   │   └── storefront/                    # Storefront DTOs, mappers, and search schemas
    │   ├── middlewares/
    │   │   ├── auth.ts                        # JWT verification, requireAuth, requirePermission
    │   │   ├── customerAuth.ts                # Customer JWT auth (requireCustomerAuth, optional)
    │   │   ├── errorHandler.ts                # Central error handler with Prisma & Zod translation
    │   │   ├── rateLimiter.ts                 # Express rate limiting definitions
    │   │   ├── validation.ts                  # Zod validation middleware & recursive XSS sanitizer
    │   │   └── storefront/                    # Storefront logging & response formatting middleware
    │   ├── routes/                            # Express routers for Admin API (37 files)
    │   │   └── storefront/                    # Express routers for Storefront API (26 files)
    │   ├── services/                          # Business logic domain services (19 files)
    │   │   ├── email/
    │   │   │   └── templates.ts               # HTML email templates for transactional messaging
    │   │   └── storefront/                    # Business services for Storefront API (18 files)
    │   ├── utils/                             # Core utilities (AppError, asyncHandler, tokens)
    │   └── validators/                        # Zod request validation schemas (16 files)
    ├── components/
    │   ├── AnalyticsScriptLoader.tsx          # Dynamic GA4 / GTM script injector
    │   ├── admin/                             # Admin modals, user/role management components
    │   ├── common/                            # ErrorBoundary, ConfirmDialog, AccessDenied
    │   ├── layout/                            # AdminLayout, Header, Sidebar, Route Guards
    │   ├── products/                          # ProductMediaTab component
    │   └── ui/                                # Reusable UI primitives (Button, Card, Table, etc.)
    ├── context/
    │   ├── AuthContext.tsx                    # React auth context, session state, permissions
    │   └── BrandingContext.tsx                # Dynamic white-label branding, logos, site metadata
    ├── hooks/
    │   └── useGA4.ts                          # Google Analytics 4 event hook
    ├── lib/
    │   ├── api.ts                             # Axios client instance, auth interceptor, token refresh
    │   ├── apiError.ts                        # Normalized API error parser
    │   ├── ga4-ecommerce.ts                   # GA4 eCommerce parameter validation
    │   ├── ga4.ts                             # GA4 runtime tracking helpers
    │   ├── notify.ts                          # Toast notification facade (Sonner)
    │   ├── permissions.ts                     # Client-side permission helper functions
    │   └── utils.ts                           # Tailwind class merging utility (clsx + twMerge)
    ├── pages/                                 # Admin Dashboard & Module views (48 files)
    │   ├── admin/                             # Nested back-office admin page views
    │   └── auth/                              # Authentication pages (Login, Register, Passwords)
    ├── services/                              # Frontend HTTP client service functions (34 files)
    ├── types/
    │   └── dashboard.ts                       # Dashboard KPI and metric TypeScript interfaces
    └── utils/
        ├── analytics.ts                       # Chart formatting & metric calculations
        └── currency.ts                        # Currency display formatters (BDT)
```

---

## 5. Backend Architecture & Request Flow

### 5.1 Bootstrap Lifecycle (`server.ts`)
1. **Environment Initialization**: Dotenv loads `.env`, followed by `src/backend/config/env.ts` validating critical production variables (`DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `ALLOWED_ORIGINS`).
2. **Background Automation Initialization**:
   - `startRefreshTokenCleanupJob()`: Executes every 24 hours to delete expired/revoked admin refresh tokens.
   - `UploadCleanupService.startCleanupJob()`: Runs hourly to purge orphaned Cloudinary uploads trapped in `PENDING` status.
3. **HTTP Security & Reverse Proxy Configuration**:
   - `app.set("trust proxy", ...)` enables correct IP detection behind Nginx, Apache, or Google Cloud Run.
   - Helmet injects strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Content-Type-Options: nosniff, Cross-Origin-Opener-Policy (COOP), and Permissions-Policy.
   - Dynamic CORS middleware matches origins against `ALLOWED_ORIGINS` with credentials support.
   - `express.json` captures `rawBody` as a `Buffer` on incoming requests for cryptographic webhook signature verification (Stripe, bKash, SSLCommerz).
4. **API Routing**:
   - `/api/v1` mounts the Admin router protected by global rate limiting (300 req/min) and recursive sanitization.
   - `/api/storefront/v1` mounts the Storefront router with dedicated request logging and response formatting.
5. **Vite SPA Middleware / Production Serving**:
   - In development: Vite runs in middleware mode (`createViteServer({ server: { middlewareMode: true }, appType: "spa" })`).
   - In production: Express statically serves `dist/` with a wildcard fallback to `dist/index.html`.
6. **Startup Data Migrations**:
   - `ProductMediaService.migrateExistingProductMedia()` executes asynchronously without blocking the server listener.

### 5.2 Layered Request Execution Pipeline
A standard authenticated request flows through the following layers:

```
[Browser / Client]
       │
       ▼
[Express Server Middleware] (Helmet -> CORS -> BodyParser -> GlobalLimiter -> SanitizeMiddleware)
       │
       ▼
[Express Router] (e.g. /api/v1/orders)
       │
       ▼
[Authentication Middleware] (requireAuth -> Verify JWT -> Fetch DB User -> Attach req.user)
       │
       ▼
[Authorization Middleware] (requirePermission("Orders", "write") -> Evaluate RBAC)
       │
       ▼
[Parameter Validation Middleware] (validateParamsUUID(["id"]) -> validateBody(Schema))
       │
       ▼
[Controller] (Extract parameters -> Invoke Business Service)
       │
       ▼
[Domain Service Layer] (Execute Business Logic -> Run State Machine Checks)
       │
       ▼
[Database Transaction] (prisma.$transaction -> tx.$executeRaw Row Lock -> Mutate Records)
       │
       ▼
[Audit & Analytics Side Effects] (AuditService.createLog -> MeasurementProtocol -> EmailService)
       │
       ▼
[HTTP Response] (res.status(200).json({ success: true, data }))
```

---

## 6. Frontend Architecture (React Admin Panel)

### 6.1 Core Architectural Principles
- **React 19 & Vite 6**: State-of-the-art frontend toolchain with instant Hot Module Replacement (HMR).
- **Declaration Routing (React Router v7)**: Centralized route manifest in `src/App.tsx` wrapped in `<ProtectedRoute>` and `<RoutePermissionGuard>`.
- **Server Cache & Synchronization**: TanStack React Query v5 manages all server-state caching with:
  - Default `staleTime: 60,000ms` (1 minute).
  - Window focus refetch disabled to prevent unwanted network chatter.
  - Smart error retry skipping 401, 403, and 404 responses.
- **Dynamic White-Label Branding (`BrandingContext`)**: Site name, admin title, logo URLs, favicon, and primary theme colors are dynamically loaded from `BrandingSetting` in the database and applied across headers, sidebars, and document head.

### 6.2 Component Hierarchy & Layout
- `AdminLayout`: Renders persistent top navigation (`Header`), responsive navigation drawer (`Sidebar`), and main dynamic content container (`<Outlet />`).
- `Sidebar`: Dynamic accordion and collapsible navigation hierarchy that evaluates the logged-in user's effective permissions and automatically filters out unauthorized menu entries.
- `PermissionGuard` & `RoutePermissionGuard`: Declarative UI guards that hide action buttons or block full route access if the active session lacks the required `{ module, action }` permission pair.
- `AppToaster`: Sonner-powered notification toaster supporting rich status alerts across all admin operations.

---

## 7. Dual API Communication & Integration Architecture

The platform deliberately employs two distinct API contracts:

### 7.1 Admin API Contract (`/api/v1`)
- **Base URL**: `/api/v1` (configured in `src/lib/api.ts`).
- **Standard Success Response**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
  }
  ```
- **Standard Error Response**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request payload",
      "details": [{ "field": "email", "message": "Invalid email address" }]
    }
  }
  ```

### 7.2 Storefront API Contract (`/api/storefront/v1`)
- **Base URL**: `/api/storefront/v1` (and backward-compatible alias `/api/v1/storefront/v1`).
- **Standard Success Response**:
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```
- **Standard Error Response**:
  ```json
  {
    "status": "error",
    "message": "Error description",
    "errors": [{ "field": "quantity", "message": "Exceeds available stock" }]
  }
  ```

---

## 8. External Integrations Architecture

1. **Payment Gateways**:
   - **Stripe**: Credit card processing via Elements and webhook signature verification using HMAC-SHA256 (`stripe-signature`).
   - **bKash**: Direct merchant API token authorization, URL-based checkout redirection, and webhook capture.
   - **Nagad**: Public/private key encrypted merchant transaction initiation and IPN callbacks.
   - **SSLCommerz**: Multi-channel Bangladeshi gateway supporting card, MFS, and internet banking with IPN validation.
   - **Cash on Delivery (COD)**: Native zero-fee offline payment flow.
2. **Cloud Media Management**:
   - **Cloudinary**: High-performance image optimization, automatic thumbnail generation, responsive breakpoints, and automated orphaned upload purge.
3. **Courier & Logistics (Pathao)**:
   - Automated delivery consignment dispatching, tracking URL generation, Cash-on-Delivery collection matching, and polling/webhook status synchronization.
4. **Analytics & Search Engines**:
   - **Google Analytics 4**: Client-side measurement (`gtag.js`), server-side Measurement Protocol (`/mp/collect`), and Google Analytics Data API reporting for the dashboard.
   - **Google Merchant Center**: Automated XML RSS 2.0 product feed generation at `/api/storefront/v1/merchant/feed.xml`.
5. **Transactional Messaging (SMTP)**:
   - Dynamic database-driven SMTP engine (`SMTPSetting`) with STARTTLS port 587 enforcement and multi-template HTML generation.
