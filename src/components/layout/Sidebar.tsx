import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Star,
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Tag,
  Boxes,
  ShieldCheck,
  UserCog,
  Key,
  Ticket,
  Zap,
  Megaphone,
  Image,
  Layers,
  FileText,
  PenTool,
  Search,
  LayoutTemplate,
  HelpCircle,
  Activity,
  Bell,
  CreditCard,
  RotateCcw,
  Undo2,
  Truck,
  MapPin,
  Navigation,
  PieChart,
  Shield,
  Mail,
  Sliders,
  Archive
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavSubItem {
  label: string;
  href: string;
  module: string;
  requiredPermission?: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavSubItem[];
}

interface StandaloneNavItem {
  id: string;
  title: string;
  href: string;
  module: string;
  requiredPermission?: string;
  icon: React.ElementType;
}

type MenuItem = 
  | { type: 'standalone'; data: StandaloneNavItem }
  | { type: 'group'; data: NavGroup };

const STORAGE_KEY = 'enterprise_sidebar_expanded_groups';

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { can, user } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);

  const logoSource = branding.adminPanelLogo || branding.logoUrl;
  const portalName = branding.adminPanelName || branding.siteName || "Admin Portal";

  // Accordion open/close state dictionary
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse sidebar state from localStorage", e);
    }
    // Default: Catalog management open
    return { 'catalog-mgmt': true };
  });

  // Save expanded groups state to localStorage
  const saveExpandedGroups = (newGroups: Record<string, boolean>) => {
    setExpandedGroups(newGroups);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
    } catch (e) {
      console.warn("Failed to save sidebar state to localStorage", e);
    }
  };

  const toggleGroup = (groupId: string) => {
    const isCurrentOpen = !!expandedGroups[groupId];
    // Accordion requirement: Single open group expanded at a time
    const updated = isCurrentOpen ? {} : { [groupId]: true };
    saveExpandedGroups(updated);
  };

  // Full Information Architecture Navigation Schema with Required Permissions
  const menuStructure: MenuItem[] = [
    {
      type: 'standalone',
      data: {
        id: 'dashboard',
        title: 'Dashboard',
        href: '/',
        module: 'Dashboard',
        requiredPermission: 'Dashboard.read',
        icon: LayoutDashboard
      }
    },
    {
      type: 'group',
      data: {
        id: 'user-mgmt',
        title: 'User Management',
        icon: UserCog,
        items: [
          { label: 'Users', href: '/admin/users', module: 'Users', requiredPermission: 'Users.read', icon: Users },
          { label: 'Roles & Permissions', href: '/admin/roles', module: 'Roles', requiredPermission: 'Roles.read', icon: Key }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'customer-mgmt',
        title: 'Customer Management',
        icon: Users,
        items: [
          { label: 'Customers', href: '/customers', module: 'Customers', requiredPermission: 'Customers.read', icon: Users },
          { label: 'Active Sessions', href: '/admin/sessions', module: 'Sessions', requiredPermission: 'Sessions.read', icon: Activity }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'catalog-mgmt',
        title: 'Catalog Management',
        icon: Boxes,
        items: [
          { label: 'Categories', href: '/categories', module: 'Categories', requiredPermission: 'Categories.read', icon: FolderTree },
          { label: 'Brands', href: '/brands', module: 'Brands', requiredPermission: 'Brands.read', icon: Tag },
          { label: 'Products', href: '/products', module: 'Products', requiredPermission: 'Products.read', icon: Package },
          { label: 'Reviews', href: '/admin/reviews', module: 'Products', requiredPermission: 'Products.read', icon: Star },
          { label: 'Inventory', href: '/inventory', module: 'Inventory', requiredPermission: 'Inventory.read', icon: Boxes }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'sales-mgmt',
        title: 'Sales & Fulfillment',
        icon: ShoppingCart,
        items: [
          { label: 'Orders', href: '/orders', module: 'Orders', requiredPermission: 'Orders.read', icon: ShoppingCart },
          { label: 'Payments', href: '/admin/payments', module: 'Payments', requiredPermission: 'Payments.read', icon: CreditCard },
          { label: 'Refunds', href: '/admin/refunds', module: 'Refunds', requiredPermission: 'Refunds.read', icon: RotateCcw },
          { label: 'Returns', href: '/admin/returns', module: 'Returns', requiredPermission: 'Returns.read', icon: Undo2 },
          { label: 'Shipments', href: '/admin/shipments', module: 'Shipments', requiredPermission: 'Shipments.read', icon: Truck }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'marketing-mgmt',
        title: 'Marketing',
        icon: Megaphone,
        items: [
          { label: 'Coupons', href: '/admin/coupons', module: 'Coupons', requiredPermission: 'Coupons.read', icon: Ticket },
          { label: 'Promotions', href: '/admin/promotions', module: 'Promotions', requiredPermission: 'Promotions.read', icon: Zap },
          { label: 'Banners', href: '/admin/banners', module: 'Banners', requiredPermission: 'Banners.read', icon: Image },
          { label: 'Popups', href: '/admin/popups', module: 'Popups', requiredPermission: 'Popups.read', icon: Layers },
          { label: 'Campaigns', href: '/admin/marketing', module: 'Marketing', requiredPermission: 'Marketing.read', icon: Megaphone }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'content-mgmt',
        title: 'Content Management',
        icon: FileText,
        items: [
          { label: 'Pages', href: '/admin/cms', module: 'CMS', requiredPermission: 'CMS.read', icon: FileText },
          { label: 'Blog Posts', href: '/admin/blog', module: 'Blog', requiredPermission: 'Blog.read', icon: PenTool },
          { label: 'FAQs', href: '/admin/faqs', module: 'FAQ', requiredPermission: 'FAQ.read', icon: HelpCircle },
          { label: 'Media', href: '/admin/media', module: 'Media', requiredPermission: 'Media.read', icon: Image },
          { label: 'Landing Pages', href: '/admin/landing-pages', module: 'LandingPages', requiredPermission: 'LandingPages.read', icon: LayoutTemplate }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'analytics-mgmt',
        title: 'Analytics & Reports',
        icon: BarChart3,
        items: [
          { label: 'Analytics', href: '/analytics', module: 'Analytics', requiredPermission: 'Analytics.read', icon: BarChart3 },
          { label: 'Audit Logs', href: '/admin/audit-logs', module: 'AuditLogs', requiredPermission: 'AuditLogs.read', icon: ShieldCheck }
        ]
      }
    },
    {
      type: 'group',
      data: {
        id: 'system-mgmt',
        title: 'System',
        icon: Settings,
        items: [
          { label: 'Notifications', href: '/admin/notifications', module: 'Notifications', requiredPermission: 'Notifications.read', icon: Bell },
          { label: 'Archive', href: '/admin/archive', module: 'Settings', requiredPermission: 'Settings.read', icon: Archive },
          { label: 'Settings', href: '/settings', module: 'Settings', requiredPermission: 'Settings.read', icon: Settings },
          { label: 'SEO', href: '/admin/seo', module: 'SEO', requiredPermission: 'SEO.read', icon: Search }
        ]
      }
    }
  ];

  // Calculate filtered visible menus for the current user's effective permissions
  const visibleMenus = menuStructure.map((menu) => {
    if (menu.type === 'standalone') {
      const isVisible = can(menu.data.requiredPermission || `${menu.data.module}.read`);
      return isVisible ? menu : null;
    }
    const visibleItems = menu.data.items.filter((sub) =>
      can(sub.requiredPermission || `${sub.module}.read`)
    );
    if (visibleItems.length === 0) return null;
    return {
      type: 'group' as const,
      data: {
        ...menu.data,
        items: visibleItems,
      },
    };
  }).filter(Boolean) as MenuItem[];

  // Helper to check if a pathname matches a route
  const isRouteActive = (href: string) => {
    if (!href) return false;
    
    // Normalize path to strip trailing slash
    const path = location.pathname.endsWith('/') && location.pathname !== '/'
      ? location.pathname.slice(0, -1) 
      : location.pathname;
      
    const targetHref = href.endsWith('/') && href !== '/'
      ? href.slice(0, -1) 
      : href;
      
    if (path === targetHref) return true;
    if (targetHref === '/') return path === '/';

    // Segment-aware child matching (e.g. /orders/123 matches /orders)
    if (path.startsWith(targetHref + '/')) return true;

    // Handle common alias paths where 'admin/' is prefixed to the path
    if (path.startsWith('/admin' + targetHref)) {
        if (path === '/admin' + targetHref || path.startsWith('/admin' + targetHref + '/')) {
            return true;
        }
    }
    
    // Reverse alias: if href has /admin but path doesn't
    if (targetHref.startsWith('/admin/')) {
        const nonAdminHref = targetHref.replace('/admin', '');
        if (path === nonAdminHref || path.startsWith(nonAdminHref + '/')) {
            return true;
        }
    }

    return false;
  };

  // Automatically expand group containing current active route
  useEffect(() => {
    menuStructure.forEach(menu => {
      if (menu.type === 'group') {
        const hasActiveChild = menu.data.items.some(item => isRouteActive(item.href));
        if (hasActiveChild && !expandedGroups[menu.data.id]) {
          setExpandedGroups(prev => {
            const next = { ...prev, [menu.data.id]: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        }
      }
    });
  }, [location.pathname]);

  // Handle mobile drawer link clicks
  const handleMobileNavClick = () => {
    if (window.innerWidth < 768 && isOpen) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Main Container Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
          "border-r border-slate-200 dark:border-slate-800 shadow-xl",
          "transition-all duration-300 ease-in-out",
          isOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
        )}
      >
        {/* Header Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {isOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {logoSource && !logoError ? (
                <img
                  src={logoSource}
                  alt={portalName}
                  onError={() => setLogoError(true)}
                  className="h-8 max-w-[140px] object-contain shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  {portalName.charAt(0)}
                </div>
              )}
              <span className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                {portalName}
              </span>
            </div>
          ) : (
            <div className="mx-auto">
              {logoSource && !logoError ? (
                <img
                  src={logoSource}
                  alt={portalName}
                  onError={() => setLogoError(true)}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {portalName.charAt(0)}
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 ml-auto md:flex hidden"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 ml-auto md:hidden"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
          {visibleMenus.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {isOpen ? (
                <>
                  <p className="font-semibold text-foreground mb-1">No Modules Permitted</p>
                  <p>Contact your administrator to grant role permissions.</p>
                </>
              ) : (
                <div className="h-2 w-2 rounded-full bg-muted-foreground mx-auto" />
              )}
            </div>
          ) : (
            visibleMenus.map((menu) => {
              if (menu.type === 'standalone') {
                const item = menu.data;
                const active = isRouteActive(item.href);
                const Icon = item.icon;

                return (
                  <div key={item.id} className="relative group">
                    <NavLink
                      to={item.href}
                      onClick={handleMobileNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60",
                        !isOpen && "justify-center px-0"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {isOpen && <span className="truncate">{item.title}</span>}
                    </NavLink>

                    {/* Hover Tooltip in Collapsed Mode */}
                    {!isOpen && (
                      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-slate-100 dark:bg-slate-800 border border-slate-700/80 shadow-xl rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150">
                        {item.title}
                      </div>
                    )}
                  </div>
                );
              }

              // Group Navigation Item
              const group = menu.data;
              const isGroupExpanded = !!expandedGroups[group.id];
              const isAnyChildActive = group.items.some(sub => isRouteActive(sub.href));
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="relative group">
                  {/* Expanded Sidebar View */}
                  {isOpen ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isAnyChildActive
                            ? "text-primary font-semibold bg-primary/10 dark:bg-primary/20"
                            : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <GroupIcon className={cn("h-5 w-5 shrink-0", isAnyChildActive && "text-primary")} />
                          <span className="truncate">{group.title}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 text-slate-400",
                            isGroupExpanded && "rotate-180 text-foreground"
                          )}
                        />
                      </button>

                      {/* Accordion Sub-items List */}
                      {isGroupExpanded && (
                        <div className="pl-4 pr-1 space-y-1 pt-0.5 pb-1">
                          {group.items.map((sub) => {
                            const SubIcon = sub.icon;
                            const active = isRouteActive(sub.href);
                            return (
                              <NavLink
                                key={sub.label + sub.href}
                                to={sub.href}
                                onClick={handleMobileNavClick}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                                  active
                                    ? "bg-primary/15 text-primary font-bold dark:bg-primary/25"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                                )}
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Collapsed Sidebar View with Flyout Hover Menu */
                    <div>
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-center p-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors",
                          isAnyChildActive && "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
                        )}
                      >
                        <GroupIcon className="h-5 w-5 shrink-0" />
                      </button>

                      {/* Flyout Sub-menu Card on Hover */}
                      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto absolute left-full ml-2.5 top-0 z-50 bg-slate-900 text-slate-100 dark:bg-slate-800 border border-slate-700/80 shadow-2xl rounded-xl p-2.5 min-w-[200px] transition-all duration-200">
                        <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/80 mb-1.5 flex items-center gap-2">
                          <GroupIcon className="h-3.5 w-3.5 text-primary" />
                          <span>{group.title}</span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((sub) => {
                            const SubIcon = sub.icon;
                            const active = isRouteActive(sub.href);
                            return (
                              <NavLink
                                key={sub.label + sub.href}
                                to={sub.href}
                                onClick={handleMobileNavClick}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700"
                                )}
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
}
