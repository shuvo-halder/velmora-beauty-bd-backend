import React from "react";
import { useAuth, PermissionInput } from "../../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { AccessDenied } from "../common/AccessDenied";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
  module?: string;
  action?: string;
  permission?: PermissionInput;
  requiredPermission?: PermissionInput;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  module, 
  action = "read", 
  permission,
  requiredPermission,
  children, 
  fallback = null 
}) => {
  const { can } = useAuth();
  
  const permToCheck = permission || requiredPermission || (module ? { module, action } : undefined);
  if (!permToCheck) return <>{children}</>;

  if (!can(permToCheck, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoutePermissionGuardProps {
  module?: string;
  action?: string;
  permission?: PermissionInput;
  requiredPermission?: PermissionInput;
  children: React.ReactNode;
  customMessage?: string;
}

export const RoutePermissionGuard: React.FC<RoutePermissionGuardProps> = ({
  module,
  action = "read",
  permission,
  requiredPermission,
  children,
  customMessage,
}) => {
  const { can, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm font-medium">Verifying access credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const permToCheck = permission || requiredPermission || (module ? { module, action } : undefined);
  
  if (permToCheck && !can(permToCheck, action)) {
    const permString =
      typeof permToCheck === "string"
        ? permToCheck
        : Array.isArray(permToCheck)
        ? `${permToCheck[0]}.${permToCheck[1]}`
        : `${permToCheck.module}.${permToCheck.action}`;

    return (
      <AccessDenied
        requiredPermission={permString}
        module={module}
        action={action}
        customMessage={customMessage}
      />
    );
  }

  return <>{children}</>;
};

// Aliases for clear semantic route declarations
export const AdminPermissionRoute = RoutePermissionGuard;
