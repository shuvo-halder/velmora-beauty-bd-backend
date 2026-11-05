import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { PermissionItem } from "../../../lib/permissions";
import { PermissionMatrix } from "./PermissionMatrix";
import {
  ShieldCheck,
  Copy,
  AlertCircle,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; permissionIds: string[] }) => Promise<void>;
  initialRole?: any | null;
  isClone?: boolean;
  availableRoles?: any[];
  allPermissions: PermissionItem[];
  currentUserPermissions?: { module: string; action: string }[];
  isCurrentUserSuperAdmin?: boolean;
  isPending?: boolean;
}

export function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialRole = null,
  isClone = false,
  availableRoles = [],
  allPermissions = [],
  currentUserPermissions = [],
  isCurrentUserSuperAdmin = false,
  isPending = false,
}: RoleFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [templateRoleId, setTemplateRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "permissions">("general");

  useEffect(() => {
    if (initialRole) {
      if (isClone) {
        setName(`${initialRole.name} (Copy)`);
        setDescription(initialRole.description ? `Copy of ${initialRole.description}` : "");
        setSelectedPermissionIds(initialRole.permissions?.map((p: any) => p.id) || []);
      } else {
        setName(initialRole.name);
        setDescription(initialRole.description || "");
        setSelectedPermissionIds(initialRole.permissions?.map((p: any) => p.id) || []);
      }
    } else {
      setName("");
      setDescription("");
      setSelectedPermissionIds([]);
      setTemplateRoleId("");
    }
    setError(null);
    setActiveTab("general");
  }, [initialRole, isClone, isOpen]);

  if (!isOpen) return null;

  const handleTemplateChange = (roleId: string) => {
    setTemplateRoleId(roleId);
    if (!roleId) return;
    const targetRole = availableRoles.find((r) => r.id === roleId);
    if (targetRole && targetRole.permissions) {
      const perms = targetRole.permissions.map((p: any) => p.id);
      setSelectedPermissionIds(perms);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Role name is required");
      return;
    }

    if (trimmedName.toLowerCase() === "superadmin" && (!initialRole || initialRole.name !== "SuperAdmin")) {
      setError("The role name 'SuperAdmin' is reserved for system use");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim(),
        permissionIds: selectedPermissionIds,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to save role";
      setError(msg);
    }
  };

  const isEditing = !!initialRole && !isClone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-border bg-background">
        {/* Modal Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isClone ? <Copy className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                {isClone ? "Clone Role" : isEditing ? `Edit Role: ${initialRole.name}` : "Create New Role"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isClone
                  ? "Create a new role with permissions copied from an existing template"
                  : isEditing
                  ? "Update role identification and modify granted permissions"
                  : "Define a custom access role and assign module permissions"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            General Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "permissions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Module Permissions
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
              {selectedPermissionIds.length}
            </Badge>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <CardContent className="p-6 overflow-y-auto flex-1 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === "general" && (
              <div className="space-y-4">
                {!isEditing && availableRoles.length > 0 && (
                  <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span>Start from a Role Template (Optional)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quickly populate permission policies by cloning an existing role definition.
                    </p>
                    <select
                      value={templateRoleId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Start from scratch (No permissions preselected)</option>
                      {availableRoles
                        .filter((r) => r.name !== "SuperAdmin")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Clone permissions from: {r.name} ({r.permissions?.length || 0} permissions)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Role Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. CatalogManager, SupportTier2, FulfillmentLead"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be unique and descriptive of the staff member's administrative responsibilities.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Role Description</label>
                  <Input
                    placeholder="e.g. Manages store inventory, SKU updates, and category taxonomy"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="pt-2">
                  <div className="p-3.5 rounded-lg border bg-muted/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Assigned Permissions</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedPermissionIds.length} permission{selectedPermissionIds.length !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("permissions")}
                      className="text-xs"
                    >
                      <Layers className="h-3.5 w-3.5 mr-1" />
                      Configure Permissions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg text-xs text-muted-foreground">
                  <span>
                    Select the granular permissions to grant to users assigned the{" "}
                    <strong>{name || "new role"}</strong> role.
                  </span>
                  <Badge variant="outline" className="font-semibold text-foreground">
                    {selectedPermissionIds.length} of {allPermissions.length} selected
                  </Badge>
                </div>

                <PermissionMatrix
                  permissions={allPermissions}
                  selectedPermissionIds={selectedPermissionIds}
                  onChange={setSelectedPermissionIds}
                  currentUserPermissions={currentUserPermissions}
                  isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
                  showPresets={true}
                />
              </div>
            )}
          </CardContent>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10 shrink-0">
            <div className="text-xs text-muted-foreground">
              {activeTab === "general" ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("permissions")}
                  className="text-primary hover:underline font-medium"
                >
                  Next: Configure Permissions &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className="text-muted-foreground hover:underline"
                >
                  &larr; Back to Details
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
