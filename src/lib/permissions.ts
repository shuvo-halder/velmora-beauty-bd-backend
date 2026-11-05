import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Warehouse,
  BarChart3,
  Sliders,
  Users,
  ShieldCheck,
  KeyRound,
  Settings,
  ShieldAlert,
  ShoppingCart,
  UserCheck,
  Ticket,
  Percent,
  Megaphone,
  Image,
  Layers,
  History,
  FileSpreadsheet,
  FileCode,
  Globe,
  HelpCircle,
  Search,
  CreditCard,
  RotateCcw,
  Undo2,
  Truck,
  Bell,
  Lock,
  LucideIcon
} from "lucide-react";

export interface PermissionItem {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface ModuleGroup {
  module: string;
  category: string;
  readableName: string;
  icon: LucideIcon;
  description: string;
  permissions: PermissionItem[];
}

export const MODULE_CATEGORIES: Record<string, string> = {
  // Core Administration & Security
  Dashboard: "System & Overview",
  Analytics: "System & Overview",
  Users: "Access Control & Security",
  Roles: "Access Control & Security",
  Permissions: "Access Control & Security",
  Sessions: "Access Control & Security",
  AuditLogs: "Access Control & Security",
  Security: "Access Control & Security",
  Settings: "Access Control & Security",
  Notifications: "Access Control & Security",

  // Catalog & Inventory
  Products: "Catalog & Inventory",
  Categories: "Catalog & Inventory",
  Brands: "Catalog & Inventory",
  Attributes: "Catalog & Inventory",
  Inventory: "Catalog & Inventory",
  Media: "Catalog & Inventory",

  // Sales & Fulfillment
  Orders: "Sales & Operations",
  Customers: "Sales & Operations",
  Payments: "Sales & Operations",
  Refunds: "Sales & Operations",
  Returns: "Sales & Operations",
  Shipments: "Sales & Operations",

  // Marketing & CMS
  Coupons: "Marketing & Growth",
  Promotions: "Marketing & Growth",
  Marketing: "Marketing & Growth",
  Banners: "Marketing & Growth",
  Popups: "Marketing & Growth",
  CMS: "Content & SEO",
  Blog: "Content & SEO",
  LandingPages: "Content & SEO",
  FAQ: "Content & SEO",
  SEO: "Content & SEO",
};

export const MODULE_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Analytics: BarChart3,
  Products: Package,
  Categories: FolderTree,
  Brands: Tag,
  Attributes: Sliders,
  Inventory: Warehouse,
  Users: Users,
  Roles: ShieldCheck,
  Permissions: KeyRound,
  Sessions: Lock,
  AuditLogs: History,
  Security: ShieldAlert,
  Settings: Settings,
  Orders: ShoppingCart,
  Customers: UserCheck,
  Coupons: Ticket,
  Promotions: Percent,
  Marketing: Megaphone,
  Banners: Image,
  Popups: Layers,
  Media: FileSpreadsheet,
  Blog: FileCode,
  CMS: FileCode,
  LandingPages: Globe,
  FAQ: HelpCircle,
  SEO: Search,
  Payments: CreditCard,
  Refunds: RotateCcw,
  Returns: Undo2,
  Shipments: Truck,
  Notifications: Bell,
};

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  Dashboard: "Administrative overview metrics and business activity feeds",
  Analytics: "Revenue analytics, sales trends, and traffic reports",
  Products: "Product catalog, SKU pricing, variants, and stock levels",
  Categories: "Product hierarchy, taxonomy, and category trees",
  Brands: "Brand directories, logos, and manufacturer relations",
  Attributes: "Custom product specifications and variant options",
  Inventory: "Warehouse stock management, purchase orders, and adjustments",
  Users: "Admin staff accounts, user credentials, and status controls",
  Roles: "System and custom role definitions and permission policies",
  Permissions: "Granular system permission catalog",
  Sessions: "Active administrator authentication sessions and token revocation",
  AuditLogs: "Security audit trail, login records, and modification events",
  Security: "Platform security parameters and compliance settings",
  Settings: "Global store configurations, payment gateways, and integrations",
  Orders: "Customer orders, fulfillment lifecycles, and invoices",
  Customers: "Storefront registered customer accounts and profiles",
  Coupons: "Discount codes, voucher thresholds, and expiration rules",
  Promotions: "Campaign banners, percentage discounts, and flash sales",
  Marketing: "Email newsletters, promotional campaigns, and campaigns",
  Banners: "Storefront hero carousels and promotional graphics",
  Popups: "Lead capture modal dialogs and alert popups",
  Media: "Image assets, CDN uploads, and document library",
  Blog: "Editorial blog articles and publication workflows",
  CMS: "Static informational pages (About Us, Privacy Policy, Terms)",
  LandingPages: "Custom campaign landing pages and marketing layouts",
  FAQ: "Customer support knowledge base and FAQ accordions",
  SEO: "Meta tags, sitemaps, structured data, and search rankings",
  Payments: "Payment transactions, authorizations, and settlements",
  Refunds: "Customer refund requests and payout processing",
  Returns: "RMA return authorization tickets and inspection records",
  Shipments: "Courier tracking, packing slips, and delivery dispatches",
  Notifications: "System notifications, order alerts, and broadcast announcements",
};

/**
 * Returns human-friendly readable label for an action within a module
 */
export function getReadablePermissionLabel(module: string, action: string): string {
  const normAction = action.toLowerCase();
  const mod = module.trim();

  if (normAction === "read") {
    switch (mod) {
      case "Dashboard":
        return "View Admin Dashboard";
      case "Analytics":
        return "View Analytics & Reports";
      case "Products":
        return "View Products";
      case "Categories":
        return "View Categories";
      case "Brands":
        return "View Brands";
      case "Inventory":
        return "View Stock & Inventory";
      case "Orders":
        return "View Orders & Invoices";
      case "Customers":
        return "View Customers";
      case "Users":
        return "View Admin Users";
      case "Roles":
        return "View Roles & Permissions";
      case "Payments":
        return "View Payment Transactions";
      case "Refunds":
        return "View Refund Requests";
      case "Returns":
        return "View Return Authorizations";
      case "Shipments":
        return "View Shipments & Dispatches";
      case "AuditLogs":
        return "View Audit Logs & Activity";
      case "Settings":
        return "View Store & System Settings";
      case "Security":
        return "View Security Settings";
      case "Sessions":
        return "View Active User Sessions";
      case "CMS":
        return "View CMS Pages";
      case "Blog":
        return "View Blog Posts";
      case "Media":
        return "View Media Library";
      default:
        return `View ${mod}`;
    }
  }

  if (normAction === "write") {
    switch (mod) {
      case "Dashboard":
        return "Configure Dashboard Widgets";
      case "Analytics":
        return "Export Analytics Data";
      case "Products":
        return "Create & Edit Products";
      case "Categories":
        return "Create & Edit Categories";
      case "Brands":
        return "Create & Edit Brands";
      case "Inventory":
        return "Adjust Stock & Purchase Orders";
      case "Orders":
        return "Update Orders & Status";
      case "Customers":
        return "Edit Customer Accounts";
      case "Users":
        return "Create & Edit Admin Users";
      case "Roles":
        return "Create & Edit Roles";
      case "Payments":
        return "Process & Update Payments";
      case "Refunds":
        return "Process & Issue Refunds";
      case "Returns":
        return "Approve & Manage Returns";
      case "Shipments":
        return "Create & Dispatch Shipments";
      case "Settings":
        return "Modify System Settings";
      case "Security":
        return "Update Security Configurations";
      case "Sessions":
        return "Revoke & Terminate Sessions";
      case "CMS":
        return "Create & Edit CMS Pages";
      case "Blog":
        return "Create & Publish Blog Posts";
      case "Coupons":
        return "Create & Edit Coupons";
      case "Promotions":
        return "Create & Edit Promotions";
      case "Media":
        return "Upload & Manage Media Assets";
      default:
        return `Create & Edit ${mod}`;
    }
  }

  if (normAction === "delete") {
    switch (mod) {
      case "Orders":
        return "Cancel / Delete Orders";
      case "Payments":
        return "Void / Delete Transactions";
      case "Refunds":
        return "Reject / Void Refunds";
      case "Users":
        return "Delete Admin Users";
      case "Roles":
        return "Delete Roles";
      case "Sessions":
        return "Force Disconnect All Sessions";
      default:
        return `Delete ${mod}`;
    }
  }

  // Custom actions
  return `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod}`;
}

/**
 * Returns detailed description / helper note for a permission
 */
export function getPermissionExplanation(module: string, action: string, rawDesc?: string): string {
  if (rawDesc && rawDesc.trim().length > 0 && !rawDesc.toLowerCase().startsWith("can ")) {
    return rawDesc;
  }
  const normAction = action.toLowerCase();
  const mod = module.trim();

  if (normAction === "read") {
    return `Grants read-only access to view ${mod.toLowerCase()} information, lists, and details.`;
  }
  if (normAction === "write") {
    return `Allows creating new entries, updating existing records, and saving changes in ${mod.toLowerCase()}.`;
  }
  if (normAction === "delete") {
    return `Grants destructive authorization to permanently or softly remove records in ${mod.toLowerCase()}.`;
  }
  return `Grants ${action} authorization for ${mod}.`;
}

/**
 * Identifies if a permission is high-risk / critical
 */
export function isCriticalPermission(module: string, action: string): boolean {
  const normMod = module.toLowerCase();
  const normAct = action.toLowerCase();

  if (["roles", "users", "security", "settings", "sessions"].includes(normMod)) {
    return true;
  }
  if (normAct === "delete" && ["products", "orders", "payments", "customers", "refunds"].includes(normMod)) {
    return true;
  }
  return false;
}

/**
 * Groups a flat list of permissions by their module
 */
export function groupPermissionsByModule(permissions: PermissionItem[]): ModuleGroup[] {
  const map: Record<string, PermissionItem[]> = {};

  permissions.forEach((p) => {
    const mod = p.module || "General";
    if (!map[mod]) {
      map[mod] = [];
    }
    map[mod].push(p);
  });

  const modules = Object.keys(map);

  return modules.map((mod) => {
    const perms = map[mod].sort((a, b) => {
      const order: Record<string, number> = { read: 1, write: 2, delete: 3 };
      const oa = order[a.action.toLowerCase()] || 99;
      const ob = order[b.action.toLowerCase()] || 99;
      return oa - ob;
    });

    return {
      module: mod,
      category: MODULE_CATEGORIES[mod] || "General",
      readableName: mod,
      icon: MODULE_ICONS[mod] || ShieldCheck,
      description: MODULE_DESCRIPTIONS[mod] || `Management and access controls for ${mod}`,
      permissions: perms,
    };
  });
}
