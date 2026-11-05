import React, { useMemo } from "react";
import {
  PermissionItem,
  groupPermissionsByModule,
  getReadablePermissionLabel,
  getPermissionExplanation,
  isCriticalPermission,
} from "../../../lib/permissions";
import { Checkbox } from "../../ui/checkbox";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Search,
  CheckCheck,
  XSquare,
  Lock,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Filter,
} from "lucide-react";

interface PermissionMatrixProps {
  permissions: PermissionItem[];
  selectedPermissionIds: string[];
  onChange: (newSelectedIds: string[]) => void;
  disabled?: boolean;
  isSuperAdminRole?: boolean;
  currentUserPermissions?: { module: string; action: string }[];
  isCurrentUserSuperAdmin?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showPresets?: boolean;
}

export function PermissionMatrix({
  permissions,
  selectedPermissionIds,
  onChange,
  disabled = false,
  isSuperAdminRole = false,
  currentUserPermissions = [],
  isCurrentUserSuperAdmin = false,
  searchQuery = "",
  onSearchChange,
  showPresets = true,
}: PermissionMatrixProps) {
  const [internalSearch, setInternalSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");

  const activeSearch = onSearchChange ? searchQuery : internalSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  // Group all available permissions by module
  const groupedModules = useMemo(() => {
    return groupPermissionsByModule(permissions);
  }, [permissions]);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    groupedModules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [groupedModules]);

  // Check if current logged in user has permission to grant this specific permission
  const canGrantPermission = (perm: PermissionItem): boolean => {
    if (isCurrentUserSuperAdmin) return true;
    return currentUserPermissions.some(
      (cp) =>
        cp.module.toLowerCase() === perm.module.toLowerCase() &&
        cp.action.toLowerCase() === perm.action.toLowerCase()
    );
  };

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    const q = activeSearch.toLowerCase().trim();

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
          const action = p.action.toLowerCase();
          const name = p.name.toLowerCase();
          return readable.includes(q) || action.includes(q) || name.includes(q);
        });

        return matchesModule || matchesCategory || matchesPerms;
      })
      .map((group) => {
        if (!activeSearch.trim()) return group;
        const q = activeSearch.toLowerCase().trim();
        // If search matches module/category, keep all perms, otherwise filter perms
        const matchesModule = group.module.toLowerCase().includes(q) || group.readableName.toLowerCase().includes(q);
        if (matchesModule) return group;

        return {
          ...group,
          permissions: group.permissions.filter((p) => {
            const readable = getReadablePermissionLabel(p.module, p.action).toLowerCase();
            const action = p.action.toLowerCase();
            const name = p.name.toLowerCase();
            return readable.includes(q) || action.includes(q) || name.includes(q);
          }),
        };
      })
      .filter((group) => group.permissions.length > 0);
  }, [groupedModules, activeSearch, selectedCategory]);

  const handleToggle = (permId: string) => {
    if (disabled || isSuperAdminRole) return;
    if (selectedPermissionIds.includes(permId)) {
      onChange(selectedPermissionIds.filter((id) => id !== permId));
    } else {
      onChange([...selectedPermissionIds, permId]);
    }
  };

  const handleToggleModule = (modulePerms: PermissionItem[], grant: boolean) => {
    if (disabled || isSuperAdminRole) return;
    const grantablePermIds = modulePerms.filter((p) => canGrantPermission(p)).map((p) => p.id);

    if (grant) {
      const newSet = new Set([...selectedPermissionIds, ...grantablePermIds]);
      onChange(Array.from(newSet));
    } else {
      const revokeSet = new Set(grantablePermIds);
      onChange(selectedPermissionIds.filter((id) => !revokeSet.has(id)));
    }
  };

  const handleSelectAll = () => {
    if (disabled || isSuperAdminRole) return;
    const grantableIds = permissions.filter((p) => canGrantPermission(p)).map((p) => p.id);
    onChange(grantableIds);
  };

  const handleDeselectAll = () => {
    if (disabled || isSuperAdminRole) return;
    onChange([]);
  };

  const handlePresetReadOnly = () => {
    if (disabled || isSuperAdminRole) return;
    const readOnlyIds = permissions
      .filter((p) => p.action.toLowerCase() === "read" && canGrantPermission(p))
      .map((p) => p.id);
    onChange(readOnlyIds);
  };

  const handlePresetStandard = () => {
    if (disabled || isSuperAdminRole) return;
    const standardIds = permissions
      .filter(
        (p) =>
          ["read", "write"].includes(p.action.toLowerCase()) &&
          !["security", "roles"].includes(p.module.toLowerCase()) &&
          canGrantPermission(p)
      )
      .map((p) => p.id);
    onChange(standardIds);
  };

  const totalPermissionsCount = permissions.length;
  const selectedCount = isSuperAdminRole ? totalPermissionsCount : selectedPermissionIds.length;

  return (
    <div className="space-y-4">
      {/* Controls & Presets */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions or modules..."
            value={activeSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {activeSearch && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {showPresets && !isSuperAdminRole && !disabled && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleSelectAll}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handlePresetReadOnly}
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Read Only
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handlePresetStandard}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Standard Manager
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium text-muted-foreground hover:text-destructive"
              onClick={handleDeselectAll}
            >
              <XSquare className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Counter bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing {filteredModules.length} module{filteredModules.length !== 1 ? "s" : ""}
        </span>
        <span className="font-medium text-foreground">
          {selectedCount} of {totalPermissionsCount} permissions granted
        </span>
      </div>

      {/* Module Grouped Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((group) => {
          const Icon = group.icon;
          const modulePerms = group.permissions;
          const selectedInModule = modulePerms.filter((p) =>
            isSuperAdminRole || selectedPermissionIds.includes(p.id)
          ).length;
          const allSelectedInModule = selectedInModule === modulePerms.length && modulePerms.length > 0;
          const someSelectedInModule = selectedInModule > 0 && !allSelectedInModule;

          return (
            <div
              key={group.module}
              className={`rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-150 ${
                allSelectedInModule
                  ? "border-primary/40 bg-primary/[0.02]"
                  : someSelectedInModule
                  ? "border-border"
                  : "border-border/60 opacity-90"
              }`}
            >
              {/* Module Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-background border border-border/80 text-primary shadow-xs">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm tracking-tight text-foreground truncate">
                        {group.readableName}
                      </h4>
                      <Badge
                        variant={allSelectedInModule ? "default" : someSelectedInModule ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {selectedInModule}/{modulePerms.length}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate" title={group.description}>
                      {group.description}
                    </p>
                  </div>
                </div>

                {!isSuperAdminRole && !disabled && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => handleToggleModule(modulePerms, !allSelectedInModule)}
                    >
                      {allSelectedInModule ? "Revoke All" : "Grant All"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Module Permissions Checkbox List */}
              <div className="p-3 space-y-2.5">
                {modulePerms.map((perm) => {
                  const isChecked = isSuperAdminRole || selectedPermissionIds.includes(perm.id);
                  const isGrantable = canGrantPermission(perm);
                  const isPermDisabled = disabled || isSuperAdminRole || !isGrantable;
                  const readableLabel = getReadablePermissionLabel(perm.module, perm.action);
                  const explanation = getPermissionExplanation(perm.module, perm.action, perm.description);
                  const isCritical = isCriticalPermission(perm.module, perm.action);

                  return (
                    <label
                      key={perm.id}
                      htmlFor={`perm-${perm.id}`}
                      className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
                        isChecked
                          ? "bg-accent/40 text-foreground"
                          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      } ${!isGrantable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          id={`perm-${perm.id}`}
                          checked={isChecked}
                          disabled={isPermDisabled}
                          onChange={() => handleToggle(perm.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-medium leading-tight ${
                              isChecked ? "text-foreground font-semibold" : "text-foreground/90"
                            }`}
                          >
                            {readableLabel}
                          </span>

                          {isCritical && (
                            <span
                              title="High-risk privilege"
                              className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded font-medium"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Critical
                            </span>
                          )}

                          {!isGrantable && (
                            <span
                              title="You do not possess this permission and cannot grant it to others"
                              className="inline-flex items-center gap-0.5 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded font-medium"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              Unheld
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {explanation}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] font-mono text-muted-foreground/80 bg-muted/60 px-1 rounded">
                            {perm.module.toLowerCase()}.{perm.action.toLowerCase()}
                          </code>
                        </div>
                      </div>
                    </label>
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
          <p className="text-sm font-medium text-foreground">No matching permissions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search terms or selecting a different category filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-xs"
            onClick={() => {
              handleSearchChange("");
              setSelectedCategory("ALL");
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
