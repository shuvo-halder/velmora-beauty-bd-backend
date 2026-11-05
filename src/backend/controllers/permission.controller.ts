import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middlewares/auth";
import { AuditService } from "../services/audit.service";
import { PermissionService } from "../services/permission.service";

// GET /api/v1/permissions
export const getAllPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    res.status(200).json({
      status: "success",
      results: permissions.length,
      data: { permissions },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/roles/:id/permissions
export const updateRolePermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { permissionIds, permissions } = req.body;

    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { users: { where: { deletedAt: null }, select: { id: true } } },
    });

    if (!role) {
      return next(new AppError("Role not found", 404, "NOT_FOUND"));
    }

    // Protection for SuperAdmin role permissions
    if (role.name === "SuperAdmin") {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "MODIFY_SUPERADMIN_ROLE_PERMISSIONS",
        { roleId: id },
        req
      );
      return next(new AppError("SuperAdmin permissions are protected and cannot be modified", 403, "SUPERADMIN_PROTECTED"));
    }

    let targetPermissionIds: string[] = [];

    if (Array.isArray(permissionIds)) {
      targetPermissionIds = permissionIds;
    } else if (Array.isArray(permissions)) {
      if (permissions.length > 0 && typeof permissions[0] === "string") {
        targetPermissionIds = permissions;
      } else if (permissions.length > 0 && typeof permissions[0] === "object") {
        const allDbPerms = await prisma.permission.findMany();
        targetPermissionIds = permissions
          .map((pObj: { module: string; action: string }) => {
            const found = allDbPerms.find(
              (dp) =>
                dp.module.toLowerCase() === pObj.module.toLowerCase() &&
                dp.action.toLowerCase() === pObj.action.toLowerCase()
            );
            return found ? found.id : null;
          })
          .filter(Boolean) as string[];
      }
    } else {
      return next(new AppError("permissionIds or permissions array is required", 400, "MISSING_FIELDS"));
    }

    // Verify permission IDs exist in database
    const validPerms = await prisma.permission.findMany({
      where: { id: { in: targetPermissionIds } },
      select: { id: true },
    });

    const validIds = validPerms.map((p) => p.id);

    // Privilege escalation check: Non-SuperAdmin cannot grant permissions they do not possess
    if (!PermissionService.isSuperAdmin(req.user)) {
      const isAuthorized = await PermissionService.validateUserCanAssignPermissions(
        req.user!,
        validIds
      );

      if (!isAuthorized) {
        await AuditService.logPrivilegeEscalationAttempt(
          req.user?.id || null,
          "GRANT_UNHELD_PERMISSIONS_ON_ROLE_UPDATE",
          { roleId: id, roleName: role.name, targetPermissionIds: validIds },
          req
        );
        return next(
          new AppError(
            "Privilege escalation prevented: You cannot grant permissions that you do not possess",
            403,
            "PRIVILEGE_ESCALATION_BLOCKED"
          )
        );
      }
    }

    // Update role's permission connections
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        permissions: {
          set: validIds.map((permId) => ({ id: permId })),
        },
      },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true,
          },
        },
      },
    });

    // REFRESH TOKEN SAFETY: Revoke refresh tokens for all active users assigned to this role
    const assignedUserIds = role.users.map((u) => u.id);
    if (assignedUserIds.length > 0) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: { in: assignedUserIds },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    await AuditService.logPermissionChanged(
      req.user?.id || null,
      id,
      role.name,
      { permissionIds: validIds, revokedUsersCount: assignedUserIds.length },
      req
    );

    res.status(200).json({
      status: "success",
      message: `Permissions updated for role ${role.name}`,
      data: { role: updatedRole },
    });
  } catch (error) {
    next(error);
  }
};
