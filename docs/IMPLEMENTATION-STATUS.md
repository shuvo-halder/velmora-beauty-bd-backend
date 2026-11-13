# Implementation Status & Module Readiness Matrix

## 1. Readiness Classification Methodology

Each module in the **Velmora Beauty Platform** is assessed and categorized into one of four distinct operational readiness tiers:
- **Fully Implemented**: Database models, backend routes, controllers, services, validation, and corresponding frontend UI pages exist, are cleanly wired, and execute as designed.
- **Partially Implemented**: Core functionality operates, but auxiliary features, specific endpoints, or edge case workflows are stubbed, missing, or suffer from minor permission/parameter mismatches.
- **Incomplete / Blocked**: Critical code files or dependencies are missing from disk (causing broken imports or runtime errors), blocking the module or the entire server from booting without remediation.
- **Missing / Not Implemented**: Advertised in navigation, routing, or documentation, but completely absent from the codebase.

---

## 2. Master Module Implementation Matrix

| Module Domain | Feature / Submodule | Database Schema | Backend API | Admin UI | Storefront API | Status | Primary Notes / Blockers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **IAM & Security** | Admin Authentication | Yes | Yes | Yes | N/A | **Partially Implemented** | Working, but `logout` fails to send `refreshToken`, leaving DB tokens active. |
| | Roles & Permissions | Yes | Yes | Yes | N/A | **Fully Implemented** | Comprehensive matrix with lockout prevention. |
| | User Management | Yes | Yes | Yes | N/A | **Fully Implemented** | Full CRUD, status toggle, force logout. |
| | Public Admin Registration| Yes | No | Yes | N/A | **Broken** | `Register.tsx` calls non-existent `POST /users/register`. |
| | Active Sessions | Yes | Yes | Yes | Yes | **Fully Implemented** | Customer session inspection and revocation. |
| | Audit Logs | Yes | Yes | Yes | N/A | **Fully Implemented** | Full activity logging, filtering, CSV export. |
| **Catalog** | Products & Variants | Yes | Yes | Yes | Yes | **Partially Implemented** | Core CRUD works; broken import on `product-faq.controller`. |
| | Categories Hierarchy | Yes | Yes | Yes | Yes | **Fully Implemented** | Parent-child taxonomy, SEO fields. |
| | Brands | Yes | Yes | Yes | Yes | **Fully Implemented** | Full CRUD with logo management. |
| | Attributes & Values | Yes | Yes | Yes | Yes | **Fully Implemented** | Variant attribute combination mapping. |
| | Product Media Gallery | Yes | Yes | Yes | Yes | **Partially Implemented** | Media upload works; auto-migration on boot; `ProductMediaTab` operational. |
| | Product FAQs | Yes | No | No | No | **Incomplete / Missing**| `product-faq.controller`, validator, and UI tab missing. |
| | Stock Inventory | Yes | Yes | Yes | Yes | **Partially Implemented** | `Inventory.tsx` works; `inventory.controller.ts:9` has runtime syntax bug. |
| | Warehouses | Yes | Partial | No | N/A | **Partially Implemented** | DB model exists; direct CRUD UI is missing. |
| **Orders & Sales** | Order Management (OMS) | Yes | Yes | Yes | Yes | **Partially Implemented** | Order state machine works; `OrderDetail.tsx` has broken subcomponent imports. |
| | Order Notes & Timeline | Yes | Yes | Yes | N/A | **Fully Implemented** | Timeline event logging and staff internal notes. |
| | Staff Assignment | Yes | Yes | Yes | N/A | **Fully Implemented** | Orders can be assigned to admin staff. |
| | Shipments & Fulfillment| Yes | Broken | Yes | Broken | **Incomplete / Blocked** | `shipment.service.ts` references non-existent courier registry. |
| | Pathao Courier Sync | Yes | No | No | No | **Incomplete / Blocked** | `pathao.routes.ts` & `pathao-sync.service.ts` missing. |
| | RMA Returns | Yes | Yes | Yes | Yes | **Partially Implemented** | Workflow works; backend route checks `Orders` permission instead of `Returns`. |
| | Customer Refunds | Yes | Yes | Yes | Yes | **Partially Implemented** | Row-locked workflow works; backend route checks `Orders` permission. |
| | Payment Transactions | Yes | Yes | Yes | Yes | **Fully Implemented** | Multi-provider logging with webhook audit trail. |
| **Storefront Flow**| Cart Engine | Yes | N/A | N/A | Yes | **Fully Implemented** | Guest sessions, auto-merge on login, stock check. |
| | Checkout Engine | Yes | N/A | N/A | Yes | **Fully Implemented** | Multi-step checkout, atomic inventory deduction, coupons. |
| | Customer Auth & OTP | Yes | N/A | N/A | Yes | **Partially Implemented** | Email auth works; mobile auth controller missing from disk. |
| | Customer Profile & Book| Yes | N/A | N/A | Yes | **Fully Implemented** | Profile, multiple addresses, password changes. |
| | Customer Wishlist | Yes | N/A | N/A | Yes | **Fully Implemented** | Add/remove items with customer isolation. |
| | Customer Reviews | Yes | Yes | Yes | Yes | **Fully Implemented** | Verified purchase checks, guest mobile verification. |
| **Marketing & CMS**| Coupons Engine | Yes | Yes | Yes | Yes | **Fully Implemented** | Fixed, percentage, free shipping with usage limits. |
| | Promotion Rules Engine | Yes | Yes | Yes | Yes | **Fully Implemented** | Buy X Get Y, bundle discounts, auto-evaluation. |
| | Marketing Campaigns | Yes | Yes | Yes | Yes | **Fully Implemented** | Campaign creation with scheduled status. |
| | Banners & Popups | Yes | Yes | Yes | Yes | **Fully Implemented** | Active window filters and priority sorting. |
| | CMS Pages & Versioning | Yes | Yes | Yes | Yes | **Fully Implemented** | Page versions, status scheduling, rich text editor. |
| | Blog Module | Yes | Yes | Yes | Yes | **Fully Implemented** | Blog posts, categories, tags, scheduling. |
| | FAQ Management | Yes | Yes | Yes | Yes | **Fully Implemented** | Categorized global and product FAQs. |
| | Media Library Asset Mgr| Yes | Yes | Yes | N/A | **Partially Implemented** | Uploads work; `MediaUsageService` missing; permission bypass bug. |
| | Landing Pages Builder | Yes | Yes | Yes | Yes | **Fully Implemented** | JSON block-based landing page schemas. |
| **System** | General & Branding | Yes | Yes | Yes | Yes | **Fully Implemented** | Dynamic logos, site title, favicon, colors. |
| | SEO & Metatags | Yes | Yes | Yes | Yes | **Fully Implemented** | Dynamic robots.txt, sitemap.xml, Google Feed. |
| | SMTP Mail Engine | Yes | Yes | Yes | N/A | **Fully Implemented** | Database-driven SMTP settings, 20+ templates. |
| | Google Analytics 4 | Yes | Yes | Yes | Yes | **Fully Implemented** | Measurement Protocol and Data API integration. |
| | Central Archive (Trash)| Yes | No | No | N/A | **Missing** | Soft-delete models exist; router and UI page missing. |

---

## 3. High-Priority Remediation Roadmap

To bring the entire codebase into a 100% operational, buildable, and deployable state, the following sequence of remediation is required:

### Phase 1: Restore Compilation & Server Boot
1. Resolve broken imports in `server.ts` by removing or creating stub handlers for:
   - `pathao.routes.ts`
   - `archive.routes.ts`
   - `courier.routes.ts`
   - `pathao-sync.service.ts`
2. Remove or implement missing imports in `src/backend/routes/setting.routes.ts` (`CourierController`).
3. Remove or implement missing imports in `src/backend/services/shipment.service.ts` (`courierRegistry`).
4. Resolve missing `media-usage.service.ts` in `media.controller.ts` and `media.service.ts`.
5. Resolve missing `product-faq.controller.ts` and validator in `product.controller.ts`, `product.routes.ts`, and `validation.ts`.
6. Fix frontend broken imports in `src/App.tsx` (`ArchiveList`), `OrderDetail.tsx` (`PathaoShipmentCard`, `DeliveryBillingSection`), `Settings.tsx` (`CourierProvidersSection`), and `ProductForm.tsx` (`ProductFaqsTab`).

### Phase 2: Runtime Bug & Security Hotfixes
1. **Fix Inventory Query Syntax**:
   - Rewrite `src/backend/controllers/inventory.controller.ts:9` to remove `prisma.inventory.fields.lowStockThreshold`.
2. **Fix Silent Refresh Token Leak**:
   - Update `AuthContext.logout()` to pass `{ refreshToken }` to `/auth/logout`.
3. **Remove Media Library Permission Bypass**:
   - Delete `|| true` in `src/pages/admin/media/MediaLibrary.tsx:47-49`.
4. **Fix RBAC Permission Names in Sales Routes**:
   - Align `shipment.routes.ts`, `return.routes.ts`, `refund.routes.ts`, and `analytics.routes.ts` with their canonical module names.

### Phase 3: Feature Completion & Test Alignment
1. Implement the Central Archive (`/admin/archive`) to visualize and restore soft-deleted records across products, orders, customers, and CMS content.
2. Complete Courier and Pathao integration adapters for live consignment booking.
3. Update `package.json` test script to execute the actual test files in `src/backend/routes/storefront/__tests__/*.test.ts`.
