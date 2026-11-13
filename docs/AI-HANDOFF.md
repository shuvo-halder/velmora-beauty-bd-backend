# AI Agent Handoff & Architecture Lock

> **CRITICAL DIRECTIVE FOR FUTURE AI AGENTS**:
> Before modifying, generating, or refactoring ANY code in this repository, you **MUST** read and understand this document in its entirety. Do not make architectural assumptions. Follow the strict rules established below.

---

## 1. Project Overview & Operational Context

The **Velmora Beauty Platform** is a full-stack, enterprise-grade digital commerce and Operations Management System (OMS) contained in a single repository.
- **Backend**: Node.js v22 (ESM) + Express.js v4 + Prisma ORM v5.22 + PostgreSQL 15+.
- **Frontend Admin**: React 19 + TypeScript + Vite v6 + Tailwind CSS v4 + TanStack Query v5.
- **Storefront**: Dual API surface mounted under `/api/storefront/v1` serving headless consumer web storefronts or mobile apps.

---

## 2. Locked Architecture & Invariant Technical Decisions

The following architectural choices are **LOCKED** and must not be altered, migrated, or replaced:

1. **Dual API Surface Pattern**:
   - `/api/v1/*` is strictly reserved for the Admin Panel, utilizing `requireAuth`, `requirePermission`, and the `{ success: true, data: ... }` response structure.
   - `/api/storefront/v1/*` is strictly reserved for the Storefront, utilizing `optionalCustomerAuth` / `requireCustomerAuth`, and the `{ status: "success", data: ... }` response structure.
2. **Pessimistic Concurrency & Inventory Control**:
   - All state mutations involving financial calculations, payment transitions, refunds, and inventory stock changes **MUST** occur inside interactive database transactions (`prisma.$transaction`).
   - Row-level locking via PostgreSQL `SELECT ... FOR UPDATE` (using `tx.$executeRaw`) is the mandated standard for locking `Payment`, `Refund`, and `Coupon` records during critical concurrency operations.
3. **Soft-Delete Paradigm**:
   - Records across major models (`Product`, `Order`, `Customer`, `Category`, `Brand`, `Coupon`, `Page`, etc.) utilize soft-deletes via the `deletedAt: DateTime?` column.
   - Queries must explicitly include `where: { deletedAt: null }` unless specifically targeting archived/restorable records. Do not execute hard `DELETE` queries on core business models.
4. **Vite Development Integration**:
   - In development, Vite runs in middleware mode within the Express server (`server.ts`). Do not separate the Express server and Vite into conflicting standalone ports unless explicitly directed by the project lead.

---

## 3. Key File Paths & System Entry Points

| Responsibility | Authoritative File Path |
| :--- | :--- |
| **Application & Server Entry Point** | `server.ts` |
| **Prisma Schema Definition** | `prisma/schema.prisma` |
| **Database Seed Script** | `prisma/seed.ts` |
| **Environment Configuration & Zod Schema**| `src/backend/config/env.ts` |
| **Database Client Singleton** | `src/backend/config/db.ts` |
| **Central Error Handling Middleware** | `src/backend/middlewares/errorHandler.ts` |
| **RBAC Authorization Middleware** | `src/backend/middlewares/auth.ts` |
| **Permission Verification Service** | `src/backend/services/permission.service.ts` |
| **Input Validation & Sanitization** | `src/backend/middlewares/validation.ts` |
| **Admin Axios API Client** | `src/lib/api.ts` |
| **Admin Route & Layout Tree** | `src/App.tsx` |
| **Admin Auth Context** | `src/context/AuthContext.tsx` |
| **Dynamic White-Label Branding Context** | `src/context/BrandingContext.tsx` |
| **Admin Navigation & Sidebar** | `src/components/layout/Sidebar.tsx` |

---

## 4. Critical Business Rules & Invariants

1. **Inventory Reservation & Deduction**:
   - `quantityAvailable` represents physically available, uncommitted warehouse stock.
   - During checkout (`src/backend/services/storefront/checkout.service.ts`), `quantityAvailable` is atomically decremented.
   - If an order is cancelled (`order.controller.ts`), stock must be restored to the specific warehouse origin (`OrderItem.warehouseId`).
2. **Order State Machine Transitions**:
   - Once an order reaches `Cancelled` or `Returned`, its status can never be modified.
   - Orders cannot transition directly from `Shipped` to any state other than `Delivered`.
   - Orders cannot transition directly from `Delivered` to any state other than `Returned`.
   - Orders cannot be cancelled if already `Shipped` or `Delivered`.
3. **Refund Idempotency**:
   - Refunds can only be issued against payments in `PAID` status.
   - Sum of refunds (`refundedAmount` + pending refund requests) cannot exceed total `payment.amount`.
4. **RBAC & Permission Normalization**:
   - All permission comparisons are case-insensitive.
   - Action synonyms `create`, `update`, `edit`, `add`, and `patch` are automatically normalized to `write`.
   - `SuperAdmin` role automatically bypasses all permission checks in both backend middleware and frontend UI guards.

---

## 5. Known Issues & Immediate Blockers to Fix First

Prior to adding new features, the following blocking issues must be addressed:

### Issue A: Missing Files Causing Startup/Compilation Failure
The following files are referenced in code but missing from disk:
1. `src/backend/routes/pathao.routes.ts` (stub or implement)
2. `src/backend/routes/archive.routes.ts` (stub or implement)
3. `src/backend/routes/courier.routes.ts` (stub or implement)
4. `src/backend/integrations/pathao/pathao-sync.service.ts` (stub or implement)
5. `src/backend/controllers/courier.controller.ts` (stub or implement)
6. `src/backend/integrations/courier/courier-provider.registry.ts` & `courier.types.ts`
7. `src/backend/controllers/product-faq.controller.ts` & `src/backend/validators/product-faq.validator.ts`
8. `src/backend/services/media-usage.service.ts`
9. `src/backend/controllers/storefront/account-mobile.controller.ts` & `auth-mobile.controller.ts`
10. `src/pages/admin/archive/ArchiveList.tsx`
11. `src/components/admin/orders/PathaoShipmentCard.tsx` & `DeliveryBillingSection.tsx`
12. `src/components/admin/settings/CourierProvidersSection.tsx`
13. `src/components/products/ProductFaqsTab.tsx`

### Issue B: Critical Runtime & Security Bugs
1. **Inventory Syntax Error**: Replace `lte: prisma.inventory.fields.lowStockThreshold` in `src/backend/controllers/inventory.controller.ts:9`.
2. **Refresh Token Logout Leak**: Update `src/context/AuthContext.tsx` to send `{ refreshToken }` on logout.
3. **Media Permission Bypass**: Delete `|| true` in `src/pages/admin/media/MediaLibrary.tsx:47-49`.
4. **Sales Permission Mapping**: In `shipment.routes.ts`, `return.routes.ts`, `refund.routes.ts`, and `analytics.routes.ts`, replace `requirePermission("Orders", ...)` with their actual domain permissions (`Shipments`, `Returns`, `Refunds`, `Analytics`).

---

## 6. Strict Mandatory Rules for Future AI Sessions

1. **NEVER run destructive database commands** (`prisma migrate reset`, `DROP TABLE`, etc.).
2. **NEVER modify the Prisma schema without explicit user instruction and creating a migration.**
3. **NEVER install packages with global flags or add unvetted third-party dependencies.**
4. **ALWAYS preserve the dual API error handling contracts**:
   - Admin routes: `{ success: false, error: { code, message, details } }`
   - Storefront routes: `{ status: "error", message, errors }`
5. **ALWAYS verify imports before introducing new files**: Confirm paths with `Test-Path`.
6. **NEVER leave hardcoded `|| true` permission bypasses in frontend components.**
7. **ALWAYS use parameterized queries or tagged templates (`tx.$executeRaw\`...\``) when executing raw SQL.**
