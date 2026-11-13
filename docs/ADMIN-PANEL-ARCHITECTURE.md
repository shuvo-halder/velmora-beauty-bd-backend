# React 19 Administrative Dashboard Architecture

## 1. Frontend Architectural Overview

The **Admin Panel** is a Single-Page Application (SPA) built with **React 19**, **TypeScript**, and **Vite v6**, styled using **Tailwind CSS v4** and **Radix UI** primitives. It is located inside `src/` and shares the repository with the Express backend.

In development, Vite serves the frontend directly through Express middleware (`createViteServer` in `server.ts`). In production, `npm run build` runs `vite build` to output compiled bundles to `dist/`, which Express serves statically.

### 1.1 Path Aliases & TypeScript Configuration
In `vite.config.ts`, the `@` alias is configured as:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
  },
}
```
All imports starting with `@/src/...` resolve relative to the project root directory.

---

## 2. State Management Architecture

The Admin Panel follows a modern separation of state concerns across three tiers:

```
+---------------------------------------------------------------------------------------------------+
|                                 REACT STATE TIERS                                                 |
+---------------------------------------------------------------------------------------------------+
| 1. Server State Cache  | TanStack React Query v5                                                  |
|                        | - Automatic caching, background refetching, and cache invalidation       |
|                        | - Global defaults: staleTime: 60s, window focus refetch: off             |
|                        | - Smart retry: false on 401, 403, and 404 HTTP errors                    |
+------------------------+--------------------------------------------------------------------------+
| 2. Identity & Global   | React Context API                                                        |
|                        | - AuthContext: JWT token management, user state, and RBAC evaluations    |
|                        | - BrandingContext: Site title, dynamic logos, favicon, and primary color |
+------------------------+--------------------------------------------------------------------------+
| 3. Local UI State      | React useState, useRef, and useMemo                                      |
|                        | - Filter forms, pagination state, modals, and dirty form flags           |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Authentication, RBAC & Route Protection Flow

### 3.1 Authentication Context (`src/context/AuthContext.tsx`)
`AuthContext` is mounted at the root of the React application tree in `App.tsx`.
- **Token Storage**: Persists `accessToken` (15m) and `refreshToken` (7d) in `localStorage`.
- **Initial Verification**: On application mount, executes `GET /api/v1/auth/me`. If invalid or expired, clears `localStorage` and redirects to `/login`.
- **Permission Normalization**: Implements `normalizeAction()` which maps synonyms (`create`, `update`, `edit`, `add`, `patch`) directly to `write`.
- **Role Evaluation**: Evaluates `isSuperAdmin` by checking `user.role.name === 'SuperAdmin'`. SuperAdmin automatically bypasses all permission checks.

### 3.2 Declarative Guard Components
1. **`ProtectedRoute` (`src/components/layout/ProtectedRoute.tsx`)**:
   - Inspects `loading` and `user` state from `AuthContext`.
   - If unauthenticated, redirects to `/login` preserving target location in `state.from`.
2. **`RoutePermissionGuard` (`src/components/layout/PermissionGuard.tsx`)**:
   - Intercepts route rendering.
   - Evaluates `can(module, action)`. If unauthorized, renders `<AccessDenied />` rather than a generic 404 or blank screen.

---

## 4. Layout & Navigation Architecture

### 4.1 Layout Shell (`AdminLayout.tsx`)
```
+---------------------------------------------------------------------------------------+
|  [Sidebar Component]               |  [Header Component]                              |
|  - Collapsible drawer              |  - Breadcrumbs & Current Page Title              |
|  - Accordion group menus           |  - Light / Dark Theme Toggle                     |
|  - Granular RBAC item filtering    |  - Notification Bell with unread counter         |
|  - Persists state in localStorage  |  - User Profile dropdown & Logout action         |
|  --------------------------------- +------------------------------------------------- |
|                                    |  [Dynamic Page Outlet: <Outlet />]               |
|                                    |  - Dashboard / Products / Orders / Settings      |
+---------------------------------------------------------------------------------------+
```

### 4.2 Dynamic Sidebar Navigation (`Sidebar.tsx`)
The sidebar declares nine operational groups and automatically filters visible links against the logged-in user's permissions:

| Group ID | Display Title | Module Links | Required Permission |
| :--- | :--- | :--- | :--- |
| `standalone` | Dashboard | `/` | `Dashboard.read` |
| `user-mgmt` | User Management | Users (`/admin/users`), Roles (`/admin/roles`) | `Users.read`, `Roles.read` |
| `customer-mgmt`| Customer Management | Customers (`/customers`), Sessions (`/admin/sessions`) | `Customers.read`, `Sessions.read` |
| `catalog-mgmt` | Catalog Management | Categories, Brands, Products, Reviews, Inventory | `Categories.read`, `Brands.read`, `Products.read`, `Inventory.read` |
| `sales-mgmt` | Sales & Fulfillment | Orders, Payments, Refunds, Returns, Shipments | `Orders.read`, `Payments.read`, `Refunds.read`, `Returns.read`, `Shipments.read` |
| `marketing-mgmt`| Marketing | Coupons, Promotions, Banners, Popups, Campaigns | `Coupons.read`, `Promotions.read`, `Banners.read`, `Popups.read`, `Marketing.read` |
| `content-mgmt` | Content Management | Pages, Blog Posts, FAQs, Media, Landing Pages | `CMS.read`, `Blog.read`, `FAQ.read`, `Media.read`, `LandingPages.read` |
| `analytics-mgmt`| Analytics & Reports| Analytics (`/analytics`), Audit Logs (`/admin/audit-logs`) | `Analytics.read`, `AuditLogs.read` |
| `system-mgmt` | System | Notifications, Archive, Settings, SEO | `Notifications.read`, `Settings.read`, `SEO.read` |

---

## 5. Admin Panel Pages & Backend Service Integration

| Page Component | Route Path | Primary Consumed API | Backend Controller / Service | Primary Models |
| :--- | :--- | :--- | :--- | :--- |
| `Dashboard.tsx` | `/` | `/api/v1/dashboard/*` | `DashboardController` / `DashboardService` | `Order`, `Payment`, `Customer`, `Inventory` |
| `Products.tsx` | `/products` | `GET /api/v1/products` | `ProductController` / `ProductMediaService` | `Product`, `ProductVariant`, `Category` |
| `ProductCreate.tsx` | `/products/new` | `POST /api/v1/products` | `ProductController` | `Product`, `ProductVariant`, `Inventory` |
| `ProductEdit.tsx` | `/products/:id/edit`| `PUT /api/v1/products/:id` | `ProductController` | `Product`, `ProductVariant`, `ProductImage` |
| `ProductView.tsx` | `/products/:id` | `GET /api/v1/products/:id` | `ProductController` | `Product`, `ProductVariant`, `OrderItem` |
| `CategoryList.tsx` | `/categories` | `GET /api/v1/categories` | `CategoryController` | `Category` |
| `BrandList.tsx` | `/brands` | `GET /api/v1/brands` | `BrandController` | `Brand` |
| `Inventory.tsx` | `/inventory` | `GET /api/v1/inventory/*` | `InventoryController` | `Inventory`, `Warehouse`, `ProductVariant` |
| `OrdersList.tsx` | `/orders` | `GET /api/v1/orders` | `OrderController` | `Order`, `Customer`, `OrderItem` |
| `OrderDetail.tsx` | `/orders/:id` | `GET /api/v1/orders/:id` | `OrderController` / `EmailService` | `Order`, `Payment`, `Shipment`, `Refund` |
| `PaymentsList.tsx` | `/admin/payments` | `GET /api/v1/payments` | `PaymentController` | `Payment`, `PaymentTransaction` |
| `PaymentDetails.tsx`| `/admin/payments/:id`| `GET /api/v1/payments/:id` | `PaymentController` | `Payment`, `PaymentTransaction` |
| `RefundsList.tsx` | `/admin/refunds` | `GET /api/v1/refunds` | `RefundController` / `RefundService` | `Refund`, `Payment`, `Order` |
| `RefundDetails.tsx` | `/admin/refunds/:id`| `GET /api/v1/refunds/:id` | `RefundController` | `Refund`, `RefundTransaction` |
| `ReturnsList.tsx` | `/admin/returns` | `GET /api/v1/returns` | `ReturnController` / `ReturnService` | `ReturnRequest`, `ReturnItem` |
| `ReturnDetails.tsx` | `/admin/returns/:id`| `GET /api/v1/returns/:id` | `ReturnController` | `ReturnRequest`, `ReturnItem`, `Warehouse` |
| `ShipmentsList.tsx` | `/admin/shipments` | `GET /api/v1/shipments` | `ShipmentController` | `Shipment`, `Courier`, `TrackingEvent` |
| `ShipmentDetails.tsx`| `/admin/shipments/:id`| `GET /api/v1/shipments/:id`| `ShipmentController` | `Shipment`, `ShipmentItem`, `TrackingEvent` |
| `CustomersList.tsx` | `/customers` | `GET /api/v1/customers` | `CustomerController` | `Customer`, `Order` |
| `CustomerDetail.tsx`| `/customers/:id` | `GET /api/v1/customers/:id` | `CustomerController` | `Customer`, `CustomerAddress`, `Order` |
| `Users.tsx` | `/admin/users` | `GET /api/v1/users` | `UserController` | `User`, `Role` |
| `Roles.tsx` | `/admin/roles` | `GET /api/v1/roles` | `RoleController` | `Role`, `Permission` |
| `RolePermissions.tsx`| `/admin/roles/:id` | `PUT /api/v1/roles/:id/permissions`| `RoleController` / `PermissionService` | `Role`, `Permission` |
| `Sessions.tsx` | `/admin/sessions` | `GET /api/v1/sessions` | `SessionController` | `CustomerSession`, `Customer` |
| `CouponsList.tsx` | `/admin/coupons` | `GET /api/v1/coupons` | `CouponController` | `Coupon` |
| `PromotionsList.tsx`| `/admin/promotions` | `GET /api/v1/promotions` | `PromotionController` | `Promotion` |
| `MarketingList.tsx` | `/admin/marketing` | `GET /api/v1/marketing` | `MarketingController` | `MarketingCampaign` |
| `BannersList.tsx` | `/admin/banners` | `GET /api/v1/banners` | `BannerController` | `Banner` |
| `PopupsList.tsx` | `/admin/popups` | `GET /api/v1/popups` | `PopupController` | `Popup` |
| `CmsPagesList.tsx` | `/admin/cms` | `GET /api/v1/pages` | `PageController` | `Page`, `PageVersion`, `SeoMetadata` |
| `BlogManagement.tsx`| `/admin/blog` | `GET /api/v1/blog` | `BlogController` | `BlogPost`, `BlogCategory`, `BlogTag` |
| `FaqManagement.tsx` | `/admin/faqs` | `GET /api/v1/faqs` | `FaqController` | `FAQ`, `FAQCategory` |
| `MediaLibrary.tsx` | `/admin/media` | `GET /api/v1/media` | `MediaController` / `MediaService` | `MediaAsset` |
| `SeoManagement.tsx` | `/admin/seo` | `GET /api/v1/seo` | `SeoController` | `GlobalSeoSettings` |
| `Settings.tsx` | `/settings` | `GET /api/v1/settings/*` | `SettingController` | `Setting`, `BrandingSetting`, `SMTPSetting` |
| `AuditLogs.tsx` | `/admin/audit-logs` | `GET /api/v1/audit-logs` | `AuditController` / `AuditService` | `ActivityLog`, `User` |
| `Analytics.tsx` | `/analytics` | `GET /api/v1/analytics/*` | `AnalyticsController` / `GA4Service` | `Order`, `Payment`, `Customer` |

---

## 6. Verified Missing Components & Broken Imports

During comprehensive source code analysis, the following broken dependencies were identified in the frontend codebase:

1. **`src/App.tsx:68`**:
   - `import { ArchiveList } from './pages/admin/archive/ArchiveList';`
   - **Status**: `src/pages/admin/archive/ArchiveList.tsx` does not exist on disk.
2. **`src/pages/admin/orders/OrderDetail.tsx:35-36`**:
   - `import { PathaoShipmentCard } from "../../../components/admin/orders/PathaoShipmentCard";`
   - `import { DeliveryBillingSection } from "../../../components/admin/orders/DeliveryBillingSection";`
   - **Status**: Neither file exists in `src/components/admin/orders/`.
3. **`src/pages/admin/settings/Settings.tsx:16`**:
   - `import { CourierProvidersSection } from "../../../components/admin/settings/CourierProvidersSection";`
   - **Status**: File does not exist in `src/components/admin/settings/`.
4. **`src/pages/products/ProductForm.tsx:9`**:
   - `import { ProductFaqsTab } from '@/src/components/products/ProductFaqsTab';`
   - **Status**: File does not exist in `src/components/products/`.
5. **`src/pages/auth/Register.tsx:26`**:
   - `api.post("/users/register", formData)`
   - **Status**: Backend route `/api/v1/users/register` does not exist; backend `user.routes.ts` requires authentication for all `/users` endpoints.
6. **`src/pages/admin/media/MediaLibrary.tsx:47-49`**:
   - Permission bypass bug:
     ```typescript
     const canRead = hasPermission('Media', 'read') || true;
     const canWrite = hasPermission('Media', 'write') || true;
     const canDelete = hasPermission('Media', 'delete') || true;
     ```
     `|| true` hardcodes full permission access to any visitor regardless of their assigned role permissions.
