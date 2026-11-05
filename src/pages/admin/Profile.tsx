import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPermissions } from "../../services/permission.service";
import {
  groupPermissionsByModule,
  getReadablePermissionLabel,
  getPermissionExplanation,
  PermissionItem,
} from "../../lib/permissions";
import {
  KeyRound,
  ShieldCheck,
  Crown,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  User as UserIcon,
} from "lucide-react";

export function Profile() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [permSearch, setPermSearch] = useState("");

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const isSuperAdmin = user?.role?.name === "SuperAdmin";
  const userPermissions = user?.role?.permissions || [];

  const groupedModules = useMemo(() => {
    return groupPermissionsByModule(allPermissions);
  }, [allPermissions]);

  const userHasPermission = (perm: PermissionItem): boolean => {
    if (isSuperAdmin) return true;
    return userPermissions.some(
      (up: any) =>
        (up.module?.toLowerCase() === perm.module?.toLowerCase() &&
          up.action?.toLowerCase() === perm.action?.toLowerCase())
    );
  };

  const filteredModules = useMemo(() => {
    const q = permSearch.toLowerCase().trim();
    if (!q) return groupedModules;

    return groupedModules
      .filter((group) => {
        const matchesModule = group.module.toLowerCase().includes(q) || group.readableName.toLowerCase().includes(q);
        const matchesPerms = group.permissions.some((p) => {
          const readable = getReadablePermissionLabel(p.module, p.action).toLowerCase();
          return readable.includes(q) || p.action.toLowerCase().includes(q);
        });
        return matchesModule || matchesPerms;
      })
      .map((group) => {
        const matchesModule = group.module.toLowerCase().includes(q) || group.readableName.toLowerCase().includes(q);
        if (matchesModule) return group;

        return {
          ...group,
          permissions: group.permissions.filter((p) => {
            const readable = getReadablePermissionLabel(p.module, p.action).toLowerCase();
            return readable.includes(q) || p.action.toLowerCase().includes(q);
          }),
        };
      })
      .filter((group) => group.permissions.length > 0);
  }, [groupedModules, permSearch]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMessage("Password successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Administrator Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage account credentials and inspect your assigned role & active permissions
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-1">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: "info" })}
          className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-1.5 ${
            activeTab === "info"
              ? "border-b-2 border-primary text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          Personal Details
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: "permissions" })}
          className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-1.5 ${
            activeTab === "permissions"
              ? "border-b-2 border-primary text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          My Permissions
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
            {isSuperAdmin ? "Full Access" : `${userPermissions.length}`}
          </Badge>
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: "password" })}
          className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-1.5 ${
            activeTab === "password"
              ? "border-b-2 border-primary text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Security & Password
        </button>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === "info" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <Input value={user?.firstName || ""} disabled className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <Input value={user?.lastName || ""} disabled className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <Input value={user?.email || ""} disabled className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Assigned Role</label>
              <div className="flex items-center gap-2">
                <Input
                  value={user?.role?.name || ""}
                  disabled
                  className="font-semibold text-primary h-9 text-xs"
                />
                {isSuperAdmin && (
                  <Badge variant="default" className="text-xs bg-primary shrink-0">
                    <Crown className="h-3 w-3 mr-1" /> SuperAdmin
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: My Permissions */}
      {activeTab === "permissions" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold">My Effective Permissions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permissions currently active on your session based on your assigned role (
                  <strong>{user?.role?.name || "Unassigned"}</strong>).
                </p>
              </div>
              <Badge variant={isSuperAdmin ? "default" : "outline"} className="text-xs self-start">
                {isSuperAdmin ? "Unrestricted Platform Access" : `${userPermissions.length} Active Grants`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {isSuperAdmin ? (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-start gap-3 text-xs">
                <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Super Administrator Access</strong>
                  Your account is granted implicit full authorization to read, write, create, and delete across every module and administrative function.
                </div>
              </div>
            ) : null}

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search active permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {filteredModules.map((group) => {
                const Icon = group.icon;
                const grantedInModule = group.permissions.filter((p) => userHasPermission(p)).length;

                return (
                  <div
                    key={group.module}
                    className="p-3 rounded-lg border bg-card text-card-foreground space-y-2"
                  >
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-xs text-foreground">
                          {group.readableName}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {grantedInModule}/{group.permissions.length}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {group.permissions.map((perm) => {
                        const hasPerm = userHasPermission(perm);
                        const readableLabel = getReadablePermissionLabel(perm.module, perm.action);

                        return (
                          <div
                            key={perm.id}
                            className={`flex items-center justify-between text-xs p-1 rounded ${
                              hasPerm ? "text-foreground font-medium" : "text-muted-foreground/60 line-through"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {hasPerm ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                              )}
                              {readableLabel}
                            </span>
                            <code className="text-[9px] font-mono text-muted-foreground">
                              {perm.action.toLowerCase()}
                            </code>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === "password" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {error && <div className="text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}
              {message && <div className="text-xs font-medium text-emerald-600 bg-emerald-500/10 p-2.5 rounded-md">{message}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Current Password</label>
                <Input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">New Password</label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 12 characters with mixed complexity.
                </p>
              </div>
              <Button type="submit" disabled={loading} className="text-xs h-9">
                {loading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
