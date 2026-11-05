import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export interface PermissionPair {
  id?: string;
  module: string;
  action: string;
}

export type PermissionInput = string | PermissionPair | [string, string];

export interface UserPermissionContext {
  id: string;
  email: string;
  roleId: string;
  roleName?: string;
  permissions: PermissionPair[];
}

export class PermissionService {
  /**
   * Evaluates whether a user holds the SuperAdmin role.
   * SuperAdmin role bypasses individual permission lookups.
   */
  public static isSuperAdmin(
    user?: { roleName?: string; role?: { name: string } } | null
  ): boolean {
    if (!user) return false;
    const roleName = user.roleName || user.role?.name;
    return roleName === "SuperAdmin";
  }

  /**
   * Normalizes action names to accommodate legacy synonyms.
   * Maps 'create', 'update', 'edit', 'add' to 'write'.
   */
  public static normalizeAction(action: string): string {
    const act = action.toLowerCase().trim();
    if (act === "create" || act === "update" || act === "edit" || act === "add" || act === "patch") {
      return "write";
    }
    return act;
  }

  /**
   * Parses permission input into canonical { module, action } object.
   * Supports:
   * - "products.read"
   * - ("Products", "read")
   * - { module: "Products", action: "read" }
   * - ["Products", "read"]
   */
  public static parsePermission(
    input: PermissionInput,
    actionArg?: string
  ): { module: string; action: string } {
    if (Array.isArray(input)) {
      return {
        module: input[0].trim().toLowerCase(),
        action: this.normalizeAction(input[1]?.trim() || "read"),
      };
    }

    if (typeof input === "object" && input !== null) {
      return {
        module: input.module.trim().toLowerCase(),
        action: this.normalizeAction(input.action.trim()),
      };
    }

    const str = String(input);
    if (!actionArg && str.includes(".")) {
      const parts = str.split(".");
      return {
        module: parts[0].trim().toLowerCase(),
        action: this.normalizeAction(parts[1].trim().toLowerCase()),
      };
    }

    return {
      module: str.trim().toLowerCase(),
      action: this.normalizeAction(actionArg || "read"),
    };
  }

  /**
   * Checks if user has a specific permission.
   * Returns true if SuperAdmin or if user possesses required permission.
   *
   * @param user User object or UserPermissionContext
   * @param permissionOrModule e.g. "Products.read", "Products", { module: "Products", action: "read" }
   * @param action e.g. "read" or "write" (optional if input is "module.action" or object)
   */
  public static hasPermission(
    user: UserPermissionContext | null | undefined,
    permissionOrModule: PermissionInput,
    action?: string
  ): boolean {
    if (!user) return false;

    // SuperAdmin bypass
    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (!user.permissions || !Array.isArray(user.permissions) || user.permissions.length === 0) {
      return false;
    }

    const target = this.parsePermission(permissionOrModule, action);

    return user.permissions.some((p) => {
      const permMod = (p.module || "").trim().toLowerCase();
      const permAct = this.normalizeAction(p.action || "");

      // Wildcard match for module (e.g. "all" or "*")
      const moduleMatches =
        permMod === target.module ||
        permMod === "all" ||
        permMod === "*" ||
        target.module === "all";

      // Wildcard match for action (e.g. "all" or "*")
      const actionMatches =
        permAct === target.action ||
        permAct === "all" ||
        permAct === "*" ||
        (permAct === "write" && (target.action === "read" || target.action === "write"));

      return moduleMatches && actionMatches;
    });
  }

  /**
   * Checks if user has ANY of the specified permissions.
   *
   * @param user User object or UserPermissionContext
   * @param permissions Array of permission strings, tuples, or objects
   */
  public static hasAnyPermission(
    user: UserPermissionContext | null | undefined,
    permissions: PermissionInput[]
  ): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    return permissions.some((perm) => this.hasPermission(user, perm));
  }

  /**
   * Checks if user has ALL of the specified permissions.
   *
   * @param user User object or UserPermissionContext
   * @param permissions Array of permission strings, tuples, or objects
   */
  public static hasAllPermissions(
    user: UserPermissionContext | null | undefined,
    permissions: PermissionInput[]
  ): boolean {
    if (!user) return false;
    if (this.isSuperAdmin(user)) return true;

    return permissions.every((perm) => this.hasPermission(user, perm));
  }

  /**
   * Resolves all effective permissions for an admin user by ID from the database.
   * Always queries fresh data from database to prevent stale token bypasses.
   */
  public static async resolveUserPermissions(userId: string): Promise<UserPermissionContext | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                select: {
                  id: true,
                  module: true,
                  action: true,
                },
              },
            },
          },
        },
      });

      if (!user || user.deletedAt !== null) {
        return null;
      }

      const role = user.role;
      const roleName = role?.name || "";
      const permissions = role?.permissions || [];

      return {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: roleName,
        permissions: permissions.map((p) => ({
          id: p.id,
          module: p.module,
          action: p.action,
        })),
      };
    } catch (error) {
      console.error("Failed to resolve user permissions from DB:", error);
      return null;
    }
  }

  /**
   * Privilege Escalation Guard:
   * Validates if a grantor user is permitted to assign the specified permission IDs to a role.
   * - SuperAdmin can grant any permissions.
   * - Non-SuperAdmin can ONLY grant permissions that they themselves hold.
   */
  public static async validateUserCanAssignPermissions(
    grantorUserOrId: UserPermissionContext | { roleName?: string; roleId?: string; id?: string; permissions?: Array<{ id?: string; module: string; action: string }> } | string,
    targetPermissionIds: string[],
    permissionIdMap?: Record<string, { module: string; action: string }>
  ): Promise<boolean> {
    let grantorUser: { roleName?: string; roleId?: string; id?: string; permissions?: Array<{ id?: string; module: string; action: string }> } | null = null;

    if (typeof grantorUserOrId === "string") {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: grantorUserOrId },
          include: { role: true },
        });
        if (!dbUser) return false;
        grantorUser = {
          id: dbUser.id,
          roleId: dbUser.roleId,
          roleName: dbUser.role?.name,
        };
      } catch (error) {
        return false;
      }
    } else {
      grantorUser = grantorUserOrId;
    }

    // SuperAdmin can assign any permissions
    if (this.isSuperAdmin(grantorUser as any)) {
      return true;
    }

    if (!grantorUser?.roleId && !grantorUser?.id) {
      return false;
    }

    // If grantor already has permission list in memory with IDs
    if (grantorUser.permissions && grantorUser.permissions.length > 0) {
      const grantorPermIdSet = new Set(grantorUser.permissions.map((p) => p.id).filter(Boolean));
      const grantorHasAllAction = grantorUser.permissions.some(
        (p) => p.action === "all" || p.action === "*"
      );

      if (grantorHasAllAction) {
        return true;
      }

      // If map or IDs provided
      if (grantorPermIdSet.size > 0) {
        const allMatch = targetPermissionIds.every((id) => grantorPermIdSet.has(id));
        if (allMatch) return true;
      }

      // If permissionIdMap is provided, check module/action matches
      if (permissionIdMap) {
        return targetPermissionIds.every((targetId) => {
          const targetPerm = permissionIdMap[targetId];
          if (!targetPerm) return false;
          return this.hasPermission(grantorUser as any, targetPerm.module, targetPerm.action);
        });
      }
    }

    // Fetch grantor's active permissions from database
    try {
      const grantorPermissions = await prisma.permission.findMany({
        where: {
          roles: {
            some: {
              id: grantorUser.roleId,
              deletedAt: null,
            },
          },
        },
        select: { id: true, module: true, action: true },
      });

      const grantorPermIds = new Set(grantorPermissions.map((p) => p.id));
      const grantorHasAllAction = grantorPermissions.some(
        (p) => p.action === "all" || p.action === "*"
      );

      if (grantorHasAllAction) {
        return true;
      }

      return targetPermissionIds.every((id) => grantorPermIds.has(id));
    } catch (error) {
      console.warn("DB lookup in validateUserCanAssignPermissions failed:", error);
      return false;
    }
  }

  /**
   * Helper to retrieve all system permissions.
   */
  public static async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
  }
}
