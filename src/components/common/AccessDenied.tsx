import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogOut, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { getReadablePermissionLabel } from '../../lib/permissions';

interface AccessDeniedProps {
  requiredPermission?: string;
  module?: string;
  action?: string;
  customMessage?: string;
}

export function AccessDenied({
  requiredPermission,
  module,
  action,
  customMessage,
}: AccessDeniedProps) {
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();

  const permString = requiredPermission || (module && action ? `${module}.${action}` : 'Admin Privilege');
  
  // Extract module & action if formatted as Module.action
  let readableLabel = permString;
  if (permString.includes('.')) {
    const [mod, act] = permString.split('.');
    readableLabel = getReadablePermissionLabel(mod, act);
  }

  // Find any accessible modules to offer as helpful navigation
  const knownModules = [
    { label: 'Dashboard', path: '/', perm: 'Dashboard.read' },
    { label: 'Products', path: '/products', perm: 'Products.read' },
    { label: 'Orders', path: '/orders', perm: 'Orders.read' },
    { label: 'Customers', path: '/customers', perm: 'Customers.read' },
    { label: 'Categories', path: '/categories', perm: 'Categories.read' },
    { label: 'Brands', path: '/brands', perm: 'Brands.read' },
    { label: 'Inventory', path: '/inventory', perm: 'Inventory.read' },
    { label: 'Payments', path: '/admin/payments', perm: 'Payments.read' },
    { label: 'Settings', path: '/settings', perm: 'Settings.read' },
  ];

  const accessibleModules = knownModules.filter((m) => can(m.perm));

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="mx-auto max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-lg text-card-foreground">
        {/* Shield Icon Badge */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
          <ShieldAlert className="h-8 w-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Access Restricted
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-destructive">
          403 — Forbidden
        </p>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {customMessage || (
            <>
              Your account (<span className="font-semibold text-foreground">{user?.email || 'Current User'}</span>) does not possess the required privilege to view or manage this administrative resource.
            </>
          )}
        </p>

        {/* Required Permission Banner */}
        <div className="mt-5 rounded-lg border border-border/80 bg-muted/50 p-3 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-destructive" />
            <span>Required Authorization:</span>
          </div>
          <p className="mt-1 font-mono text-xs font-bold text-foreground">
            {permString}
          </p>
          {readableLabel !== permString && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Action: {readableLabel}
            </p>
          )}
        </div>

        {/* Role & Access Info */}
        <div className="mt-3 text-xs text-muted-foreground">
          Assigned Role: <span className="font-semibold text-foreground">{user?.role?.name || 'Standard Staff'}</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>

          {can('Dashboard.read') && (
            <Button
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" /> Dashboard
            </Button>
          )}

          {!can('Dashboard.read') && accessibleModules.length > 0 && (
            <Button
              size="sm"
              onClick={() => navigate(accessibleModules[0].path)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Go to {accessibleModules[0].label}
            </Button>
          )}
        </div>

        {/* Quick Links to Permitted Modules */}
        {accessibleModules.length > 0 && (
          <div className="mt-6 border-t border-border pt-4 text-left">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Available Sections For Your Role:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {accessibleModules.slice(0, 5).map((mod) => (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {mod.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out Option */}
        <div className="mt-6 pt-4 border-t border-border flex justify-center">
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign in with different account
          </button>
        </div>
      </div>
    </div>
  );
}
