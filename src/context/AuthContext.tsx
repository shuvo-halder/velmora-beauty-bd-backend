import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";

export interface Permission {
  module: string;
  action: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    permissions?: Permission[];
  };
}

export type PermissionInput =
  | string
  | { module: string; action: string }
  | [string, string];

export const normalizeAction = (action: string): string => {
  const act = (action || '').toLowerCase().trim();
  if (act === 'create' || act === 'update' || act === 'edit' || act === 'add' || act === 'patch') {
    return 'write';
  }
  return act;
};

export const parsePermission = (
  input: PermissionInput,
  actionArg?: string
): { module: string; action: string } => {
  if (Array.isArray(input)) {
    return {
      module: (input[0] || '').trim().toLowerCase(),
      action: normalizeAction(input[1] || 'read'),
    };
  }
  if (typeof input === 'object' && input !== null) {
    return {
      module: (input.module || '').trim().toLowerCase(),
      action: normalizeAction(input.action || 'read'),
    };
  }
  const str = String(input).trim();
  if (!actionArg && (str.includes('.') || str.includes(':'))) {
    const delimiter = str.includes('.') ? '.' : ':';
    const parts = str.split(delimiter);
    return {
      module: parts[0].trim().toLowerCase(),
      action: normalizeAction(parts[1]?.trim() || 'read'),
    };
  }
  return {
    module: str.toLowerCase(),
    action: normalizeAction(actionArg || 'read'),
  };
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  hasPermission: (moduleOrPerm: PermissionInput, action?: string) => boolean;
  can: (moduleOrPerm: PermissionInput, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSuperAdmin: false,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
  can: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const { data } = await api.get("/auth/me");
          setUser(data.data);
        } catch (error) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", refreshToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const isSuperAdmin = Boolean(
    user &&
    user.role &&
    (user.role.name === "SuperAdmin" || user.role.name === "Super Admin")
  );

  const hasPermission = (moduleOrPerm: PermissionInput, action?: string): boolean => {
    if (!user) return false;
    // SuperAdmin has full access based on authenticated session data
    if (user.role?.name === "SuperAdmin" || user.role?.name === "Super Admin") return true;
    if (!user.role?.permissions || !Array.isArray(user.role.permissions)) return false;

    const target = parsePermission(moduleOrPerm, action);
    if (!target.module) return false;

    // Special case for global Archive access: allow if user has any read permission across catalog, sales, marketing, content, or system
    if (target.module === "archive" && (target.action === "read" || target.action === "write")) {
      const hasExplicitArchive = user.role.permissions.some(
        (p) => (p.module || "").trim().toLowerCase() === "archive"
      );
      if (hasExplicitArchive) return true;

      // Allow archive page access if admin has read permissions to any primary module
      const allowedModules = [
        "products", "categories", "brands", "orders", "payments", "refunds",
        "returns", "shipments", "coupons", "promotions", "marketing", "banners",
        "popups", "cms", "landingpages", "blog", "faq", "users", "roles"
      ];
      return user.role.permissions.some((p) => {
        const pMod = (p.module || "").trim().toLowerCase();
        return allowedModules.includes(pMod) || pMod === "all" || pMod === "*";
      });
    }

    return user.role.permissions.some((p) => {
      const permMod = (p.module || '').trim().toLowerCase();
      const permAct = normalizeAction(p.action || '');

      const moduleMatches =
        permMod === target.module ||
        permMod === 'all' ||
        permMod === '*' ||
        target.module === 'all';

      const actionMatches =
        permAct === target.action ||
        permAct === 'all' ||
        permAct === '*' ||
        (permAct === 'write' && (target.action === 'read' || target.action === 'write'));

      return moduleMatches && actionMatches;
    });
  };

  const can = (moduleOrPerm: PermissionInput, action?: string): boolean => {
    return hasPermission(moduleOrPerm, action);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSuperAdmin,
        login,
        logout,
        hasPermission,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function usePermission(moduleOrPerm?: PermissionInput, action?: string) {
  const { hasPermission, can, isSuperAdmin, user, loading } = useAuth();
  const hasAccess = moduleOrPerm ? hasPermission(moduleOrPerm, action) : true;
  return {
    can,
    hasPermission,
    isSuperAdmin,
    hasAccess,
    user,
    loading,
    permissions: user?.role?.permissions || [],
  };
}

