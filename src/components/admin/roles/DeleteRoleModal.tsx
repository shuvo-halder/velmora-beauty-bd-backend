import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  X,
  Lock,
} from "lucide-react";

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  role: any | null;
  currentUserId?: string;
  currentUserRoleId?: string;
  isPending?: boolean;
}

export function DeleteRoleModal({
  isOpen,
  onClose,
  onConfirm,
  role,
  currentUserRoleId,
  isPending = false,
}: DeleteRoleModalProps) {
  if (!isOpen || !role) return null;

  const isSuperAdminRole = role.name === "SuperAdmin";
  const isOwnRole = currentUserRoleId === role.id;
  const userCount = role._count?.users || 0;
  const hasAssignedUsers = userCount > 0;

  const isBlocked = isSuperAdminRole || isOwnRole || hasAssignedUsers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <Card className="w-full max-w-md shadow-2xl border-destructive/30 bg-background">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isBlocked ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"
              }`}
            >
              {isBlocked ? <Lock className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                {isBlocked ? "Cannot Delete Role" : "Delete Role"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Role: {role.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {isSuperAdminRole && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Protected System Role</span>
              </div>
              <p className="text-xs leading-relaxed">
                The <strong>SuperAdmin</strong> role is the fundamental root security principal of the
                platform. It is immutable and cannot be deleted.
              </p>
            </div>
          )}

          {isOwnRole && !isSuperAdminRole && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Self-Role Protection</span>
              </div>
              <p className="text-xs leading-relaxed">
                You are currently assigned to the <strong>{role.name}</strong> role. You cannot delete
                your own role to prevent accidental administrative self-lockout.
              </p>
            </div>
          )}

          {hasAssignedUsers && !isSuperAdminRole && !isOwnRole && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Users className="h-4 w-4" />
                <span>Active Users Assigned</span>
              </div>
              <p className="text-xs leading-relaxed">
                This role currently has <strong>{userCount} active user{userCount !== 1 ? "s" : ""}</strong>{" "}
                assigned. To maintain system security and access integrity, you must reassign all users to
                another role before deleting this role.
              </p>
            </div>
          )}

          {!isBlocked && (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Are you sure you want to permanently delete the <strong>{role.name}</strong> role?
              </p>
              <div className="p-3 bg-muted/40 rounded-md border text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Assigned Permissions:</span>
                  <span className="font-medium text-foreground">{role.permissions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Users:</span>
                  <span className="font-medium text-foreground">0</span>
                </div>
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠️ This action cannot be undone. All permission associations will be removed.
              </p>
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/10">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {isBlocked ? "Close" : "Cancel"}
          </Button>
          {!isBlocked && (
            <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
              {isPending ? "Deleting..." : "Permanently Delete Role"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
