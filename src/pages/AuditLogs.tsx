import React, { useState, useEffect } from "react";
import { getAuditLogs, AuditLog, GetAuditLogsParams } from "../services/auditLog.service";
import { api } from "../lib/api";
import { 
  Search, 
  Calendar, 
  Download, 
  RefreshCw, 
  Eye, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  Globe
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { notify } from "../lib/notify";

const COMMON_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "ROLE_CHANGED",
  "PERMISSION_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
  "TOKEN_REVOKED",
  "SECURITY_ALERT",
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_DELETED",
  "ROLE_CREATED",
  "ROLE_UPDATED",
  "ROLE_DELETED"
];

const COMMON_ENTITIES = [
  "Auth",
  "User",
  "Role",
  "Product",
  "Inventory",
  "Security"
];

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Details Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats / Overview (derived or calculated for summary cards)
  const [securityAlertsCount, setSecurityAlertsCount] = useState(0);
  const [failedLoginsCount, setFailedLoginsCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetAuditLogsParams = {
        page,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc"
      };

      if (keyword.trim()) params.keyword = keyword.trim();
      if (action) params.action = action;
      if (entityType) params.entityType = entityType;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        params.endDate = d.toISOString();
      }

      const res = await getAuditLogs(params);
      setLogs(res.logs);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);

      // Fetch brief stats for cards
      const alertRes = await getAuditLogs({ action: "SECURITY_ALERT", limit: 1 });
      setSecurityAlertsCount(alertRes.pagination.total);
      
      const failedRes = await getAuditLogs({ action: "LOGIN_FAILED", limit: 1 });
      setFailedLoginsCount(failedRes.pagination.total);

    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load audit logs. Please make sure backend is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, action, entityType, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setKeyword("");
    setAction("");
    setEntityType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      setLoading(true);
      const queryParams: any = {};
      if (keyword.trim()) queryParams.keyword = keyword.trim();
      if (action) queryParams.action = action;
      if (entityType) queryParams.entityType = entityType;
      if (startDate) queryParams.startDate = new Date(startDate).toISOString();
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        queryParams.endDate = d.toISOString();
      }
      queryParams.format = format;

      const response = await api.get("/audit-logs/export", {
        params: queryParams,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `enterprise-audit-logs-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify.success("Audit Logs Exported", `Successfully generated enterprise log export (.${format}).`);
    } catch (err) {
      console.error("Export failed:", err);
      notify.warning("Direct Export Failed", "Server export unavailable. Downloading logs visible in current view as fallback.");
      
      // Fallback: Export visible logs client-side
      const dataStr = format === "json" 
        ? JSON.stringify(logs, null, 2)
        : "ID,Action,Entity,IP Address,Created At\n" + logs.map(l => `"${l.id}","${l.action}","${l.entityType}","${l.ipAddress || ""}","${l.createdAt}"`).join("\n");
      
      const blob = new Blob([dataStr], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `local-audit-logs-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (act: string) => {
    if (act.includes("FAILED") || act.includes("ALERT") || act.includes("LOCKED")) {
      return "destructive";
    }
    if (act.includes("SUCCESS") || act.includes("CREATED") || act.includes("ENABLED")) {
      return "success";
    }
    return "warning";
  };

  const parseLogDetails = (detailsStr: string | null) => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return detailsStr;
    }
  };

  return (
    <div id="audit-logs-viewport" className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Logging &amp; Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise-grade trace log of all administrative actions, system modifications, and authentication attempts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")} className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-background border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground">Total Logged Activities</CardDescription>
            <CardTitle className="text-2xl font-bold">{total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Administrative staff logs persisted in PostgreSQL.
          </CardContent>
        </Card>

        <Card className="bg-background border border-amber-200 dark:border-amber-950/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-amber-700 dark:text-amber-400">Security Alerts</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {securityAlertsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unusual login patterns, token reuses, and reset violations.
          </CardContent>
        </Card>

        <Card className="bg-background border border-rose-200 dark:border-rose-950/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-rose-700 dark:text-rose-400">Failed Logins</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-500 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              {failedLoginsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tracked login failures to detect brute-force threats.
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters Controls */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Keyword search */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, emails, details or IP addresses..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>

              {/* Action filter */}
              <div>
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 border rounded-md text-sm bg-background"
                >
                  <option value="">All Actions</option>
                  {COMMON_ACTIONS.map((act) => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              {/* Entity Type filter */}
              <div>
                <select
                  value={entityType}
                  onChange={(e) => {
                    setEntityType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 border rounded-md text-sm bg-background"
                >
                  <option value="">All Entity Types</option>
                  {COMMON_ENTITIES.map((ent) => (
                    <option key={ent} value={ent}>{ent}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date picking row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-muted">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date Range:</span>
                </div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-40 h-9 text-xs"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-40 h-9 text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="default" className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Apply Search
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Audit Logs Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-foreground">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading logs from server...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                      No audit events match your search criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actorName = log.user 
                      ? `${log.user.firstName} ${log.user.lastName || ""}`.trim() 
                      : "System";
                    const actorEmail = log.user?.email || "system@enterprise.internal";
                    const detailsObj = parseLogDetails(log.details);

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs sm:text-sm">{actorName}</span>
                            <span className="text-xs text-muted-foreground">{actorEmail}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-primary">{log.entityType}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{log.entityId || "N/A"}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
                          {log.ipAddress || "Localhost"}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsModalOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                            title="Inspect Log details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-muted bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{total}</strong> entries)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Inspector Modal */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg text-foreground">Audit Log Inspection</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedLog(null);
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Event ID</span>
                  <p className="font-mono text-xs mt-1 bg-muted p-1 px-2 rounded break-all">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Timestamp</span>
                  <p className="mt-1 font-semibold text-xs sm:text-sm">{new Date(selectedLog.createdAt).toString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Action Trigger</span>
                  <div className="mt-1">
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>{selectedLog.action}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Module / Entity</span>
                  <p className="mt-1 text-xs sm:text-sm font-semibold">
                    {selectedLog.entityType} <span className="text-muted-foreground font-normal">({selectedLog.entityId || "N/A"})</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                <div className="flex gap-2 items-center">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Actor User</span>
                    <span className="font-medium text-xs sm:text-sm">
                      {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName || ""}`.trim() : "System / Automated"}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {selectedLog.user?.email || "system@enterprise.internal"}
                    </span>
                    {selectedLog.user?.role && (
                      <Badge variant="outline" className="text-[10px] py-0 mt-0.5">{selectedLog.user.role.name}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Origin IP Address</span>
                    <span className="font-mono text-xs mt-1 block">{selectedLog.ipAddress || "Internal Server / Localhost"}</span>
                  </div>
                </div>
              </div>

              {/* JSON payload inspector */}
              <div className="pt-4 border-t space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Payload &amp; Metadata details</span>
                <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto border">
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                    {JSON.stringify(parseLogDetails(selectedLog.details), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedLog(null);
                }}
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
