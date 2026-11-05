import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middlewares/auth";
import { AuditService } from "../services/audit.service";
import { PermissionService } from "../services/permission.service";

// GET /api/v1/roles
export const getAllRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true,
          },
        },
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      status: "success",
      results: roles.length,
      data: { roles },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/roles/:id
export const getRoleById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true,
            description: true,
          },
        },
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
    });

    if (!role) {
      return next(new AppError("Role not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { role },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/roles
export const createRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return next(new AppError("Role name is required", 400, "MISSING_FIELDS"));
    }

    if (name.trim().toLowerCase() === "superadmin") {
      return next(new AppError("Cannot create a role named SuperAdmin", 400, "INVALID_ROLE_NAME"));
    }

    const existingRole = await prisma.role.findFirst({
      where: { name: { equals: name.trim() }, deletedAt: null },
    });

    if (existingRole) {
      return next(new AppError("A role with this name already exists", 400, "DUPLICATE_ROLE"));
    }

    // Privilege escalation check: Non-SuperAdmin cannot grant permissions they do not possess
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const isAuthorized = await PermissionService.validateUserCanAssignPermissions(
        req.user!,
        permissionIds
      );

      if (!isAuthorized) {
        await AuditService.logPrivilegeEscalationAttempt(
          req.user?.id || null,
          "GRANT_UNHELD_PERMISSIONS_ON_ROLE_CREATE",
          { roleName: name, requestedPermissionIds: permissionIds },
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

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description,
        permissions: permissionIds && Array.isArray(permissionIds)
          ? { connect: permissionIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        permissions: true,
      },
    });

    await AuditService.logRoleCreated(
      req.user?.id || null,
      role.id,
      role.name,
      req
    );

    res.status(201).json({
      status: "success",
      data: { role },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/roles/:id
export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
    });

    if (!role) {
      return next(new AppError("Role not found", 404, "NOT_FOUND"));
    }

    if (role.name === "SuperAdmin") {
      if (name && name !== "SuperAdmin") {
        return next(new AppError("SuperAdmin role name cannot be modified", 403, "SUPERADMIN_PROTECTED"));
      }
      if (!PermissionService.isSuperAdmin(req.user)) {
        return next(new AppError("SuperAdmin role can only be modified by SuperAdmin", 403, "SUPERADMIN_PROTECTED"));
      }
    }

    if (name && name.trim().toLowerCase() === "superadmin" && role.name !== "SuperAdmin") {
      return next(new AppError("Cannot rename a role to SuperAdmin", 400, "INVALID_ROLE_NAME"));
    }

    if (name && name.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await prisma.role.findFirst({
        where: { name: { equals: name.trim() }, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        return next(new AppError("A role with this name already exists", 400, "DUPLICATE_ROLE"));
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : role.name,
        description: description !== undefined ? description : role.description,
      },
      include: {
        permissions: true,
      },
    });

    await AuditService.logRoleUpdated(
      req.user?.id || null,
      id,
      updatedRole.name,
      { name, description },
      req
    );

    res.status(200).json({
      status: "success",
      data: { role: updatedRole },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/roles/:id
export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Self-role deletion check
    if (req.user?.roleId === id) {
      return next(new AppError("You cannot delete your own role", 403, "CANNOT_DELETE_OWN_ROLE"));
    }

    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
    });

    if (!role) {
      return next(new AppError("Role not found", 404, "NOT_FOUND"));
    }

    if (role.name === "SuperAdmin") {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "DELETE_SUPERADMIN_ROLE",
        { roleId: id },
        req
      );
      return next(new AppError("SuperAdmin role cannot be deleted", 403, "SUPERADMIN_PROTECTED"));
    }

    if (role._count.users > 0) {
      return next(
        new AppError(`Cannot delete role with ${role._count.users} active user(s) assigned. Reassign users first.`, 400, "ROLE_HAS_USERS")
      );
    }

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await AuditService.logRoleDeleted(
      req.user?.id || null,
      id,
      role.name,
      req
    );

    res.status(200).json({
      status: "success",
      message: "Role deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
