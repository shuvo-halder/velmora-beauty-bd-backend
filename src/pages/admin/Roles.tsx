import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRoles, createRole, updateRole, deleteRole } from "../../services/role.service";
import { getPermissions } from "../../services/permission.service";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { RoleFormModal } from "../../components/admin/roles/RoleFormModal";
import { DeleteRoleModal } from "../../components/admin/roles/DeleteRoleModal";
import { notify } from "../../lib/notify";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldPlus,
  Edit,
  Copy,
  Trash2,
  Search,
  Users,
  KeyRound,
  Layers,
  Crown,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export function Roles() {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();

  const [search, setSearch] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalRole, setFormModalRole] = useState<any | null>(null);
  const [isCloneMode, setIsCloneMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);

  // Fetch all roles
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  // Fetch all permissions dynamically from backend
  const { data: allPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const roles = useMemo(() => {
    if (!rolesData) return [];
    return rolesData.roles || rolesData;
  }, [rolesData]);

  // Filter roles by search
  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r: any) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, search]);

  const isCurrentUserSuperAdmin = user?.role?.name === "SuperAdmin";
  const currentUserPermissions = user?.role?.permissions || [];

  // Create or Update Role Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissionIds: string[] }) => {
      if (formModalRole && !isCloneMode) {
        await updateRole(formModalRole.id, {
          name: data.name,
          description: data.description,
        });
      } else {
        await createRole({
          name: data.name,
          description: data.description,
          permissionIds: data.permissionIds,
        });
      }
    },
    onSuccess: () => {
      setIsFormModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify.success(
        formModalRole && !isCloneMode ? "Role Updated" : "Role Created",
        "Role permissions and details have been synchronized."
      );
    },
    onError: (err) => {
      notify.apiError(err, "Failed to save role configuration.");
    },
  });

  // Delete Role Mutation
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await deleteRole(roleId);
    },
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      const name = roleToDelete?.name;
      setRoleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify.success("Role Deleted", `Custom role "${name || "Role"}" was deleted.`);
    },
    onError: (err) => {
      notify.apiError(err, "Failed to delete role.");
    },
  });

  const handleOpenCreateModal = () => {
    setFormModalRole(null);
    setIsCloneMode(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (role: any) => {
    setFormModalRole(role);
    setIsCloneMode(false);
    setIsFormModalOpen(true);
  };

  const handleOpenCloneModal = (role: any) => {
    setFormModalRole(role);
    setIsCloneMode(true);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (role: any) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  if (isLoadingRoles || isLoadingPerms) return <LoadingSpinner />;

  const totalAssignedUsers = roles.reduce(
    (acc: number, r: any) => acc + (r._count?.users || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Roles & Access Control
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure administrative role definitions and enforce granular module authorization policies
              </p>
            </div>
          </div>
        </div>

        {hasPermission("Roles", "write") && (
          <Button onClick={handleOpenCreateModal} className="shrink-0 shadow-xs">
            <ShieldPlus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Roles</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {roles.length}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {roles.filter((r: any) => r.name === "SuperAdmin").length} Root System Role,{" "}
            {roles.filter((r: any) => r.name !== "SuperAdmin").length} Custom Roles
          </p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Admin Users</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {totalAssignedUsers}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Administrators bound to RBAC security policies
          </p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Available Permissions</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {allPermissions.length}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Granular action tokens across 32 platform modules
          </p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Your Active Role</p>
              <h3 className="text-lg font-bold tracking-tight text-foreground mt-1 truncate">
                {user?.role?.name || "Viewer"}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              {isCurrentUserSuperAdmin ? <Crown className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {isCurrentUserSuperAdmin
              ? "Full Unrestricted Root Authority"
              : `${currentUserPermissions.length} Granted Permissions`}
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Roles List Table */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[260px] font-semibold text-xs">Role Name & Type</TableHead>
                <TableHead className="font-semibold text-xs">Description</TableHead>
                <TableHead className="w-[120px] font-semibold text-xs text-center">Assigned Staff</TableHead>
                <TableHead className="w-[180px] font-semibold text-xs">Permissions Overview</TableHead>
                <TableHead className="text-right font-semibold text-xs w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role: any) => {
                const isSuperAdmin = role.name === "SuperAdmin";
                const isOwnRole = user?.role?.id === role.id;
                const userCount = role._count?.users || 0;
                const grantedPermsCount = isSuperAdmin
                  ? allPermissions.length
                  : role.permissions?.length || 0;

                return (
                  <TableRow key={role.id} className="hover:bg-muted/40 transition-colors">
                    {/* Name & Badge */}
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {role.name}
                          </span>
                          {isSuperAdmin ? (
                            <Badge variant="default" className="text-[10px] h-4 px-1.5 gap-1 bg-primary">
                              <Crown className="h-2.5 w-2.5" />
                              SuperAdmin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              Custom Role
                            </Badge>
                          )}
                        </div>
                        {isOwnRole && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            • Your Current Role
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell className="align-top py-3.5">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {role.description || "No description provided."}
                      </p>
                    </TableCell>

                    {/* Assigned Users */}
                    <TableCell className="align-top py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-semibold">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{userCount}</span>
                      </div>
                    </TableCell>

                    {/* Permissions Overview */}
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {grantedPermsCount} of {allPermissions.length}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {allPermissions.length > 0
                              ? Math.round((grantedPermsCount / allPermissions.length) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isSuperAdmin
                                ? "bg-primary w-full"
                                : grantedPermsCount > 0
                                ? "bg-indigo-600"
                                : "bg-muted-foreground/30"
                            }`}
                            style={{
                              width: isSuperAdmin
                                ? "100%"
                                : `${(grantedPermsCount / (allPermissions.length || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right align-top py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Manage Permissions */}
                        <Link to={`/admin/roles/${role.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium px-2.5 shadow-2xs"
                            title="Manage granular module permissions"
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1 text-primary" />
                            Permissions
                          </Button>
                        </Link>

                        {/* Clone */}
                        {hasPermission("Roles", "write") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Clone role"
                            onClick={() => handleOpenCloneModal(role)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Edit Role Details */}
                        {hasPermission("Roles", "write") && !isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit role identification"
                            onClick={() => handleOpenEditModal(role)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Delete Role */}
                        {hasPermission("Roles", "delete") && !isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete role"
                            onClick={() => handleOpenDeleteModal(role)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">No roles found matching "{search}"</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setSearch("")}
              >
                Clear Search Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit / Clone Modal */}
      <RoleFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={async (formData) => {
          await saveMutation.mutateAsync(formData);
        }}
        initialRole={formModalRole}
        isClone={isCloneMode}
        availableRoles={roles}
        allPermissions={allPermissions}
        currentUserPermissions={currentUserPermissions}
        isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
        isPending={saveMutation.isPending}
      />

      {/* Safe Delete Role Modal */}
      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (roleToDelete) {
            await deleteMutation.mutateAsync(roleToDelete.id);
          }
        }}
        role={roleToDelete}
        currentUserRoleId={user?.role?.id}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
