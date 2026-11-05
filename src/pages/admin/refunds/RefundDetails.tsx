import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRefundById, approveRefund, rejectRefund } from "../../../services/refund.service";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { notify } from "../../../lib/notify";
import { useAuth } from "../../../context/AuthContext";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  ShoppingBag,
  User,
  Calendar,
  DollarSign,
  FileText,
  History,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export function RefundDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can("Orders", "write") || can("Refunds", "write") || user?.role?.name === "Super Admin";

  const [providerReference, setProviderReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const { data: refund, isLoading, isError } = useQuery({
    queryKey: ["refund", id],
    queryFn: () => getRefundById(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => approveRefund(id!, { providerReference }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["refund", id] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success("Refund Approved", `Refund of ৳${Number(refund?.amount || 0).toFixed(2)} completed successfully.`);
      setIsApproveOpen(false);
      setProviderReference("");
    },
    onError: (err) => notify.apiError(err, "Failed to approve refund."),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRefund(id!, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refund", id] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      notify.success("Refund Rejected", "Refund request was marked as rejected.");
      setIsRejectOpen(false);
      setRejectionReason("");
    },
    onError: (err) => notify.apiError(err, "Failed to reject refund."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !refund) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Refund Record Not Found</h2>
        <p className="text-muted-foreground text-sm">The refund ID you requested does not exist or was removed.</p>
        <Button asChild variant="outline">
          <Link to="/admin/refunds">Return to Refunds List</Link>
        </Button>
      </div>
    );
  }

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case "COMPLETED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            {st}
          </span>
        );
    }
  };

  const paymentAmount = Number(refund.payment?.amount || 0);
  const alreadyRefunded = Number(refund.payment?.refundedAmount || 0);
  const remainingRefundable = Math.max(0, paymentAmount - alreadyRefunded);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/refunds">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Refund #{refund.id.split("-")[0]}</h1>
              {renderStatusBadge(refund.status)}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">UUID: {refund.id}</p>
          </div>
        </div>

        {refund.status === "PENDING" && canWrite && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsApproveOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Check className="w-4 h-4" /> Approve & Process
            </Button>
            <Button
              onClick={() => setIsRejectOpen(true)}
              variant="destructive"
              className="gap-1.5"
            >
              <X className="w-4 h-4" /> Reject Request
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Refund Overview & Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Refund Details Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" /> Refund Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-3 border-y">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Requested Amount</p>
                <p className="text-2xl font-bold text-foreground mt-1">৳{Number(refund.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Currency: {refund.currency || "BDT"}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Processed Amount</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">৳{Number(refund.refundedAmount || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Number(refund.refundedAmount || 0) > 0 ? "Credited to payment method" : "Not yet disbursed"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Created Date</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {new Date(refund.createdAt).toLocaleString()}
                </p>
                {refund.completedAt && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Completed: {new Date(refund.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason for Refund</p>
                <p className="text-sm bg-muted/30 p-3 rounded-md border mt-1 text-foreground">
                  {refund.reason || "No explicit reason specified by applicant."}
                </p>
              </div>

              {refund.transactionReference && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Provider Transaction Reference
                  </p>
                  <p className="text-sm font-mono bg-muted/40 px-3 py-1.5 rounded-md border mt-1 inline-block">
                    {refund.transactionReference}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Associated Order Items Card */}
          {refund.order?.items && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-primary" /> Order Items ({refund.order.items.length})
              </h2>
              <div className="divide-y">
                {refund.order.items.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.product?.images?.[0]?.secureUrl || item.product?.images?.[0]?.imageUrl || item.product?.thumbnail ? (
                        <img
                          src={item.product?.images?.[0]?.secureUrl || item.product?.images?.[0]?.imageUrl || item.product?.thumbnail}
                          alt={item.product?.name || "Product"}
                          className="w-12 h-12 object-cover rounded-md border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                          Item
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.product?.name || "Product"}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">Variant: {item.variant.name || item.variant.sku}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ৳{Number(item.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">৳{(Number(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Audit History / Transactions */}
          {refund.transactions && refund.transactions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" /> Audit & Transaction Log
              </h2>
              <div className="space-y-3">
                {refund.transactions.map((tx: any) => (
                  <div key={tx.id} className="p-3 border rounded-lg bg-muted/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Status: {tx.status}</span>
                      <span className="text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</span>
                    </div>
                    {tx.providerReference && (
                      <p className="font-mono text-muted-foreground">Ref: {tx.providerReference}</p>
                    )}
                    {tx.responsePayload && (
                      <pre className="mt-1 p-2 rounded bg-background border text-[11px] overflow-x-auto">
                        {JSON.stringify(tx.responsePayload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Payment & Order Context */}
        <div className="space-y-6">
          {/* Payment Context Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Payment Details
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-xs font-medium">{refund.paymentId?.split("-")[0]}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Payment Status</span>
                <span className="font-semibold">{refund.payment?.status || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{refund.payment?.paymentMethod || "Digital"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Total Paid Amount</span>
                <span className="font-bold">৳{paymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Total Already Refunded</span>
                <span className="font-medium text-rose-600">৳{alreadyRefunded.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 pt-2">
                <span className="font-medium text-foreground">Available to Refund</span>
                <span className="font-bold text-emerald-600">৳{remainingRefundable.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Order Context Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Order Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b items-center">
                <span className="text-muted-foreground">Order Number</span>
                <Link
                  to={`/admin/orders/${refund.orderId}`}
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  #{refund.order?.orderNumber || refund.orderId?.split("-")[0]}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Order Status</span>
                <span className="font-medium">{refund.order?.status || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Order Payment Status</span>
                <span className="font-medium">{refund.order?.paymentStatus || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-bold">৳{Number(refund.order?.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Customer Context Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Customer Info
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {refund.customer?.firstName
                  ? `${refund.customer.firstName} ${refund.customer.lastName || ""}`
                  : "Guest Customer"}
              </p>
              <p className="text-muted-foreground text-xs">{refund.customer?.email || "No email available"}</p>
              {refund.customer?.phone && (
                <p className="text-muted-foreground text-xs">Phone: {refund.customer.phone}</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog: Approve */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Confirm & Execute Refund"
        description={
          <div className="space-y-3">
            <p>
              You are about to authorize and execute a refund of{" "}
              <strong>৳{Number(refund.amount).toFixed(2)}</strong> for Order #
              <strong>{refund.order?.orderNumber || refund.orderId?.split("-")[0]}</strong>.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Provider Transaction Reference / Bank TRX ID (Optional)
              </label>
              <Input
                placeholder="e.g. bKash TRX ID 9X728HJ..."
                value={providerReference}
                onChange={(e) => setProviderReference(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Confirm & Approve"
        variant="default"
        isLoading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
      />

      {/* Confirmation Dialog: Reject */}
      <ConfirmDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Reject Refund Request"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to reject this refund request of{" "}
              <strong>৳{Number(refund.amount).toFixed(2)}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Rejection Reason (will be logged & emailed)
              </label>
              <Input
                placeholder="e.g. Products already used or outside refund policy window..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Confirm Rejection"
        variant="destructive"
        isLoading={rejectMutation.isPending}
        onConfirm={() => rejectMutation.mutate()}
      />
    </div>
  );
}
