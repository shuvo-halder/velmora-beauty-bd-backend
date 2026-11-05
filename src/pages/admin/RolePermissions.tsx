import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoleById, updateRolePermissions } from "../../services/role.service";
import { getPermissions } from "../../services/permission.service";
import { useAuth } from "../../context/AuthContext";
import { PermissionMatrix } from "../../components/admin/roles/PermissionMatrix";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { notify } from "../../lib/notify";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Users,
  AlertTriangle,
  Lock,
  CheckCheck,
} from "lucide-react";

export function RolePermissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showSelfLockoutWarningDialog, setShowSelfLockoutWarningDialog] = useState(false);

  // Fetch role details
  const { data: roleData, isLoading: isLoadingRole } = useQuery({
    queryKey: ["role", id],
    queryFn: () => getRoleById(id!),
    enabled: !!id,
  });

  // Fetch all system permissions dynamically from backend
  const { data: allPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const role = roleData?.role || roleData;

  useEffect(() => {
    if (role?.permissions) {
      const ids = role.permissions.map((p: any) => p.id);
      setSelectedPermissions(ids);
      setInitialPermissions(ids);
      setIsDirty(false);
    }
  }, [role]);

  const isSuperAdminRole = role?.name === "SuperAdmin";
  const isCurrentUserSuperAdmin = user?.role?.name === "SuperAdmin";
  const isEditingSelfRole = user?.role?.id === role?.id;
  const userCount = role?._count?.users || 0;
  const currentUserPermissions = user?.role?.permissions || [];

  // Update Role Permissions Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateRolePermissions(id!, selectedPermissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setInitialPermissions([...selectedPermissions]);
      setIsDirty(false);
      setShowSelfLockoutWarningDialog(false);
      notify.success("Permissions Updated", `Permissions matrix for "${role?.name || "Role"}" saved successfully.`);
    },
    onError: (err: any) => {
      notify.apiError(err, "Failed to update role permissions.");
    },
  });

  const handlePermissionsChange = (newIds: string[]) => {
    setSelectedPermissions(newIds);
    // Compare with initial
    const initialSet = new Set<string>(initialPermissions);
    const newSet = new Set<string>(newIds);
    const hasChanged =
      initialSet.size !== newSet.size || Array.from(initialSet).some((x) => !newSet.has(x));
    setIsDirty(hasChanged);
  };

  const handleDiscard = () => {
    setSelectedPermissions([...initialPermissions]);
    setIsDirty(false);
  };

  // Check if critical self permissions were removed
  const checkSelfLockoutRisk = (): boolean => {
    if (!isEditingSelfRole || isCurrentUserSuperAdmin) return false;

    // Critical permissions that allow managing permissions
    const criticalModuleActions = [
      { module: "Roles", action: "write" },
      { module: "Roles", action: "read" },
      { module: "Users", action: "write" },
    ];

    const currentSelectedPermObjs = allPermissions.filter((p) =>
      selectedPermissions.includes(p.id)
    );

    const isMissingCritical = criticalModuleActions.some((c) => {
      const heldBefore = initialPermissions.some((id) => {
        const p = allPermissions.find((ap) => ap.id === id);
        return (
          p &&
          p.module.toLowerCase() === c.module.toLowerCase() &&
          p.action.toLowerCase() === c.action.toLowerCase()
        );
      });
      const stillHeld = currentSelectedPermObjs.some(
        (p) =>
          p.module.toLowerCase() === c.module.toLowerCase() &&
          p.action.toLowerCase() === c.action.toLowerCase()
      );
      return heldBefore && !stillHeld;
    });

    return isMissingCritical;
  };

  const handleSaveClick = () => {
    if (checkSelfLockoutRisk()) {
      setShowSelfLockoutWarningDialog(true);
    } else {
      saveMutation.mutate();
    }
  };

  if (isLoadingRole || isLoadingPerms) return <LoadingSpinner />;
  if (!role) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="text-xl font-bold">Role Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested role does not exist or has been deleted.</p>
        <Link to="/admin/roles">
          <Button variant="outline">Back to Roles</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb / Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/roles")}
            className="h-9 w-9 shrink-0"
            title="Back to Roles list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {role.name}
              </h1>
              {isSuperAdminRole ? (
                <Badge variant="default" className="text-xs bg-primary gap-1">
                  <Crown className="h-3 w-3" />
                  Root SuperAdmin
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Custom Access Role
                </Badge>
              )}
              {isEditingSelfRole && (
                <Badge variant="success" className="text-xs">
                  Your Current Role
                </Badge>
              )}
              {isDirty && (
                <Badge variant="warning" className="text-xs animate-pulse">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {role.description || "Manage granted module permissions and access rights."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saveMutation.isPending}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Discard
            </Button>
          )}

          <Button
            type="button"
            disabled={!isDirty || saveMutation.isPending || isSuperAdminRole}
            onClick={handleSaveClick}
            className="shadow-xs"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saveMutation.isPending ? "Saving Permissions..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* SuperAdmin Banner */}
      {isSuperAdminRole && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-start gap-3.5">
          <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Root Super Administrator Role</h4>
            <p className="text-xs leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              The <strong>SuperAdmin</strong> role has absolute, unrestricted access to all modules, actions,
              and settings. In accordance with system security rules, SuperAdmin permissions are implicitly
              active across the entire platform and cannot be revoked.
            </p>
          </div>
        </div>
      )}

      {/* Self-Role Warning Banner */}
      {isEditingSelfRole && !isSuperAdminRole && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold">⚠️ Caution: Modifying Your Own Active Role</h4>
            <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
              You are currently logged in with this role. Any permissions you revoke will take effect
              immediately upon saving and will restrict your current administrative session.
            </p>
          </div>
        </div>
      )}

      {/* User Impact Alert */}
      {userCount > 0 && !isSuperAdminRole && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>
              This role is currently assigned to <strong>{userCount} active user{userCount !== 1 ? "s" : ""}</strong>.
            </span>
          </div>
          <span className="text-[11px]">
            Saving will automatically refresh active authentication tokens for all assigned staff.
          </span>
        </div>
      )}

      {/* Main Permissions Matrix Component */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold">Module Permission Configuration</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle specific functional privileges for {role.name}. Permissions are grouped by module.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold text-foreground text-xs">
                {isSuperAdminRole ? allPermissions.length : selectedPermissions.length} of {allPermissions.length} Granted
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <PermissionMatrix
            permissions={allPermissions}
            selectedPermissionIds={selectedPermissions}
            onChange={handlePermissionsChange}
            disabled={isSuperAdminRole}
            isSuperAdminRole={isSuperAdminRole}
            currentUserPermissions={currentUserPermissions}
            isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
            showPresets={true}
          />
        </CardContent>
      </Card>

      {/* Self Lockout Warning Dialog Modal */}
      {showSelfLockoutWarningDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-2xl border-destructive/40 bg-background">
            <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Self-Lockout Risk Detected</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Administrative Permission Removal</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <p className="text-xs text-foreground leading-relaxed">
                You are about to remove critical administrative permissions (such as <strong>Role Management</strong> or{" "}
                <strong>User Management</strong>) from your <strong>own active role</strong>.
              </p>
              <p className="text-xs text-destructive font-medium leading-relaxed">
                If you proceed, you will immediately lose the ability to manage roles and restore these
                permissions yourself. Another Super Administrator will need to re-grant your access.
              </p>
              <div className="p-3 bg-muted/40 rounded-md border text-xs text-muted-foreground">
                Do you still wish to proceed with saving these permission changes?
              </div>
            </CardContent>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSelfLockoutWarningDialog(false)}
              >
                Cancel & Review
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Confirm & Save Changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
