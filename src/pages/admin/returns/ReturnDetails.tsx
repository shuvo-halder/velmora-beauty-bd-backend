import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReturnById,
  approveReturn,
  rejectReturn,
  receiveReturn,
} from "../../../services/return.service";
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
  PackageCheck,
  PackageX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShoppingBag,
  User,
  RotateCcw,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ExternalLink
} from "lucide-react";

export function ReturnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can("Orders", "write") || can("Returns", "write") || user?.role?.name === "Super Admin";

  const [adminNotes, setAdminNotes] = useState("");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);

  const { data: rma, isLoading, isError } = useQuery({
    queryKey: ["return", id],
    queryFn: () => getReturnById(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => approveReturn(id!, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return", id] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Return Approved", "RMA has been marked as Approved.");
      setIsApproveOpen(false);
      setAdminNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to approve return."),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectReturn(id!, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return", id] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Return Rejected", "RMA has been marked as Rejected.");
      setIsRejectOpen(false);
      setAdminNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to reject return."),
  });

  const receiveMutation = useMutation({
    mutationFn: () => receiveReturn(id!, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return", id] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      notify.success("Items Received", "Physical items marked as received and inventory restored.");
      setIsReceiveOpen(false);
      setAdminNotes("");
    },
    onError: (err) => notify.apiError(err, "Failed to mark return as received."),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !rma) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Return Request Not Found</h2>
        <p className="text-muted-foreground text-sm">The RMA ID you requested does not exist or was removed.</p>
        <Button asChild variant="outline">
          <Link to="/admin/returns">Return to RMA List</Link>
        </Button>
      </div>
    );
  }

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Requested
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "RECEIVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <PackageCheck className="w-3.5 h-3.5" /> Received & Restocked
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <PackageX className="w-3.5 h-3.5" /> Rejected
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

  const isPending = approveMutation.isPending || rejectMutation.isPending || receiveMutation.isPending;

  // Calculate approximate value of items being returned
  const totalReturnValue = (rma.items || []).reduce((sum: number, item: any) => {
    const unitPrice = Number(item.orderItem?.price || 0);
    return sum + unitPrice * (item.quantity || 1);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/returns">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">RMA #{rma.id.split("-")[0]}</h1>
              {renderStatusBadge(rma.status)}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">UUID: {rma.id}</p>
          </div>
        </div>

        {/* Header Action Buttons */}
        {canWrite && (
          <div className="flex items-center gap-2">
            {rma.status === "REQUESTED" && (
              <>
                <Button
                  onClick={() => setIsApproveOpen(true)}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <Check className="w-4 h-4" /> Approve RMA
                </Button>
                <Button
                  onClick={() => setIsRejectOpen(true)}
                  disabled={isPending}
                  variant="destructive"
                  className="gap-1.5"
                >
                  <X className="w-4 h-4" /> Reject RMA
                </Button>
              </>
            )}
            {rma.status === "APPROVED" && (
              <Button
                onClick={() => setIsReceiveOpen(true)}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <PackageCheck className="w-4 h-4" /> Mark Received & Restock
              </Button>
            )}
            {rma.status === "RECEIVED" && (
              <Button
                onClick={() => navigate("/admin/refunds")}
                variant="outline"
                className="gap-1.5 border-primary text-primary hover:bg-primary/10"
              >
                <ArrowDownLeft className="w-4 h-4" /> Initiate Refund Workflow
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: RMA Items & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Return Items List */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-primary" /> Return Items ({rma.items?.length || 0})
            </h2>

            <div className="divide-y">
              {rma.items?.map((item: any) => {
                const unitPrice = Number(item.orderItem?.price || 0);
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {item.orderItem?.product?.thumbnail ? (
                        <img
                          src={item.orderItem.product.thumbnail}
                          alt={item.orderItem.product.name}
                          className="w-14 h-14 object-cover rounded-md border shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs shrink-0">
                          Item
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {item.orderItem?.product?.name || `Item ${item.orderItemId.split("-")[0]}`}
                        </p>
                        {item.orderItem?.variant && (
                          <p className="text-xs text-muted-foreground">
                            Variant: {item.orderItem.variant.name || item.orderItem.variant.sku}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Condition: <strong>{item.condition || "Not specified"}</strong>
                          </span>
                          <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Reason: <strong>{item.reason || rma.reason}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">Qty: {item.quantity}</p>
                      {unitPrice > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground mt-0.5">৳{unitPrice.toFixed(2)} / unit</p>
                          <p className="text-sm font-bold text-primary mt-1">৳{lineTotal.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalReturnValue > 0 && (
              <div className="pt-4 border-t mt-4 flex justify-between items-center text-sm">
                <span className="font-medium text-muted-foreground">Total Value of Returned Items:</span>
                <span className="text-lg font-bold text-foreground">৳{totalReturnValue.toFixed(2)}</span>
              </div>
            )}
          </Card>

          {/* Return Reason & Notes Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Return Reason & Internal Notes
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer's Reason</p>
                <p className="p-3 bg-muted/30 rounded-md border mt-1 text-foreground font-medium">
                  {rma.reason || "No explicit reason provided."}
                </p>
              </div>

              {rma.adminNotes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Notes</p>
                  <p className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800 mt-1 text-foreground">
                    {rma.adminNotes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Order & Customer Context */}
        <div className="space-y-6">
          {/* Order Information Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Order Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b items-center">
                <span className="text-muted-foreground">Order ID</span>
                <Link
                  to={`/admin/orders/${rma.orderId}`}
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  #{rma.order?.orderNumber || rma.orderId?.split("-")[0]}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Order Status</span>
                <span className="font-semibold">{rma.order?.status || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Payment Status</span>
                <span className="font-medium">{rma.order?.paymentStatus || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-bold">৳{Number(rma.order?.totalAmount || 0).toFixed(2)}</span>
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
                {rma.customer?.firstName
                  ? `${rma.customer.firstName} ${rma.customer.lastName || ""}`
                  : "Guest Customer"}
              </p>
              <p className="text-muted-foreground text-xs">{rma.customer?.email || "No email available"}</p>
              {rma.customer?.phone && (
                <p className="text-muted-foreground text-xs">Phone: {rma.customer.phone}</p>
              )}
            </div>
          </Card>

          {/* Timeline / Dates Card */}
          <Card className="p-6 space-y-3 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RMA Timeline</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Requested On:</span>
                <span className="font-medium">{new Date(rma.createdAt).toLocaleString()}</span>
              </div>
              {rma.updatedAt && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{new Date(rma.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog: Approve RMA */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Approve Return Request (RMA)"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to approve this RMA for Order #
              <strong>{rma.order?.orderNumber || rma.orderId?.split("-")[0]}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Admin Notes / Return Instructions (Optional)
              </label>
              <Input
                placeholder="e.g. Approved. Customer advised to ship to Central Warehouse..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Approve RMA"
        variant="default"
        isLoading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
      />

      {/* Confirmation Dialog: Reject RMA */}
      <ConfirmDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Reject Return Request"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to reject return request RMA #
              <strong>{rma.id?.split("-")[0]}</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Rejection Reason (will be logged & emailed)
              </label>
              <Input
                placeholder="e.g. Non-returnable item / outside 7-day return policy..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Reject RMA"
        variant="destructive"
        isLoading={rejectMutation.isPending}
        onConfirm={() => rejectMutation.mutate()}
      />

      {/* Confirmation Dialog: Receive Items */}
      <ConfirmDialog
        isOpen={isReceiveOpen}
        onOpenChange={setIsReceiveOpen}
        title="Confirm Receipt & Restock Inventory"
        description={
          <div className="space-y-3">
            <p>
              Confirming receipt will verify the return package and automatically restore product stock levels in the warehouse inventory.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Warehouse Inspection Notes (Optional)
              </label>
              <Input
                placeholder="e.g. Package inspected, all items intact, placed in stock shelf A2..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText="Receive & Restock"
        variant="default"
        isLoading={receiveMutation.isPending}
        onConfirm={() => receiveMutation.mutate()}
      />
    </div>
  );
}
