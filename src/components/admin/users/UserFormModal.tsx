import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  UserPlus,
  Edit,
  ShieldCheck,
  Crown,
  AlertTriangle,
  X,
  Lock,
  Eye,
} from "lucide-react";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
  editingUser?: any | null;
  roles: any[];
  currentUserId?: string;
  isCurrentUserSuperAdmin?: boolean;
  isPending?: boolean;
}

export function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingUser = null,
  roles = [],
  currentUserId,
  isCurrentUserSuperAdmin = false,
  isPending = false,
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        firstName: editingUser.firstName || "",
        lastName: editingUser.lastName || "",
        email: editingUser.email || "",
        roleId: editingUser.roleId || editingUser.role?.id || "",
        password: "",
      });
    } else {
      // Default to standard non-SuperAdmin role if available
      const defaultRole = roles.find((r) => r.name !== "SuperAdmin") || roles[0];
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        roleId: defaultRole?.id || "",
        password: "",
      });
    }
    setError(null);
  }, [editingUser, roles, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!editingUser;
  const isEditingSelf = editingUser && editingUser.id === currentUserId;
  const isTargetSuperAdmin = editingUser && editingUser.role?.name === "SuperAdmin";

  const selectedRole = roles.find((r) => r.id === formData.roleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!isEditing && (!formData.password || formData.password.length < 12)) {
      setError("Password must be at least 12 characters long");
      return;
    }

    if (!formData.roleId) {
      setError("Please select an administrative role");
      return;
    }

    // Protection check
    if (selectedRole?.name === "SuperAdmin" && !isCurrentUserSuperAdmin) {
      setError("Only a Super Administrator can assign the SuperAdmin role");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to save user";
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <Card className="w-full max-w-lg shadow-2xl border-border bg-background">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isEditing ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                {isEditing ? "Edit Administrator" : "Add New Administrator"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Update staff credentials and assigned role policy"
                  : "Provision a new admin staff account with RBAC permissions"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isEditingSelf && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="h-4 w-4 shrink-0" />
                <span>
                  You are editing your own profile. Your role cannot be modified here to prevent accidental self-lockout.
                </span>
              </div>
            )}

            {isTargetSuperAdmin && !isCurrentUserSuperAdmin && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                <Crown className="h-4 w-4 shrink-0" />
                <span>
                  This is a SuperAdmin account. Only other Super Administrators have authorization to modify it.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Jane"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="jane.doe@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {!isEditing && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Temporary Password <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Min 12 characters with mixed complexity"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 12 characters long according to administrative password policies.
                </p>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Assigned Access Role <span className="text-destructive">*</span>
                </label>
                {selectedRole && (
                  <Badge variant={selectedRole.name === "SuperAdmin" ? "default" : "outline"} className="text-[10px]">
                    {selectedRole.name}
                  </Badge>
                )}
              </div>

              <select
                disabled={isEditingSelf || (isTargetSuperAdmin && !isCurrentUserSuperAdmin)}
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  Select an administrative role...
                </option>
                {roles.map((r) => {
                  const isRoleSuperAdmin = r.name === "SuperAdmin";
                  const isOptionDisabled = isRoleSuperAdmin && !isCurrentUserSuperAdmin;

                  return (
                    <option key={r.id} value={r.id} disabled={isOptionDisabled}>
                      {r.name} {isRoleSuperAdmin ? "(SuperAdmin - Root Access)" : `(${r.permissions?.length || 0} permissions)`}
                      {isOptionDisabled ? " — Requires SuperAdmin" : ""}
                    </option>
                  );
                })}
              </select>

              {/* Role Details Preview */}
              {selectedRole && (
                <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Role: {selectedRole.name}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      {selectedRole.name === "SuperAdmin"
                        ? "Full Access (All Modules)"
                        : `${selectedRole.permissions?.length || 0} permissions granted`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedRole.description || "Custom configured access role."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/10">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Administrator"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
