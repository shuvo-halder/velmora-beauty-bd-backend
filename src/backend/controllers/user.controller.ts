import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middlewares/auth";
import { AuditService } from "../services/audit.service";
import { PermissionService } from "../services/permission.service";

// GET /api/v1/users
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/:id
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              select: {
                id: true,
                name: true,
                module: true,
                action: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, roleId } = req.body;

    if (!firstName || !email || !password || !roleId) {
      return next(new AppError("First name, email, password, and role ID are required", 400, "MISSING_FIELDS"));
    }

    if (password.length < 12) {
      return next(new AppError("Password must be at least 12 characters long", 400, "INVALID_PASSWORD"));
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (existingUser) {
      return next(new AppError("A user with this email already exists", 400, "EMAIL_IN_USE"));
    }

    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole || targetRole.deletedAt) {
      return next(new AppError("Role not found", 404, "ROLE_NOT_FOUND"));
    }

    // Privilege escalation check: Non-SuperAdmin cannot create a user with the SuperAdmin role
    if (targetRole.name === "SuperAdmin" && !PermissionService.isSuperAdmin(req.user)) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "CREATE_SUPERADMIN_USER",
        { targetEmail: email, targetRoleId: roleId },
        req
      );
      return next(new AppError("Only SuperAdmin can create SuperAdmin accounts", 403, "SUPERADMIN_PROTECTED"));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash,
        roleId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    await AuditService.logUserCreated(
      req.user?.id || null,
      user.id,
      user.email,
      targetRole.name,
      req
    );

    res.status(201).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/users/:id
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    // Privilege escalation check: Non-SuperAdmin cannot modify SuperAdmin profile
    if (user.role?.name === "SuperAdmin" && !PermissionService.isSuperAdmin(req.user)) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "MODIFY_SUPERADMIN_PROFILE",
        { targetUserId: id, targetEmail: user.email },
        req
      );
      return next(new AppError("Only SuperAdmin can modify SuperAdmin accounts", 403, "SUPERADMIN_PROTECTED"));
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), deletedAt: null, NOT: { id } },
      });
      if (existing) {
        return next(new AppError("Email is already taken by another user", 400, "EMAIL_IN_USE"));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        email: email !== undefined ? email.toLowerCase() : user.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    await AuditService.logUserUpdated(
      req.user?.id || null,
      id,
      updatedUser.email,
      { firstName, lastName, email },
      req
    );

    res.status(200).json({
      status: "success",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/users/:id
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Self-deletion check
    if (req.user?.id === id) {
      return next(new AppError("You cannot delete your own account", 403, "CANNOT_DELETE_SELF"));
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    if (user.role?.name === "SuperAdmin") {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "DELETE_SUPERADMIN_USER",
        { targetUserId: id, targetEmail: user.email },
        req
      );
      return next(new AppError("SuperAdmin user cannot be deleted", 403, "SUPERADMIN_PROTECTED"));
    }

    // Soft delete user and revoke all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await AuditService.logUserDeleted(
      req.user?.id || null,
      id,
      user.email,
      req
    );

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/:id/status
export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, isActive } = req.body;

    let targetActive: boolean;
    if (status !== undefined) {
      targetActive = status.toUpperCase() === "ACTIVE";
    } else if (isActive !== undefined) {
      targetActive = Boolean(isActive);
    } else {
      return next(new AppError("Status or isActive field is required", 400, "MISSING_FIELDS"));
    }

    // Self-modification safeguard
    if (req.user?.id === id && !targetActive) {
      return next(new AppError("You cannot deactivate your own account", 403, "CANNOT_DISABLE_SELF"));
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    if (user.role?.name === "SuperAdmin" && !targetActive) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "DISABLE_SUPERADMIN_USER",
        { targetUserId: id, targetEmail: user.email },
        req
      );
      return next(new AppError("SuperAdmin account cannot be disabled", 403, "SUPERADMIN_PROTECTED"));
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: targetActive },
    });

    if (!targetActive) {
      // Revoke all refresh tokens on disable
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (targetActive) {
      await AuditService.logUserEnabled(req.user?.id || null, id, user.email, req);
    } else {
      await AuditService.logUserDisabled(req.user?.id || null, id, user.email, req);
      await AuditService.logTokenRevoked(req.user?.id || null, id, "User account disabled", req);
    }

    res.status(200).json({
      status: "success",
      message: `User status updated to ${targetActive ? "ACTIVE" : "DISABLED"}`,
      data: { id, isActive: targetActive },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/:id/role
export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return next(new AppError("roleId is required", 400, "MISSING_FIELDS"));
    }

    // Self-modification safeguard
    if (req.user?.id === id) {
      return next(new AppError("You cannot modify your own role", 403, "CANNOT_MODIFY_OWN_ROLE"));
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    // Protection for existing SuperAdmin user
    if (user.role?.name === "SuperAdmin" && !PermissionService.isSuperAdmin(req.user)) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "DEMOTE_SUPERADMIN_ROLE",
        { targetUserId: id, targetEmail: user.email },
        req
      );
      return next(new AppError("SuperAdmin user cannot lose SuperAdmin role", 403, "SUPERADMIN_PROTECTED"));
    }

    const newRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!newRole || newRole.deletedAt) {
      return next(new AppError("Target role not found", 404, "ROLE_NOT_FOUND"));
    }

    // Privilege escalation: Non-SuperAdmin cannot assign SuperAdmin role
    if (newRole.name === "SuperAdmin" && !PermissionService.isSuperAdmin(req.user)) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "PROMOTE_TO_SUPERADMIN_ROLE",
        { targetUserId: id, targetEmail: user.email, targetRoleId: roleId },
        req
      );
      return next(new AppError("Only SuperAdmin can assign the SuperAdmin role", 403, "SUPERADMIN_PROTECTED"));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { roleId },
      }),
      // Revoke all refresh tokens when role changes
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await AuditService.logRoleChanged(
      req.user?.id || null,
      id,
      user.email,
      user.role.name,
      newRole.name,
      req
    );
    await AuditService.logTokenRevoked(req.user?.id || null, id, "User role changed", req);

    res.status(200).json({
      status: "success",
      message: `User role updated to ${newRole.name}`,
      data: { id, roleId, roleName: newRole.name },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users/:id/force-logout
export const forceLogoutUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await AuditService.logTokenRevoked(req.user?.id || null, id, "Manual force logout", req);

    res.status(200).json({
      status: "success",
      message: "User logged out successfully (sessions revoked)",
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/:id/reset-password
export const adminResetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return next(new AppError("newPassword is required", 400, "MISSING_FIELDS"));
    }

    if (newPassword.length < 12) {
      return next(new AppError("Password must be at least 12 characters long", 400, "INVALID_PASSWORD"));
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404, "NOT_FOUND"));
    }

    // Privilege escalation check: Non-SuperAdmin CANNOT reset password of SuperAdmin
    if (user.role?.name === "SuperAdmin" && !PermissionService.isSuperAdmin(req.user)) {
      await AuditService.logPrivilegeEscalationAttempt(
        req.user?.id || null,
        "RESET_SUPERADMIN_PASSWORD",
        { targetUserId: id, targetEmail: user.email },
        req
      );
      return next(new AppError("Only SuperAdmin can reset the password of a SuperAdmin account", 403, "SUPERADMIN_PROTECTED"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }),
      // Revoke active sessions on forced password reset
      prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await AuditService.logPasswordReset(
      req.user?.id || null,
      id,
      user.email,
      req
    );
    await AuditService.logTokenRevoked(req.user?.id || null, id, "Forced password reset", req);

    res.status(200).json({
      status: "success",
      message: "User password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
