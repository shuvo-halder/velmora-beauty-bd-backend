import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  groupPermissionsByModule,
  getReadablePermissionLabel,
  getPermissionExplanation,
  PermissionItem,
} from "../../../lib/permissions";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  X,
  User,
  Crown,
  KeyRound,
  Filter,
} from "lucide-react";

interface UserEffectivePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  allPermissions: PermissionItem[];
}

export function UserEffectivePermissionsModal({
  isOpen,
  onClose,
  user,
  allPermissions,
}: UserEffectivePermissionsModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const isSuperAdmin = user?.role?.name === "SuperAdmin";
  const userPermissions = user?.role?.permissions || [];

  // Group all system permissions by module
  const groupedModules = useMemo(() => {
    return groupPermissionsByModule(allPermissions);
  }, [allPermissions]);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    groupedModules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [groupedModules]);

  // Check if user has permission
  const userHasPermission = (perm: PermissionItem): boolean => {
    if (isSuperAdmin) return true;
    return userPermissions.some(
      (up: any) =>
        (up.id && up.id === perm.id) ||
        (up.module?.toLowerCase() === perm.module?.toLowerCase() &&
          up.action?.toLowerCase() === perm.action?.toLowerCase())
    );
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    const q = search.toLowerCase().trim();

    return groupedModules
      .filter((group) => {
        if (selectedCategory !== "ALL" && group.category !== selectedCategory) {
          return false;
        }
        if (!q) return true;

        const matchesModule = group.module.toLowerCase().includes(q) || group.readableName.toLowerCase().includes(q);
        const matchesCategory = group.category.toLowerCase().includes(q);
        const matchesPerms = group.permissions.some((p) => {
          const readable = getReadablePermissionLabel(p.module, p.action).toLowerCase();
          return readable.includes(q) || p.action.toLowerCase().includes(q);
        });

        return matchesModule || matchesCategory || matchesPerms;
      })
      .map((group) => {
        if (!q) return group;
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
  }, [groupedModules, search, selectedCategory]);

  if (!isOpen || !user) return null;

  const totalGranted = isSuperAdmin
    ? allPermissions.length
    : allPermissions.filter((p) => userHasPermission(p)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-border bg-background">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Effective Permissions</CardTitle>
                <Badge variant={isSuperAdmin ? "default" : "outline"} className="text-xs">
                  {user.role?.name || "No Role"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target User: <strong className="text-foreground">{user.firstName} {user.lastName}</strong> ({user.email})
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* User Summary Bar */}
        <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Assigned Role: </span>
              <span className="font-semibold text-foreground">{user.role?.name || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Account Status: </span>
              <span
                className={`font-semibold ${user.isActive ? "text-emerald-600" : "text-destructive"}`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
              {totalGranted} of {allPermissions.length} Permissions Active
            </Badge>
          </div>
        </div>

        {/* SuperAdmin Banner */}
        {isSuperAdmin && (
          <div className="mx-6 mt-4 p-3.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3 text-xs text-primary shrink-0">
            <Crown className="h-5 w-5 shrink-0" />
            <div>
              <strong className="block font-semibold">Super Administrator Privilege</strong>
              This administrator has absolute, unrestricted access to all modules, actions, and administrative functions across the entire platform.
            </div>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="p-4 border-b space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user's effective permissions or modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {categories.length > 2 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "ALL" ? "All" : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <CardContent className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredModules.map((group) => {
              const Icon = group.icon;
              const modulePerms = group.permissions;
              const grantedInModule = modulePerms.filter((p) => userHasPermission(p)).length;
              const allGranted = grantedInModule === modulePerms.length;

              return (
                <div
                  key={group.module}
                  className={`rounded-lg border bg-card text-card-foreground p-3 space-y-2.5 transition-colors ${
                    allGranted
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : grantedInModule > 0
                      ? "border-border"
                      : "border-border/50 opacity-70 bg-muted/10"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-xs text-foreground truncate">
                        {group.readableName}
                      </span>
                    </div>
                    <Badge
                      variant={allGranted ? "success" : grantedInModule > 0 ? "secondary" : "outline"}
                      className="text-[10px] h-4 px-1.5"
                    >
                      {grantedInModule}/{modulePerms.length} granted
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {modulePerms.map((perm) => {
                      const hasPerm = userHasPermission(perm);
                      const readableLabel = getReadablePermissionLabel(perm.module, perm.action);
                      const explanation = getPermissionExplanation(perm.module, perm.action, perm.description);

                      return (
                        <div
                          key={perm.id}
                          className={`flex items-start gap-2.5 p-1.5 rounded text-xs transition-colors ${
                            hasPerm ? "bg-muted/40 text-foreground" : "text-muted-foreground/60"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {hasPerm ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-medium ${
                                  hasPerm ? "text-foreground font-semibold" : "text-muted-foreground line-through opacity-75"
                                }`}
                              >
                                {readableLabel}
                              </span>
                              <code className="text-[9px] font-mono text-muted-foreground shrink-0">
                                {perm.module.toLowerCase()}.{perm.action.toLowerCase()}
                              </code>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                              {explanation}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModules.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <Filter className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No permissions match your filter</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                }}
              >
                Clear Search
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t bg-muted/10 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
