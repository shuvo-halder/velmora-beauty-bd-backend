import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  adminResetPassword,
  updateUserRole,
  forceLogoutUser,
} from "../../services/user.service";
import { getRoles } from "../../services/role.service";
import { getPermissions } from "../../services/permission.service";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Checkbox } from "../../components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import { UserFormModal } from "../../components/admin/users/UserFormModal";
import { UserEffectivePermissionsModal } from "../../components/admin/users/UserEffectivePermissionsModal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { notify } from "../../lib/notify";
import {
  Users as UsersIcon,
  UserPlus,
  Edit,
  Trash2,
  Lock,
  Power,
  Search,
  CheckSquare,
  KeyRound,
  Crown,
  ShieldCheck,
  MoreVertical,
  LogOut,
  ShieldAlert,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function Users() {
  const queryClient = useQueryClient();
  const { hasPermission, user: currentUser } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [targetPermissionUser, setTargetPermissionUser] = useState<any | null>(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Confirmation dialog states
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToForceLogout, setUserToForceLogout] = useState<any | null>(null);
  const [bulkActionType, setBulkActionType] = useState<"activate" | "deactivate" | null>(null);

  // Queries
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users", page, limit, search],
    queryFn: () => getUsers({ page, limit, search }),
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: allPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const users = usersData?.data?.users || usersData?.data || [];
  const totalPages = usersData?.meta?.totalPages || 1;
  const roles = rolesData?.roles || rolesData || [];

  const isCurrentUserSuperAdmin = currentUser?.role?.name === "SuperAdmin";

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUsers([]);
      notify.success("Status Updated", `User status updated to ${variables.isActive ? "Active" : "Inactive"}.`);
    },
    onError: (error: any) => {
      notify.apiError(error, "Failed to update user status.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      adminResetPassword(id, newPassword),
    onSuccess: () => {
      setIsResetPasswordModalOpen(false);
      setUserToResetPassword(null);
      setNewPasswordValue("");
      notify.success("Password Reset", "Temporary password has been set. All previous active sessions were revoked.");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || "Error resetting password";
      setResetPasswordError(msg);
      notify.apiError(error, "Failed to reset password.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify.success("Administrator Deleted", `Administrator account ${userToDelete?.email || ""} was removed.`);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      notify.apiError(error, "Failed to delete administrator account.");
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: forceLogoutUser,
    onSuccess: () => {
      notify.success("Sessions Revoked", `Active sessions for ${userToForceLogout?.email || "user"} have been terminated.`);
      setUserToForceLogout(null);
    },
    onError: (error: any) => {
      notify.apiError(error, "Failed to revoke active user sessions.");
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingUser) {
        await updateUser(editingUser.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        });
        if (formData.roleId && formData.roleId !== editingUser.roleId) {
          await updateUserRole(editingUser.id, formData.roleId);
        }
      } else {
        await createUser(formData);
      }
    },
    onSuccess: () => {
      setIsFormModalOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify.success(editingUser ? "User Updated" : "User Created", `Administrator account successfully ${editingUser ? "updated" : "provisioned"}.`);
    },
    onError: (error: any) => {
      notify.apiError(error, "Failed to save administrator account.");
    },
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleOpenEffectivePermissions = (user: any) => {
    setTargetPermissionUser(user);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenResetPassword = (user: any) => {
    setUserToResetPassword(user);
    setNewPasswordValue("");
    setResetPasswordError(null);
    setIsResetPasswordModalOpen(true);
  };

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(
        users
          .filter((u: any) => u.role?.name !== "SuperAdmin" && u.id !== currentUser?.id)
          .map((u: any) => u.id)
      );
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, id]);
    } else {
      setSelectedUsers(selectedUsers.filter((uId) => uId !== id));
    }
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkActionType) return;
    const isActive = bulkActionType === "activate";
    try {
      for (const id of selectedUsers) {
        await toggleStatusMutation.mutateAsync({ id, isActive });
      }
      notify.success("Bulk Action Complete", `Successfully ${isActive ? "activated" : "deactivated"} ${selectedUsers.length} administrators.`);
      setSelectedUsers([]);
      setBulkActionType(null);
    } catch (err) {
      notify.apiError(err, "An error occurred during bulk operation.");
    }
  };

  if (isLoadingUsers || isLoadingRoles || isLoadingPerms) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin Users & Staff
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage administrator accounts, assign access roles, and inspect effective permission policies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && hasPermission("Users", "write") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionType("activate")}
                className="text-xs"
              >
                <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Activate ({selectedUsers.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setBulkActionType("deactivate")}
              >
                <Power className="mr-1.5 h-3.5 w-3.5" />
                Deactivate ({selectedUsers.length})
              </Button>
            </>
          )}

          {hasPermission("Users", "write") && (
            <Button onClick={handleOpenCreateModal} className="shadow-xs text-xs h-9">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Administrator
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[45px]">
                  <Checkbox
                    checked={
                      selectedUsers.length > 0 &&
                      selectedUsers.length ===
                        users.filter(
                          (u: any) => u.role?.name !== "SuperAdmin" && u.id !== currentUser?.id
                        ).length
                    }
                    onChange={(e: any) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-xs">Administrator</TableHead>
                <TableHead className="font-semibold text-xs">Email</TableHead>
                <TableHead className="font-semibold text-xs">Assigned Role</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs text-center">Permissions</TableHead>
                <TableHead className="text-right font-semibold text-xs w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => {
                const isSuperAdmin = user.role?.name === "SuperAdmin";
                const isSelf = user.id === currentUser?.id;
                const canModifyUser =
                  hasPermission("Users", "write") &&
                  (!isSuperAdmin || isCurrentUserSuperAdmin);

                return (
                  <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        disabled={isSuperAdmin || isSelf}
                        onChange={(e: any) => handleSelect(user.id, e.target.checked)}
                      />
                    </TableCell>

                    {/* Name */}
                    <TableCell className="font-medium py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {user.firstName?.charAt(0) || "U"}
                          {user.lastName?.charAt(0) || ""}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground">
                              {user.firstName} {user.lastName}
                            </span>
                            {isSelf && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>

                    {/* Role */}
                    <TableCell>
                      {isSuperAdmin ? (
                        <Badge variant="default" className="text-[10px] bg-primary gap-1">
                          <Crown className="h-2.5 w-2.5" />
                          SuperAdmin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {user.role?.name || "No Role"}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "success" : "destructive"}
                        className="text-[10px] h-5"
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    {/* Effective Permissions Trigger */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleOpenEffectivePermissions(user)}
                        title="View effective permissions matrix"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect Matrix
                      </Button>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {canModifyUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit details & role"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEffectivePermissions(user)}>
                              <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Permissions
                            </DropdownMenuItem>

                            {canModifyUser && (
                              <DropdownMenuItem onClick={() => handleOpenEditModal(user)}>
                                <Edit className="mr-2 h-3.5 w-3.5" /> Edit Profile & Role
                              </DropdownMenuItem>
                            )}

                            {canModifyUser && !isSelf && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: user.id,
                                    isActive: !user.isActive,
                                  })
                                }
                              >
                                <Power className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                {user.isActive ? "Deactivate Account" : "Activate Account"}
                              </DropdownMenuItem>
                            )}

                            {canModifyUser && (
                              <DropdownMenuItem onClick={() => handleOpenResetPassword(user)}>
                                <Lock className="mr-2 h-3.5 w-3.5" /> Reset Password
                              </DropdownMenuItem>
                            )}

                            {hasPermission("Users", "write") && (
                              <DropdownMenuItem
                                onClick={() => setUserToForceLogout(user)}
                              >
                                <LogOut className="mr-2 h-3.5 w-3.5" /> Force Logout
                              </DropdownMenuItem>
                            )}

                            {hasPermission("Users", "delete") && !isSuperAdmin && !isSelf && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                  onClick={() => setUserToDelete(user)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">No administrators found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 text-xs"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={async (data) => {
          await saveUserMutation.mutateAsync(data);
        }}
        editingUser={editingUser}
        roles={roles}
        currentUserId={currentUser?.id}
        isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
        isPending={saveUserMutation.isPending}
      />

      {/* Effective Permissions Modal */}
      <UserEffectivePermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setTargetPermissionUser(null);
        }}
        user={targetPermissionUser}
        allPermissions={allPermissions}
      />

      {/* Admin Reset Password Modal */}
      {isResetPasswordModalOpen && userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-background">
            <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Reset Password</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  User: {userToResetPassword.email}
                </p>
              </div>
            </CardHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({
                  id: userToResetPassword.id,
                  newPassword: newPasswordValue,
                });
              }}
            >
              <CardContent className="p-6 space-y-4">
                {resetPasswordError && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md">
                    {resetPasswordError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    New Temporary Password
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="Min 12 characters"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    All existing active sessions for this user will be invalidated upon reset.
                  </p>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resetPasswordMutation.isPending || !newPasswordValue}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete Administrator"
        description={
          <>
            Are you sure you want to permanently remove administrator account <strong>{userToDelete?.firstName} {userToDelete?.lastName} ({userToDelete?.email})</strong>? This action cannot be undone.
          </>
        }
        confirmText="Delete Account"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
      />

      {/* Force Logout Confirmation */}
      <ConfirmDialog
        isOpen={!!userToForceLogout}
        onOpenChange={(open) => !open && setUserToForceLogout(null)}
        title="Force Session Logout"
        description={
          <>
            Are you sure you want to revoke all active sessions for <strong>{userToForceLogout?.email}</strong>? They will be immediately signed out of all devices.
          </>
        }
        confirmText="Revoke Sessions"
        variant="warning"
        isLoading={forceLogoutMutation.isPending}
        onConfirm={() => userToForceLogout && forceLogoutMutation.mutate(userToForceLogout.id)}
      />

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        isOpen={!!bulkActionType}
        onOpenChange={(open) => !open && setBulkActionType(null)}
        title={`Bulk ${bulkActionType === "activate" ? "Activation" : "Deactivation"}`}
        description={`Are you sure you want to ${bulkActionType === "activate" ? "activate" : "deactivate"} ${selectedUsers.length} selected administrator account(s)?`}
        confirmText={`Confirm ${bulkActionType === "activate" ? "Activate" : "Deactivate"}`}
        variant={bulkActionType === "deactivate" ? "destructive" : "default"}
        isLoading={toggleStatusMutation.isPending}
        onConfirm={handleExecuteBulkAction}
      />
    </div>
  );
}
