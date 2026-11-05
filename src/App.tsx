import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoutePermissionGuard } from './components/layout/PermissionGuard';
import { AdminLayout } from './components/layout/AdminLayout';
import { AppToaster } from './components/ui/AppToaster';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Register } from './pages/auth/Register';
// (existing imports...)
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { ProductCreate } from './pages/products/ProductCreate';
import { ProductEdit } from './pages/products/ProductEdit';
import { ProductView } from './pages/products/ProductView';
import { CategoryList } from './pages/categories/CategoryList';
import { CategoryCreate } from './pages/categories/CategoryCreate';
import { CategoryEdit } from './pages/categories/CategoryEdit';
import { BrandList } from './pages/brands/BrandList';
import { BrandCreate } from './pages/brands/BrandCreate';
import { BrandEdit } from './pages/brands/BrandEdit';
import { Analytics } from './pages/Analytics';
import { Inventory } from './pages/Inventory';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { GA4Example } from './pages/GA4Example';
import { AuditLogs } from './pages/AuditLogs';
import { Users } from './pages/admin/Users';
import { Roles } from './pages/admin/Roles';
import { RolePermissions } from './pages/admin/RolePermissions';
import { Sessions } from './pages/admin/Sessions';
import { Profile } from './pages/admin/Profile';
import { OrdersList } from './pages/admin/orders/OrdersList';
import { OrderDetail } from './pages/admin/orders/OrderDetail';
import { CustomersList } from './pages/admin/customers/CustomersList';
import { CustomerDetail } from './pages/admin/customers/CustomerDetail';
import { CouponsList } from './pages/admin/coupons/CouponsList';
import { PromotionsList } from './pages/admin/promotions/PromotionsList';
import { MarketingList } from './pages/admin/marketing/MarketingList';
import { BannersList } from './pages/admin/banners/BannersList';
import { PopupsList } from './pages/admin/popups/PopupsList';
import { CmsPagesList } from './pages/admin/cms/CmsPagesList';
import { CmsPageCreate } from './pages/admin/cms/CmsPageCreate';
import { CmsPageEdit } from './pages/admin/cms/CmsPageEdit';
import { BlogManagement } from './pages/admin/blog/BlogManagement';
import { BlogPostCreate } from './pages/admin/blog/BlogPostCreate';
import { BlogPostEdit } from './pages/admin/blog/BlogPostEdit';
import { SeoManagement } from './pages/admin/seo/SeoManagement';
import { LandingPagesList } from './pages/admin/landing-pages/LandingPagesList';
import { MediaLibrary } from './pages/admin/media/MediaLibrary';
import { FaqManagement } from './pages/admin/faqs/FaqManagement';
import { PaymentsList } from './pages/admin/payments/PaymentsList';
import { PaymentDetails } from './pages/admin/payments/PaymentDetails';
import { RefundsList } from './pages/admin/refunds/RefundsList';
import { RefundDetails } from './pages/admin/refunds/RefundDetails';
import { ReturnsList } from './pages/admin/returns/ReturnsList';
import { ReviewsList } from './pages/admin/reviews/ReviewsList';
import { ReviewDetails } from './pages/admin/reviews/ReviewDetails';
import { ReturnDetails } from './pages/admin/returns/ReturnDetails';
import { ShipmentsList } from './pages/admin/shipments/ShipmentsList';
import { ShipmentDetails } from './pages/admin/shipments/ShipmentDetails';
import { Settings } from './pages/admin/settings/Settings';
import { NotificationsList } from './pages/admin/notifications/NotificationsList';
import { ArchiveList } from './pages/admin/archive/ArchiveList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrandingProvider>
            <AppToaster />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<RoutePermissionGuard module="Dashboard" action="read"><Dashboard /></RoutePermissionGuard>} />
                  
                  <Route path="products" element={<RoutePermissionGuard module="Products" action="read"><Products /></RoutePermissionGuard>} />
                  <Route path="products/new" element={<RoutePermissionGuard module="Products" action="write"><ProductCreate /></RoutePermissionGuard>} />
                  <Route path="products/:id" element={<RoutePermissionGuard module="Products" action="read"><ProductView /></RoutePermissionGuard>} />
                  <Route path="products/:id/edit" element={<RoutePermissionGuard module="Products" action="write"><ProductEdit /></RoutePermissionGuard>} />
                  
                  <Route path="categories" element={<RoutePermissionGuard module="Categories" action="read"><CategoryList /></RoutePermissionGuard>} />
                  <Route path="categories/new" element={<RoutePermissionGuard module="Categories" action="write"><CategoryCreate /></RoutePermissionGuard>} />
                  <Route path="categories/:id/edit" element={<RoutePermissionGuard module="Categories" action="write"><CategoryEdit /></RoutePermissionGuard>} />
                  
                  <Route path="brands" element={<RoutePermissionGuard module="Brands" action="read"><BrandList /></RoutePermissionGuard>} />
                  <Route path="brands/new" element={<RoutePermissionGuard module="Brands" action="write"><BrandCreate /></RoutePermissionGuard>} />
                  <Route path="brands/:id/edit" element={<RoutePermissionGuard module="Brands" action="write"><BrandEdit /></RoutePermissionGuard>} />
                  
                  <Route path="orders" element={<RoutePermissionGuard module="Orders" action="read"><OrdersList /></RoutePermissionGuard>} />
                  <Route path="orders/:id" element={<RoutePermissionGuard module="Orders" action="read"><OrderDetail /></RoutePermissionGuard>} />
                  <Route path="admin/orders" element={<RoutePermissionGuard module="Orders" action="read"><OrdersList /></RoutePermissionGuard>} />
                  <Route path="admin/orders/:id" element={<RoutePermissionGuard module="Orders" action="read"><OrderDetail /></RoutePermissionGuard>} />
                  
                  <Route path="customers" element={<RoutePermissionGuard module="Customers" action="read"><CustomersList /></RoutePermissionGuard>} />
                  <Route path="customers/:id" element={<RoutePermissionGuard module="Customers" action="read"><CustomerDetail /></RoutePermissionGuard>} />
                  <Route path="admin/customers" element={<RoutePermissionGuard module="Customers" action="read"><CustomersList /></RoutePermissionGuard>} />
                  <Route path="admin/customers/:id" element={<RoutePermissionGuard module="Customers" action="read"><CustomerDetail /></RoutePermissionGuard>} />

                  <Route path="admin/coupons" element={<RoutePermissionGuard module="Coupons" action="read"><CouponsList /></RoutePermissionGuard>} />
                  <Route path="admin/promotions" element={<RoutePermissionGuard module="Promotions" action="read"><PromotionsList /></RoutePermissionGuard>} />
                  <Route path="admin/marketing" element={<RoutePermissionGuard module="Marketing" action="read"><MarketingList /></RoutePermissionGuard>} />
                  <Route path="admin/banners" element={<RoutePermissionGuard module="Banners" action="read"><BannersList /></RoutePermissionGuard>} />
                  <Route path="admin/popups" element={<RoutePermissionGuard module="Popups" action="read"><PopupsList /></RoutePermissionGuard>} />
                  <Route path="admin/cms" element={<RoutePermissionGuard module="CMS" action="read"><CmsPagesList /></RoutePermissionGuard>} />
                  <Route path="admin/cms/new" element={<RoutePermissionGuard module="CMS" action="write"><CmsPageCreate /></RoutePermissionGuard>} />
                  <Route path="admin/cms/:id/edit" element={<RoutePermissionGuard module="CMS" action="write"><CmsPageEdit /></RoutePermissionGuard>} />
                  <Route path="admin/blog" element={<RoutePermissionGuard module="Blog" action="read"><BlogManagement /></RoutePermissionGuard>} />
                  <Route path="admin/blog/new" element={<RoutePermissionGuard module="Blog" action="write"><BlogPostCreate /></RoutePermissionGuard>} />
                  <Route path="admin/blog/:id/edit" element={<RoutePermissionGuard module="Blog" action="write"><BlogPostEdit /></RoutePermissionGuard>} />
                  <Route path="admin/seo" element={<RoutePermissionGuard module="SEO" action="read"><SeoManagement /></RoutePermissionGuard>} />
                  <Route path="admin/landing-pages" element={<RoutePermissionGuard module="LandingPages" action="read"><LandingPagesList /></RoutePermissionGuard>} />
                  <Route path="admin/media" element={<RoutePermissionGuard module="Media" action="read"><MediaLibrary /></RoutePermissionGuard>} />
                  <Route path="admin/faqs" element={<RoutePermissionGuard module="FAQ" action="read"><FaqManagement /></RoutePermissionGuard>} />
                  
                  <Route path="analytics" element={<RoutePermissionGuard module="Analytics" action="read"><Analytics /></RoutePermissionGuard>} />
                  <Route path="analytics/ga4-example" element={<RoutePermissionGuard module="Analytics" action="read"><GA4Example /></RoutePermissionGuard>} />
                  
                  <Route path="inventory" element={<RoutePermissionGuard module="Inventory" action="read"><Inventory /></RoutePermissionGuard>} />
                  
                  <Route path="admin/users" element={<RoutePermissionGuard module="Users" action="read"><Users /></RoutePermissionGuard>} />
                  <Route path="admin/roles" element={<RoutePermissionGuard module="Roles" action="read"><Roles /></RoutePermissionGuard>} />
                  <Route path="admin/roles/:id" element={<RoutePermissionGuard module="Roles" action="read"><RolePermissions /></RoutePermissionGuard>} />
                  <Route path="admin/sessions" element={<RoutePermissionGuard module="Sessions" action="read"><Sessions /></RoutePermissionGuard>} />
                  <Route path="profile" element={<Profile />} />
                  
                  <Route path="admin/payments" element={<RoutePermissionGuard module="Payments" action="read"><PaymentsList /></RoutePermissionGuard>} />
                  <Route path="admin/payments/:id" element={<RoutePermissionGuard module="Payments" action="read"><PaymentDetails /></RoutePermissionGuard>} />
                  
                  <Route path="admin/refunds" element={<RoutePermissionGuard module="Refunds" action="read"><RefundsList /></RoutePermissionGuard>} />
                  <Route path="admin/refunds/:id" element={<RoutePermissionGuard module="Refunds" action="read"><RefundDetails /></RoutePermissionGuard>} />
                  
                  <Route path="admin/reviews" element={<RoutePermissionGuard module="Products" action="read"><ReviewsList /></RoutePermissionGuard>} />
                  <Route path="admin/reviews/:id" element={<RoutePermissionGuard module="Products" action="read"><ReviewDetails /></RoutePermissionGuard>} />
                  <Route path="admin/returns" element={<RoutePermissionGuard module="Returns" action="read"><ReturnsList /></RoutePermissionGuard>} />
                  <Route path="admin/returns/:id" element={<RoutePermissionGuard module="Returns" action="read"><ReturnDetails /></RoutePermissionGuard>} />
                  
                  <Route path="admin/shipments" element={<RoutePermissionGuard module="Shipments" action="read"><ShipmentsList /></RoutePermissionGuard>} />
                  <Route path="admin/shipments/:id" element={<RoutePermissionGuard module="Shipments" action="read"><ShipmentDetails /></RoutePermissionGuard>} />
                  
                  <Route path="admin/notifications" element={<RoutePermissionGuard module="Notifications" action="read"><NotificationsList /></RoutePermissionGuard>} />
                  <Route path="admin/archive" element={<RoutePermissionGuard module="Settings" action="read"><ArchiveList /></RoutePermissionGuard>} />
                  <Route path="archive" element={<Navigate to="/admin/archive" replace />} />
                  
                  <Route path="settings" element={<RoutePermissionGuard module="Settings" action="read"><Settings /></RoutePermissionGuard>} />
                  <Route path="admin/settings" element={<RoutePermissionGuard module="Settings" action="read"><Settings /></RoutePermissionGuard>} />
                  <Route path="admin/audit-logs" element={<RoutePermissionGuard module="AuditLogs" action="read"><AuditLogs /></RoutePermissionGuard>} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </BrandingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
