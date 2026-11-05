import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getRefunds,
  deleteRefund,
  approveRefund,
  rejectRefund,
  initiateRefund,
} from "../../../services/refund.service";
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
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  ArrowDownLeft,
  DollarSign,
  Ban,
  Check,
  X
} from "lucide-react";

export function RefundsList() {
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can("Orders", "write") || can("Refunds", "write") || user?.role?.name === "Super Admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  
  // Modals state
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [initiateForm, setInitiateForm] = useState({
    orderId: "",
    paymentId: "",
    amount: "",
    reason: "",
  });
  const [refundToApprove, setRefundToApprove] = useState<any | null>(null);
  const [refundToReject, setRefundToReject] = useState<any | null>(null);
  const [providerReference, setProviderReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["refunds", page, search, status],
    queryFn: () => getRefunds({ page, limit: 10, search, status }),
  });

  const refundsList = responseData?.refunds || [];
  const pagination = responseData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRefund(id, { providerReference }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success("Refund Approved", `Refund for ৳${Number(refundToApprove?.amount || 0).toFixed(2)} completed.`);
      setRefundToApprove(null);
      setProviderReference("");
    },
    onError: (err) => notify.apiError(err, "Failed to approve refund."),
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectRefund(id, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      notify.success("Refund Rejected", "Refund request was marked as rejected.");
      setRefundToReject(null);
      setRejectionReason("");
    },
    onError: (err) => notify.apiError(err, "Failed to reject refund."),
  });

  // Initiate Refund Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      notify.success("Archived", "Refund archived successfully");
    },
  });

  const initiateMutation = useMutation({
    mutationFn: (payload: { orderId: string; paymentId: string; amount: number; reason: string }) =>
      initiateRefund(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success("Refund Processed", `Direct refund of ৳${Number(initiateForm.amount).toFixed(2)} executed.`);
      setIsInitiateOpen(false);
      setInitiateForm({ orderId: "", paymentId: "", amount: "", reason: "" });
    },
    onError: (err) => notify.apiError(err, "Failed to initiate refund."),
  });

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initiateForm.orderId.trim()) {
      notify.error("Validation Error", "Order ID is required.");
      return;
    }
    if (!initiateForm.paymentId.trim()) {
      notify.error("Validation Error", "Payment ID is required.");
      return;
    }
    const amt = parseFloat(initiateForm.amount);
    if (isNaN(amt) || amt <= 0) {
      notify.error("Validation Error", "Please enter a valid refund amount greater than zero.");
      return;
    }
    if (!initiateForm.reason.trim()) {
      notify.error("Validation Error", "Reason for refund is required.");
      return;
    }

    initiateMutation.mutate({
      orderId: initiateForm.orderId.trim(),
      paymentId: initiateForm.paymentId.trim(),
      amount: amt,
      reason: initiateForm.reason.trim(),
    });
  };

  // Status badge helper
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case "COMPLETED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            <AlertCircle className="w-3 h-3" /> Failed
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

  const pendingCount = refundsList.filter((r: any) => r.status === "PENDING").length;
  const completedSum = refundsList
    .filter((r: any) => r.status === "COMPLETED" || r.status === "APPROVED")
    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="h-6 w-6 text-primary" /> Refund Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Audit, approve, reject, or directly initiate customer refunds in BDT.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setIsInitiateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Initiate Direct Refund
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting refund verification</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Refunded (Listed)</CardTitle>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{completedSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed completed refunds</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all lifetime refund logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by refund ID, order #, payment ID, or customer email..."
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
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider">
              <TableRow>
                <TableHead>Refund ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment & Gateway</TableHead>
                <TableHead>Amount (BDT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : refundsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No refund records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                refundsList.map((refund: any) => (
                  <TableRow key={refund.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {refund.id.split("-")[0]}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/orders/${refund.orderId}`}
                        className="font-medium text-sm text-foreground hover:text-primary hover:underline"
                      >
                        #{refund.order?.orderNumber || refund.orderId?.split("-")[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">
                        {refund.customer?.firstName
                          ? `${refund.customer.firstName} ${refund.customer.lastName || ""}`
                          : "Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground">{refund.customer?.email || "No email"}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {refund.payment?.paymentMethod || "Digital Payment"}
                      </div>
                      <div>ID: {refund.paymentId?.split("-")[0]}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      ৳{Number(refund.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{renderStatusBadge(refund.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {refund.status === "PENDING" && canWrite && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs px-2 h-8"
                              title="Approve Refund"
                              onClick={() => setRefundToApprove(refund)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs px-2 h-8"
                              title="Reject Refund"
                              onClick={() => setRefundToReject(refund)}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" asChild title="View Details">
                          <Link to={`/admin/refunds/${refund.id}`}>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        {canWrite && (
                          <Button variant="ghost" size="icon" onClick={() => {
                            if(window.confirm("Archive this refund?")) {
                              deleteMutation.mutate(refund.id);
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
              {Math.min(page * 10, pagination.total)} of {pagination.total} refunds
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

      {/* Modal: Initiate Direct Refund */}
      {isInitiateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-primary" /> Initiate Direct Refund
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsInitiateOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Order ID *
                </label>
                <Input
                  placeholder="e.g. 1a2b3c4d-..."
                  value={initiateForm.orderId}
                  onChange={(e) => setInitiateForm({ ...initiateForm, orderId: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Payment ID *
                </label>
                <Input
                  placeholder="e.g. 5e6f7g8h-..."
                  value={initiateForm.paymentId}
                  onChange={(e) => setInitiateForm({ ...initiateForm, paymentId: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Refund Amount (BDT ৳) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 500.00"
                  value={initiateForm.amount}
                  onChange={(e) => setInitiateForm({ ...initiateForm, amount: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount must not exceed the remaining paid balance of the payment.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Reason for Refund *
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Item defective, customer requested cancellation, goodwill credit..."
                  value={initiateForm.reason}
                  onChange={(e) => setInitiateForm({ ...initiateForm, reason: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsInitiateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={initiateMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {initiateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Submit & Execute Refund"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Approve Refund */}
      <ConfirmDialog
        isOpen={!!refundToApprove}
        onOpenChange={(open) => !open && setRefundToApprove(null)}
        title="Approve Customer Refund"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to approve this refund of{" "}
              <strong>৳{Number(refundToApprove?.amount || 0).toFixed(2)}</strong> for Order #
              <strong>{refundToApprove?.order?.orderNumber || refundToApprove?.orderId?.split("-")[0]}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Transaction Reference / Gateway TRX ID (Optional)
              </label>
              <Input
                placeholder="e.g. bKash TRX 9X73HJ..."
                value={providerReference}
                onChange={(e) => setProviderReference(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Approve Refund"
        variant="default"
        isLoading={approveMutation.isPending}
        onConfirm={() => refundToApprove && approveMutation.mutate(refundToApprove.id)}
      />

      {/* Confirmation Dialog: Reject Refund */}
      <ConfirmDialog
        isOpen={!!refundToReject}
        onOpenChange={(open) => !open && setRefundToReject(null)}
        title="Reject Refund Request"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to reject this refund of{" "}
              <strong>৳{Number(refundToReject?.amount || 0).toFixed(2)}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Rejection Reason (will be emailed to customer)
              </label>
              <Input
                placeholder="e.g. Outside return window, product used..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Reject Refund"
        variant="destructive"
        isLoading={rejectMutation.isPending}
        onConfirm={() => refundToReject && rejectMutation.mutate(refundToReject.id)}
      />
    </div>
  );
}
