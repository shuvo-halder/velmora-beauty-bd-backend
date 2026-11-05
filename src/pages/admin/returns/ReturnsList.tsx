import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getReturns,
  deleteReturn,
  approveReturn,
  rejectReturn,
  receiveReturn,
} from "../../../services/return.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { notify } from "../../../lib/notify";
import { useAuth } from "../../../context/AuthContext";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  PackageX,
  AlertCircle,
  Check,
  X
} from "lucide-react";

export function ReturnsList() {
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can("Orders", "write") || can("Returns", "write") || user?.role?.name === "Super Admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [returnToApprove, setReturnToApprove] = useState<any | null>(null);
  const [returnToReject, setReturnToReject] = useState<any | null>(null);
  const [returnToReceive, setReturnToReceive] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["returns", page, search, status],
    queryFn: () => getReturns({ page, limit: 10, search, status }),
  });

  const returnsList = responseData?.returns || [];
  const pagination = responseData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Approve Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Archived", "Return request archived successfully");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveReturn(id, actionNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Return Approved", "RMA request has been approved.");
      setReturnToApprove(null);
      setActionNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to approve return request."),
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectReturn(id, actionNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Return Rejected", "RMA request was marked as rejected.");
      setReturnToReject(null);
      setActionNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to reject return request."),
  });

  // Receive Mutation
  const receiveMutation = useMutation({
    mutationFn: (id: string) => receiveReturn(id, actionNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Items Received", "Physical items marked as received and inventory restored.");
      setReturnToReceive(null);
      setActionNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to mark return as received."),
  });

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Requested
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "RECEIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <PackageCheck className="w-3 h-3" /> Received & Restocked
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <PackageX className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            {st}
          </span>
        );
    }
  };

  const requestedCount = returnsList.filter((r: any) => r.status === "REQUESTED").length;
  const approvedCount = returnsList.filter((r: any) => r.status === "APPROVED").length;
  const receivedCount = returnsList.filter((r: any) => r.status === "RECEIVED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" /> Return & RMA Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track customer returns, approve items for inspection, and restock warehouse items.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requested</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending review & approval</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In transit to warehouse</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Received</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Inspected & restocked</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total lifetime returns</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by RMA ID, Order #, or customer email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="RECEIVED">Received</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider">
              <TableRow>
                <TableHead>RMA ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Returned Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : returnsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No return requests found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                returnsList.map((rma: any) => (
                  <TableRow key={rma.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {rma.id.split("-")[0]}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/orders/${rma.orderId}`}
                        className="font-medium text-sm text-foreground hover:text-primary hover:underline"
                      >
                        #{rma.order?.orderNumber || rma.orderId?.split("-")[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">
                        {rma.customer?.firstName
                          ? `${rma.customer.firstName} ${rma.customer.lastName || ""}`
                          : "Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground">{rma.customer?.email || "No email"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-foreground">{rma.items?.length || 0} line item(s)</span>
                      {rma.reason && (
                        <div className="text-muted-foreground truncate max-w-[200px]" title={rma.reason}>
                          {rma.reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{renderStatusBadge(rma.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(rma.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {rma.status === "REQUESTED" && canWrite && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs px-2 h-8"
                              title="Approve Return"
                              onClick={() => setReturnToApprove(rma)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs px-2 h-8"
                              title="Reject Return"
                              onClick={() => setReturnToReject(rma)}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {rma.status === "APPROVED" && canWrite && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs px-2 h-8"
                            title="Mark as Received"
                            onClick={() => setReturnToReceive(rma)}
                          >
                            <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild title="View Details">
                          <Link to={`/admin/returns/${rma.id}`}>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        {canWrite && (
                          <Button variant="ghost" size="icon" onClick={() => {
                            if(window.confirm("Archive this return request?")) {
                              deleteMutation.mutate(rma.id);
                            }
                          }}>
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 mt-4 border-t text-xs">
            <p className="text-muted-foreground">
              Showing {pagination.total === 0 ? 0 : (page - 1) * 10 + 1} to{" "}
              {Math.min(page * 10, pagination.total)} of {pagination.total} return requests
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="font-medium px-2">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="gap-1 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog: Approve RMA */}
      <ConfirmDialog
        isOpen={!!returnToApprove}
        onOpenChange={(open) => !open && setReturnToApprove(null)}
        title="Approve Return Request (RMA)"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to approve this return request for Order #
              <strong>{returnToApprove?.order?.orderNumber || returnToApprove?.orderId?.split("-")[0]}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Admin Notes / Instructions for Customer (Optional)
              </label>
              <Input
                placeholder="e.g. Approved. Please pack with original accessories and invoice..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Approve RMA"
        variant="default"
        isLoading={approveMutation.isPending}
        onConfirm={() => returnToApprove && approveMutation.mutate(returnToApprove.id)}
      />

      {/* Confirmation Dialog: Reject RMA */}
      <ConfirmDialog
        isOpen={!!returnToReject}
        onOpenChange={(open) => !open && setReturnToReject(null)}
        title="Reject Return Request"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to reject return request RMA #
              <strong>{returnToReject?.id?.split("-")[0]}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Rejection Reason (will be recorded & emailed)
              </label>
              <Input
                placeholder="e.g. Return window expired, non-returnable perishable item..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Reject RMA"
        variant="destructive"
        isLoading={rejectMutation.isPending}
        onConfirm={() => returnToReject && rejectMutation.mutate(returnToReject.id)}
      />

      {/* Confirmation Dialog: Receive & Restock */}
      <ConfirmDialog
        isOpen={!!returnToReceive}
        onOpenChange={(open) => !open && setReturnToReceive(null)}
        title="Confirm Receipt & Restock Inventory"
        description={
          <div className="space-y-3">
            <p>
              Have you physically received and verified the items for RMA #
              <strong>{returnToReceive?.id?.split("-")[0]}</strong>? Marking as received will automatically increment inventory levels for restockable items.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Warehouse Inspection Notes (Optional)
              </label>
              <Input
                placeholder="e.g. Items verified in good condition, restocked to Bay A-4..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Receive & Restock"
        variant="default"
        isLoading={receiveMutation.isPending}
        onConfirm={() => returnToReceive && receiveMutation.mutate(returnToReceive.id)}
      />
    </div>
  );
}
