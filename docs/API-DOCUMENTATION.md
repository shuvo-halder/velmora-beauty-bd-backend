# Comprehensive API Documentation: Velmora Beauty Platform

## 1. API Architecture & Surface Overview

The platform provides two primary REST API surfaces served from a unified Express.js application:
1. **Admin Management API** (`/api/v1`): Secured via enterprise JWT authentication, refresh token rotation, and strict Role-Based Access Control (RBAC). Consumed by the React Admin Panel.
2. **Storefront API** (`/api/storefront/v1` and alias `/api/v1/storefront/v1`): Hybrid public and customer-authenticated API powering digital catalog browsing, search, guest/customer carts, checkout, customer portal, and payment webhooks.

### 1.1 Base URLs
- **Admin API**: `http://localhost:3000/api/v1`
- **Storefront API**: `http://localhost:3000/api/storefront/v1` (or `http://localhost:3000/api/v1/storefront/v1`)
- **API Documentation**: `http://localhost:3000/api/v1/docs` (Interactive Swagger UI)
- **Health Check**: `GET /api/v1/health`

### 1.2 Authentication Headers
- **Admin**: `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`
- **Storefront Customer**: `Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>`
- **Storefront Guest Session**: `X-Cart-Session-Id: <UUID>` or `X-Session-Id: <UUID>`

---

## 2. Admin Management API Reference (`/api/v1`)

### 2.1 Authentication (`/auth`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Public | None | Authenticates admin user with 15-minute JWT and 7-day refresh token. |
| `/auth/refresh` | `POST` | Public | None | Rotates refresh token and issues new access token. |
| `/auth/logout` | `POST` | Public | None | Revokes refresh token in database. (Requires `{ refreshToken }` in body). |
| `/auth/forgot-password`| `POST` | Public | None | Sends SHA-256 hashed password reset token via email. |
| `/auth/reset-password` | `POST` | Public | None | Resets password using token; revokes all active refresh tokens. |
| `/auth/change-password`| `PUT` | Bearer | Authenticated | Changes password for current logged-in admin user. |
| `/auth/me` | `GET` | Bearer | Authenticated | Retrieves current authenticated admin profile and permissions. |

#### `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "token": "eyJhbGciOi...",
    "refreshToken": "40-byte-hex-string...",
    "data": {
      "user": {
        "id": "uuid",
        "email": "admin@example.com",
        "firstName": "Super",
        "lastName": "Admin",
        "role": {
          "id": "uuid",
          "name": "SuperAdmin",
          "permissions": [{ "module": "Dashboard", "action": "read" }]
        }
      }
    }
  }
  ```

---

### 2.2 Users & RBAC (`/users`, `/roles`, `/permissions`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/users` | `GET` | Bearer | `Users.read` | Lists admin users with pagination and search. |
| `/users` | `POST` | Bearer | `Users.write` | Creates new administrative staff member. |
| `/users/:id` | `GET` | Bearer | `Users.read` | Retrieves user details and role. |
| `/users/:id` | `PUT` | Bearer | `Users.write` | Updates user details, email, or role. |
| `/users/:id` | `DELETE` | Bearer | `Users.delete` | Soft-deletes an admin user (`deletedAt`). |
| `/users/:id/status` | `PATCH` | Bearer | `Users.write` | Toggles user `isActive` flag. |
| `/users/:id/role` | `PATCH` | Bearer | `Users.write` | Updates assigned role ID. |
| `/users/:id/reset-password`| `PATCH` | Bearer | `Users.write` | Admin forces password reset for a user. |
| `/users/:id/force-logout` | `POST` | Bearer | `Users.write` | Revokes all active refresh tokens for user. |
| `/roles` | `GET` | Bearer | `Roles.read` | Lists all roles with user counts. |
| `/roles/:id` | `GET` | Bearer | `Roles.read` | Retrieves role with permission assignments. |
| `/roles/:id/permissions`| `PUT` | Bearer | `Roles.write` | Updates permission matrix for a role. |
| `/permissions` | `GET` | Bearer | `Permissions.read` | Retrieves all 93 system permissions. |

---

### 2.3 Dashboard & Analytics (`/dashboard`, `/analytics`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard/overview` | `GET` | Bearer | `Dashboard.read` | Retrieves KPI metrics, revenue/order trends, queues. |
| `/dashboard/recent-orders` | `GET` | Bearer | `Dashboard.read` | Retrieves latest 10 orders with customer data. |
| `/dashboard/recent-customers`| `GET`| Bearer | `Dashboard.read` | Retrieves recently registered customers. |
| `/dashboard/inventory-alerts`| `GET`| Bearer | `Dashboard.read` | Retrieves low stock and out-of-stock items. |
| `/analytics/overview` | `GET` | Bearer | `Orders.read` | Comprehensive analytics performance overview. |
| `/analytics/revenue` | `GET` | Bearer | `Orders.read` | Revenue breakdown by date range. |
| `/analytics/orders` | `GET` | Bearer | `Orders.read` | Order volume and lifecycle distribution. |
| `/analytics/customers` | `GET` | Bearer | `Customers.read` | Customer acquisition and retention metrics. |
| `/analytics/products` | `GET` | Bearer | `Products.read` | Top performing products and SKUs. |
| `/analytics/categories` | `GET` | Bearer | `Categories.read` | Sales performance by product category. |
| `/analytics/brands` | `GET` | Bearer | `Brands.read` | Sales performance by brand. |
| `/analytics/ga4` | `GET` | Bearer | `Orders.read` | Google Analytics 4 Data API real-time report. |

---

### 2.4 Product Catalog (`/products`, `/categories`, `/brands`, `/attributes`, `/inventory`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/products` | `GET` | Bearer | `Products.read` | Lists products with search, category, brand, and status filters. |
| `/products` | `POST` | Bearer | `Products.write` | Creates a product with default variant, images, and inventory. |
| `/products/:id` | `GET` | Bearer | `Products.read` | Retrieves product details, images, variants, and tags. |
| `/products/:id` | `PUT` | Bearer | `Products.write` | Updates product, inventory levels, and primary variant. |
| `/products/:id` | `DELETE` | Bearer | `Products.delete` | Soft-deletes a product (`deletedAt`). |
| `/products/:id/images` | `POST` | Bearer | `Products.write` | Uploads single image directly to product (Multer, 5MB). |
| `/products/:id/images/:imageId`| `DELETE`| Bearer| `Products.write`| Deletes image from product. |
| `/products/:id/images/reorder` | `PUT` | Bearer | `Products.write` | Updates display sortOrder for product images. |
| `/products/:id/images/:imageId/primary`| `PUT`| Bearer| `Products.write`| Designates primary thumbnail image. |
| `/products/:productId/variants`| `GET` | Bearer | `Products.read` | Retrieves all variants for a product. |
| `/products/:productId/variants`| `POST`| Bearer | `Products.write` | Creates new SKU variant with attribute links. |
| `/categories` | `GET` | Bearer | `Categories.read` | Lists category hierarchy tree. |
| `/categories` | `POST` | Bearer | `Categories.write` | Creates category with SEO metadata. |
| `/categories/:id` | `PUT` | Bearer | `Categories.write` | Updates category and parent hierarchy. |
| `/categories/:id` | `DELETE` | Bearer | `Categories.delete`| Soft-deletes a category. |
| `/brands` | `GET` | Bearer | `Brands.read` | Lists all brand manufacturers. |
| `/brands` | `POST` | Bearer | `Brands.write` | Creates brand with logo. |
| `/brands/:id` | `PUT` | Bearer | `Brands.write` | Updates brand details. |
| `/brands/:id` | `DELETE` | Bearer | `Brands.delete` | Soft-deletes a brand. |
| `/attributes` | `GET` | Bearer | `Attributes.read` | Lists product attributes (e.g. Color, Size). |
| `/attributes` | `POST` | Bearer | `Attributes.write` | Creates new attribute key. |
| `/attribute-values` | `POST`| Bearer | `Attributes.write` | Creates attribute value (e.g. "Red", "XL"). |
| `/inventory` | `GET` | Bearer | `Inventory.read` | Lists inventory across all warehouses. |
| `/inventory/low-stock` | `GET` | Bearer | `Inventory.read` | Returns low stock items (*Runtime Bug Identified*). |
| `/inventory/out-of-stock`| `GET`| Bearer | `Inventory.read` | Returns items with zero available stock. |
| `/inventory/value` | `GET` | Bearer | `Inventory.read` | Calculates total monetary inventory value. |

---

### 2.5 Orders & Fulfillment (`/orders`, `/shipments`, `/returns`, `/refunds`, `/payments`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/orders` | `GET` | Bearer | `Orders.read` | Lists orders with customer, items, and date filters. |
| `/orders/:id` | `GET` | Bearer | `Orders.read` | Retrieves full order details, timeline, notes, shipments. |
| `/orders/:id/status` | `PUT` | Bearer | `Orders.write` | Updates order state machine, manages cancellation refunds. |
| `/orders/:id/assign` | `PATCH` | Bearer | `Orders.write` | Assigns order to administrative staff member. |
| `/orders/:id/notes` | `POST` | Bearer | `Orders.write` | Adds internal operational note to order. |
| `/orders/:id` | `DELETE` | Bearer | `Orders.delete` | Soft-deletes an order. |
| `/shipments` | `GET` | Bearer | `Orders.read` | Lists carrier shipments and tracking statuses. |
| `/shipments` | `POST` | Bearer | `Orders.write` | Creates fulfillment shipment (*Courier Integration Broken*). |
| `/shipments/:id` | `GET` | Bearer | `Orders.read` | Retrieves shipment details and tracking events. |
| `/shipments/:id/status` | `PUT` | Bearer | `Orders.write` | Updates shipment delivery state. |
| `/returns` | `GET` | Bearer | `Orders.read` | Lists RMA return requests. |
| `/returns/:id` | `GET` | Bearer | `Orders.read` | Retrieves RMA return details. |
| `/returns/:id/approve` | `POST` | Bearer | `Orders.write` | Approves RMA return request. |
| `/returns/:id/reject` | `POST` | Bearer | `Orders.write` | Rejects RMA return request. |
| `/returns/:id/receive` | `POST` | Bearer | `Orders.write` | Confirms receipt of return items; restocks warehouse. |
| `/refunds` | `GET` | Bearer | `Orders.read` | Lists financial refund records. |
| `/refunds/initiate` | `POST` | Bearer | `Orders.write` | Initiates manual admin refund. |
| `/refunds/:id/approve` | `POST` | Bearer | `Orders.write` | Approves pending refund with row-level locking. |
| `/refunds/:id/reject` | `POST` | Bearer | `Orders.write` | Rejects pending refund. |
| `/refunds/:id/process` | `POST` | Bearer | `Orders.write` | Executes gateway refund transaction. |
| `/payments` | `GET` | Bearer | `Payments.read` | Lists all customer payment transactions. |
| `/payments/:id` | `GET` | Bearer | `Payments.read` | Retrieves payment transaction log and payloads. |

---

### 2.6 Content Management, Media & Marketing (`/pages`, `/blog`, `/faqs`, `/media`, `/coupons`, `/promotions`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/pages` | `GET` | Bearer | `CMS.read` | Lists all CMS pages. |
| `/pages` | `POST` | Bearer | `CMS.write` | Creates new CMS page with versioning. |
| `/pages/:id` | `PUT` | Bearer | `CMS.write` | Updates CMS page content. |
| `/pages/:id` | `DELETE` | Bearer | `CMS.delete` | Soft-deletes CMS page. |
| `/blog` | `GET` | Bearer | `Blog.read` | Lists blog articles with category taxonomy. |
| `/blog` | `POST` | Bearer | `Blog.write` | Publishes or schedules blog article. |
| `/blog/:id` | `PUT` | Bearer | `Blog.write` | Updates blog article. |
| `/faqs` | `GET` | Bearer | `FAQ.read` | Lists FAQ items and categories. |
| `/faqs` | `POST` | Bearer | `FAQ.write` | Creates FAQ item. |
| `/faqs/categories` | `GET` | Bearer | `FAQ.read` | Lists FAQ categories. |
| `/media` | `GET` | Bearer | `Media.Read` | Lists media assets with folder filtering. |
| `/media/upload` | `POST` | Bearer | `Media.Write` | Uploads single asset to Cloudinary (10MB limit). |
| `/media/upload-multiple`| `POST` | Bearer | `Media.Write` | Batch uploads up to 10 assets. |
| `/media/batch-delete` | `POST` | Bearer | `Media.Delete` | Safely batch deletes unreferenced media assets. |
| `/coupons` | `GET` | Bearer | `Coupons.read` | Lists discount coupons. |
| `/coupons` | `POST` | Bearer | `Coupons.write` | Creates coupon with usage limits and expiry. |
| `/coupons/:id/toggle` | `PATCH` | Bearer | `Coupons.write` | Toggles coupon active status. |
| `/promotions` | `GET` | Bearer | `Promotions.read`| Lists dynamic promotion rules. |
| `/promotions` | `POST` | Bearer | `Promotions.write`| Creates rule (BOGO, category discount, bundle). |
| `/banners` | `GET` | Bearer | `Banners.read` | Lists promotional carousel banners. |
| `/popups` | `GET` | Bearer | `Popups.read` | Lists homepage and exit-intent popups. |

---

### 2.7 System Settings & Audit (`/settings`, `/audit-logs`, `/sessions`)

| Endpoint | Method | Auth | Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/settings/general` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | General store configurations. |
| `/settings/branding` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | White-label branding, logos, site tagline. |
| `/settings/seo` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | Default meta tags, robots.txt, custom head script. |
| `/settings/smtp` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | SMTP mail server configuration. |
| `/settings/smtp/test`| `POST` | Bearer | `Settings.write` | Sends test email to verify credentials. |
| `/settings/analytics`| `GET` / `PUT` | Bearer | `Settings.read` / `write` | GA4, Facebook Pixel, TikTok Pixel IDs. |
| `/settings/security` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | 2FA, session timeout, maintenance mode toggle. |
| `/settings/shipping` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | Inside/outside Dhaka delivery rates, free shipping. |
| `/settings/tax` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | Tax rate percentage and price inclusion flag. |
| `/settings/store` | `GET` / `PUT` | Bearer | `Settings.read` / `write` | WhatsApp order number, hotline, social links. |
| `/audit-logs` | `GET` | Bearer | `AuditLogs.read` | Paginated security and admin activity logs. |
| `/audit-logs/export` | `GET` | Bearer | `AuditLogs.read` | Exports audit log history to CSV. |
| `/sessions` | `GET` | Bearer | `Sessions.read` | Lists active customer browser sessions. |
| `/sessions/:id` | `DELETE` | Bearer | `Sessions.delete` | Revokes specific customer session token. |

---

## 3. Storefront API Reference (`/api/storefront/v1`)

### 3.1 Public Discovery & Catalog

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/home` | `GET` | Public | Aggregated homepage payload (banners, popups, promotions, coupons, announcements). |
| `/products` | `GET` | Public | Paginated product listing with pricing, primary images, and inventory flags. |
| `/products/:slug` | `GET` | Public | Detailed product view with full variants, images, FAQs, and SEO tags. |
| `/categories` | `GET` | Public | Public category tree with icon and image URLs. |
| `/brands` | `GET` | Public | Public brands listing. |
| `/search` | `GET` | Public | Full-text product search with query `?q=`, category, brand, and price filters. |
| `/search/facets` | `GET` | Public | Dynamic facet counts (categories, brands, min/max price range). |
| `/reviews/:productId`| `GET` | Public | Lists approved reviews and star rating breakdown for a product. |
| `/reviews/featured`| `GET` | Public | Lists featured customer reviews for marketing landing pages. |
| `/sitemap` | `GET` | Public | Dynamically generates XML sitemap (`application/xml`). |
| `/robots.txt` | `GET` | Public | Dynamically generates crawler rules (`text/plain`). |
| `/merchant/feed.xml`| `GET` | Public | Google Merchant Center XML RSS 2.0 product feed. |
| `/merchant/feed.json`| `GET` | Public | Google Merchant Center JSON feed. |

---

### 3.2 Cart & Checkout

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/cart` | `GET` | Optional Customer | Retrieves cart items, prices, item counts, subtotal, and applied coupon. |
| `/cart/items` | `POST` | Optional Customer | Adds item (product ID, variant ID, quantity) to active cart. |
| `/cart/items/:id` | `PUT` | Optional Customer | Updates line item quantity (verifies available stock). |
| `/cart/items/:id` | `DELETE` | Optional Customer | Removes line item from cart. |
| `/cart/coupon` | `POST` | Optional Customer | Validates and applies discount coupon code. |
| `/cart/coupon` | `DELETE` | Optional Customer | Removes applied coupon from cart. |
| `/cart` | `DELETE` | Optional Customer | Clears all items from cart. |
| `/checkout/session` | `GET`/`POST`| Optional Customer | Generates checkout session with tax, shipping, and total calculation. |
| `/checkout/shipping`| `POST` | Optional Customer | Attaches shipping address and recipient contact details. |
| `/checkout/coupon` | `POST` | Optional Customer | Validates coupon against checkout order items. |
| `/checkout/complete`| `POST` | Optional Customer | **Finalizes Order**: Transactionally checks and decrements inventory, creates Order, OrderItems, Payment record, and fires order confirmation emails. |

---

### 3.3 Customer Authentication & Portal

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | Public | Customer registration with email and password. |
| `/auth/login` | `POST` | Public | Customer login issuing access token and refresh token. |
| `/auth/refresh` | `POST` | Public | Rotates customer refresh token. |
| `/auth/logout` | `POST` | Customer Bearer | Revokes customer refresh token and session. |
| `/auth/verify-email` | `POST` | Public | Verifies email using verification token. |
| `/auth/forgot-password`| `POST` | Public | Sends password reset email. |
| `/auth/reset-password` | `POST` | Public | Resets customer password. |
| `/account/profile` | `GET` / `PATCH`| Customer Bearer | Retrieves and updates customer profile. |
| `/account/addresses` | `GET` / `POST` | Customer Bearer | Customer address book management. |
| `/account/orders` | `GET` | Customer Bearer | Customer order history with fulfillment tracking. |
| `/wishlist` | `GET` | Customer Bearer | Retrieves customer wishlist items. |
| `/wishlist/:productId`| `POST` / `DELETE`| Customer Bearer | Adds or removes product from customer wishlist. |
| `/returns/request` | `POST` | Customer Bearer | Submits RMA return request for delivered order items. |
| `/refund/request` | `POST` | Customer Bearer | Requests refund for cancelled or returned order. |

---

### 3.4 Payment Gateways & Webhooks

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/payment/initiate` | `POST` | Customer Bearer | Initiates transaction with provider (Stripe, bKash, Nagad, SSLCommerz). |
| `/payment/verify` | `POST` | Customer Bearer | Verifies client-side return redirect transaction ID. |
| `/payment/:id` | `GET` | Customer Bearer | Retrieves payment status. |
| `/payment/webhook/:provider`| `POST` | Public Webhook | Provider IPN callback endpoint verifying HMAC/RSA signatures and updating order payment status idempotently. |
