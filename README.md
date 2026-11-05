# Enterprise eCommerce Platform Documentation

Welcome to the production-grade, enterprise-ready **eCommerce & OMS Platform**. Built with React 19, Express, TypeScript, Prisma ORM, and PostgreSQL, this application offers a full-stack solution with multi-role access control, advanced order management, multi-gateway payments, fulfillment, RMA returns, refunds, content management (CMS), and real-time analytics.

---

## 1. Project Overview
This platform serves as a complete digital commerce ecosystem with two primary interfaces:
1. **Storefront SPA**: High-performance customer shopping interface featuring dynamic product discovery, search with faceted filtering, multi-item cart, multi-step checkout, customer portal, address book, order tracking, RMA return requests, and wishlist.
2. **Admin Panel & OMS**: Full-featured back-office management console for product catalog, variant attributes, stock inventory across warehouses, order fulfillment, coupon/promotion engine, customer CRM, content management (pages, blogs, banners, popups, FAQs), role-based permissions (RBAC), audit logging, system settings, and analytics integration (GA4).

---

## 2. Key Features
- **Authentication & Security**: Enterprise JWT with HTTP-only cookie support, refresh token rotation, strict RBAC, rate-limiting, Helmet CSP, and recursive XSS payload sanitization.
- **Product Catalog**: Multi-variant SKU support, attributes, categories, brands, tags, images, SEO metadata, and dynamic price rules.
- **Inventory & Warehouse**: Multi-warehouse stock tracking, stock reserve/release mechanics during checkout, and adjustment audit logs.
- **Order Management System (OMS)**: Order state lifecycle (Pending, Processing, Shipped, Delivered, Cancelled), timeline logs, admin order notes, shipping labels, fulfillment, returns (RMA), and refunds.
- **Payments & Webhooks**: Multi-provider support (Stripe, PayPal, Razorpay, SSLCommerz, Bkash) with webhook verification and transactional logging.
- **Content Management System (CMS)**: Page builder, blog articles, category/tag taxonomy, banner slots, popups, media library asset manager, and FAQ categories.
- **Analytics & Reporting**: GA4 integration, real-time event tracking, revenue/order analytics, top products, customer acquisition charts, and sales funnels.

---

## 3. Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, React Router v7 |
| **State & Data Fetching** | TanStack React Query v5, Zustand v5 |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Motion (Framer), Radix UI |
| **Backend Runtime** | Node.js v22 (ESM), Express v4 |
| **Database & ORM** | PostgreSQL 15+, Prisma ORM v5.22 |
| **Validation & Security** | Zod v4, Bcrypt.js, JsonWebToken, Express Rate Limit, Helmet v8 |
| **Analytics & AI** | Google Analytics 4 (Measurement Protocol & Data API), Gemini AI API |
| **Build & Tooling** | Vite v6, ESBuild, TSX, Swagger UI |

---

## 4. High-Level Architecture Diagram

```
                     +---------------------------------+
                     |     Browser Client / SPA       |
                     |  (React 19, Vite, Tailwind CSS) |
                     +---------------------------------+
                                      |
                                  HTTPS / REST
                                      |
                                      v
                     +---------------------------------+
                     |   Express API Gateway Server    |
                     |   (Port 3000, Helmet, CORS)     |
                     +---------------------------------+
                       /                             \
                      /                               \
                     v                                 v
   +------------------------------------+   +------------------------------------+
   |    Admin API Routes (/api/v1)      |   |  Storefront API (/api/storefront/v1)|
   |  - RBAC & Permission Middleware    |   |  - Customer Auth Middleware        |
   |  - OMS, Catalog, Users, Settings   |   |  - Catalog, Cart, Checkout, RMA    |
   +------------------------------------+   +------------------------------------+
                      \                               /
                       \                             /
                        v                           v
                     +---------------------------------+
                     |       Prisma ORM Layer          |
                     +---------------------------------+
                                      |
                                      v
                     +---------------------------------+
                     |      PostgreSQL Database        |
                     +---------------------------------+
```

---

## 5. Directory Structure
```
.
├── prisma/               # Database Schema, Seeders, Migrations
├── src/
│   ├── backend/          # Node.js Express Backend Architecture
│   │   ├── config/       # Logger, Swagger, Environment Config
│   │   ├── controllers/  # Admin & Storefront API Controllers
│   │   ├── dtos/         # Data Transfer Objects
│   │   ├── middlewares/  # Auth, Security, Rate-Limiters, Error Handlers
│   │   ├── routes/       # Admin & Storefront Express Routers
│   │   ├── services/     # Business Domain Services
│   │   ├── utils/        # JWT, Password, Encryption Helpers
│   │   └── validators/   # Zod Request Validation Schemas
│   ├── components/       # UI Components (Admin & Storefront)
│   ├── context/          # React Auth & Theme Contexts
│   ├── hooks/            # Custom Hooks (UseAuth, UseCart, etc.)
│   ├── lib/              # Utility Functions (cn, formatters)
│   ├── pages/            # Admin & Storefront Page Views
│   ├── services/         # Frontend API Service Clients
│   └── types.ts          # Global TypeScript Interfaces
├── docs/                 # Complete Platform Documentation
├── server.ts             # Express Server Entry Point
├── vite.config.ts        # Vite Bundler Configuration
├── package.json          # Dependency Manifest & Scripts
└── .env.example          # Environment Variables Template
```

---

## 6. Local Installation & Setup

### Prerequisites
- Node.js >= 20.x (Node 22 recommended)
- PostgreSQL >= 15.x
- npm >= 10.x

### Quickstart Commands
```bash
# 1. Clone the repository
git clone https://github.com/your-org/ecommerce-platform.git
cd ecommerce-platform

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 4. Run database migrations and seed initial data
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start the development server
npm run dev
```

Access the server at `http://localhost:3000`.

---

## 7. Environment Variables Reference

Key environment variables specified in `.env.example`:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string with public schema |
| `JWT_SECRET` | Yes | Secret key for signing JSON Web Tokens (min 32 chars) |
| `JWT_EXPIRES_IN` | Yes | Access token expiry duration (e.g. `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token expiry duration (e.g. `7d`) |
| `COOKIE_SECRET` | Yes | Secret key for signing HTTP cookies |
| `ADMIN_EMAIL` | Yes | Initial Super Admin user email |
| `ADMIN_PASSWORD` | Yes | Initial Super Admin password |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS allowed origin URLs |

---

## 8. Prisma Database Commands
```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name <migration_name>

# Apply pending migrations in production
npx prisma migrate deploy

# Seed initial roles, permissions, admin user, and settings
npx prisma db seed

# Launch Prisma Studio GUI
npx prisma studio
```

---

## 9. Development Workflow & Build Process

- **Start Development**: `npm run dev` (runs `tsx server.ts` with hot module reloads)
- **Code Verification**: `npm run lint` (TypeScript strict type check `tsc --noEmit`)
- **Production Build**: `npm run build` (runs `vite build` for React assets and `esbuild server.ts` to output single bundled CJS server `dist/server.cjs`)
- **Production Launch**: `npm run start` (executes `node dist/server.cjs`)

---

## 10. Documentation Index

Detailed documentation files are available under the `docs/` directory:

- [Architecture & System Design](docs/architecture.md)
- [Project Directory Structure](docs/project-structure.md)
- [Development Guide](docs/development-guide.md)
- [Coding Standards & Conventions](docs/coding-standards.md)
- [Environment Variables Guide](docs/environment-variables.md)
- [Database Schema & ERD](docs/database.md)
- [Security Architecture & Rules](docs/security.md)
- **Deployment Guides**:
  - [Ubuntu VPS Deployment](docs/deployment/vps-deploy.md)
  - [Docker & Compose Guide](docs/deployment/docker-deploy.md)
  - [PM2 Process Management](docs/deployment/pm2-deploy.md)
  - [Nginx Reverse Proxy Setup](docs/deployment/nginx-reverse-proxy.md)
  - [SSL Certbot Automation](docs/deployment/ssl-certbot.md)
  - [Database Backup & Restoration](docs/deployment/backup-restore.md)
- **API Reference**:
  - [Public Storefront API](docs/api/public-api.md)
  - [Customer Portal API](docs/api/customer-api.md)
  - [Admin Backend API](docs/api/backend-api.md)
  - [Authentication Flow](docs/api/authentication.md)
  - [Payment Webhooks](docs/api/webhooks.md)
  - [Postman Collection](docs/api/postman-collection.md)
- **Domain Modules**:
  - [Auth Module](docs/modules/auth.md) | [Customers](docs/modules/customers.md) | [Catalog](docs/modules/catalog.md) | [Inventory](docs/modules/inventory.md)
  - [Cart Engine](docs/modules/cart.md) | [Checkout Engine](docs/modules/checkout.md) | [Payments](docs/modules/payments.md) | [Refunds](docs/modules/refunds.md)
  - [Returns (RMA)](docs/modules/returns.md) | [Shipments](docs/modules/shipments.md) | [Notifications](docs/modules/notifications.md) | [Analytics](docs/modules/analytics.md)
  - [Platform Settings](docs/modules/settings.md) | [CMS Engine](docs/modules/cms.md)
- **Admin Panel Guides**:
  - [Dashboard](docs/admin-panel/dashboard.md) | [Users](docs/admin-panel/users.md) | [Roles & Permissions](docs/admin-panel/roles.md) | [Orders (OMS)](docs/admin-panel/orders.md)
  - [Products](docs/admin-panel/products.md) | [Customers](docs/admin-panel/customers.md) | [Shipments](docs/admin-panel/shipments.md) | [Refunds](docs/admin-panel/refunds.md)
- **Troubleshooting**:
  - [Common Errors](docs/troubleshooting/common-errors.md) | [Prisma Issues](docs/troubleshooting/prisma.md) | [PostgreSQL Tuning](docs/troubleshooting/postgres.md)
  - [Deployment Fixing](docs/troubleshooting/deployment.md) | [Performance Optimization](docs/troubleshooting/performance.md)
