import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentById, updatePaymentStatus } from "../../../services/payment.service";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { notify } from "../../../lib/notify";

export function PaymentDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  
  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => getPaymentById(id!),
    enabled: !!id,
  });

  const markPaidMutation = useMutation({
    mutationFn: () => updatePaymentStatus(id!, "PAID"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      notify.success("Payment Marked as Paid", "Payment status updated to PAID successfully.");
    },
    onError: (err: any) => {
      notify.apiError(err, "Failed to mark payment as Paid.");
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!payment) return <div>Payment not found.</div>;

  const canMarkPaid =
    hasPermission("Payments", "write") &&
    payment.status !== "PAID" &&
    payment.status !== "REFUNDED" &&
    payment.status !== "CANCELLED" &&
    payment.status !== "FAILED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/payments">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Payment Details</h2>
            <p className="text-muted-foreground">ID: {payment.id}</p>
          </div>
        </div>

        {canMarkPaid && (
          <Button
            onClick={() => markPaidMutation.mutate()}
            disabled={markPaidMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {markPaidMutation.isPending ? "Updating..." : "Mark as Paid"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Transaction Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">৳{payment.amount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{payment.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-medium">{payment.provider}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(payment.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Order & Customer</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Order ID</p>
              <Link to={`/admin/orders/${payment.orderId}`} className="font-medium text-primary hover:underline">
                {payment.orderId?.split("-")[0]}
              </Link>
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <Link to={`/admin/customers/${payment.customerId}`} className="font-medium text-primary hover:underline">
                {payment.customer?.email || payment.customerId?.split("-")[0]}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
