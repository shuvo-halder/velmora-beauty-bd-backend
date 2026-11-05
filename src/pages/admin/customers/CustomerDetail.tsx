import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  User,
  ShoppingBag,
  DollarSign,
  Calendar,
  Key,
  CheckCircle,
  XCircle,
  FileText,
  Send,
  Star,
  AlertCircle
} from "lucide-react";
import {
  getCustomerById,
  updateCustomerStatus,
  updateCustomerMobileStatus,
  resetCustomerPassword,
  addCustomerNote
} from "../../../services/customer.service";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { notify } from "../../../lib/notify";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getCustomerById(id);
      setCustomer(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!id || !customer) return;
    try {
      await updateCustomerStatus(id, !customer.isActive);
      notify.success("Status Updated", `Customer account ${!customer.isActive ? 'activated' : 'deactivated'} successfully.`);
      fetchCustomerDetails();
    } catch (err: any) {
      notify.apiError(err, "Failed to update status.");
    }
  };

  const handleToggleMobileVerification = async () => {
    if (!id || !customer) return;
    const isVerified = !customer.phoneVerified;
    if (isVerified && !window.confirm("Are you sure you want to manually mark this mobile number as verified? This action will be recorded in the audit log.")) {
      return;
    }
    try {
      await updateCustomerMobileStatus(id, { phoneVerified: isVerified });
      notify.success("Mobile Status Updated", `Customer mobile marked as ${isVerified ? 'verified' : 'unverified'}.`);
      fetchCustomerDetails();
    } catch (err: any) {
      notify.apiError(err, "Failed to update mobile status.");
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!id || !customer) return;
    setIsResetting(true);
    try {
      const res = await resetCustomerPassword(id);
      notify.success("Password Reset Sent", res?.message || `Password reset instructions sent to ${customer.email}.`);
      setShowResetConfirm(false);
      fetchCustomerDetails();
    } catch (err: any) {
      notify.apiError(err, "Failed to reset customer password.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteText.trim()) return;
    setSubmittingNote(true);
    try {
      await addCustomerNote(id, noteText);
      setNoteText("");
      notify.success("Note Added", "Internal customer note recorded.");
      fetchCustomerDetails();
    } catch (err: any) {
      notify.apiError(err, "Failed to add internal note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="font-medium text-base">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-lg bg-rose-50 text-rose-700 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8" />
          <p className="font-semibold">{error || "Customer not found"}</p>
        </div>
        <Button onClick={() => navigate("/customers")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/customers")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5" /> Active Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                  <XCircle className="w-3.5 h-3.5" /> Account Deactivated
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {customer.email}
                {customer.emailVerified ? (
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {customer.phone || "No phone listed"}
                {customer.phone && (
                  customer.phoneVerified ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  )
                )}
              </span>
            </div>
          </div>
        </div>

        {hasPermission("Customers", "write") && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="gap-2">
              <Key className="w-4 h-4 text-amber-600" /> Force Password Reset
            </Button>
            <Button
              variant={customer.isActive ? "destructive" : "default"}
              size="sm"
              onClick={handleToggleStatus}
              className="gap-2"
            >
              {customer.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {customer.isActive ? "Deactivate Account" : "Activate Account"}
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Lifetime Value (LTV)</p>
            <p className="text-xl font-bold text-foreground">৳{Number(customer.lifetimeValue || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Orders</p>
            <p className="text-xl font-bold text-foreground">{customer.totalOrders || 0}</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Last Order Date</p>
            <p className="text-base font-bold text-foreground">
              {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : "No orders yet"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Order History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Customer Order History
            </h3>

            {customer.orders && customer.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customer.orders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-muted/20">
                        <td className="py-3 px-3 font-semibold text-primary">
                          <Link to={`/orders/${ord.id}`} className="hover:underline">
                            {ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-foreground">
                          ৳{Number(ord.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/orders/${ord.id}`}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            View Order
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No order history available for this customer.</p>
            )}
          </div>

          {/* Internal Account Notes */}
          <div className="bg-card border rounded-lg p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Account Notes
            </h3>

            {hasPermission("Customers", "write") && (
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={3}
                  placeholder="Type an internal note regarding this customer account..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-3 rounded-md border border-input text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={submittingNote || !noteText.trim()} className="gap-2">
                    <Send className="w-3.5 h-3.5" /> Save Customer Note
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3 pt-2 border-t">
              {customer.customerNotes && customer.customerNotes.length > 0 ? (
                customer.customerNotes.map((n: any) => (
                  <div key={n.id} className="p-3 bg-muted/30 border rounded-md text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>{n.author || "Admin"}</span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-foreground text-sm font-normal">{n.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No notes logged for this customer.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-base border-b pb-2">Customer Profile Summary</h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground flex items-center gap-2 font-semibold uppercase">
                  Email
                  {customer.emailVerified ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      <CheckCircle className="w-2.5 h-2.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      <AlertCircle className="w-2.5 h-2.5" /> Unverified
                    </span>
                  )}
                </span>
                <span className="font-medium text-foreground">{customer.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground flex items-center gap-2 font-semibold uppercase">
                    Phone
                    {customer.phone && (
                      customer.phoneVerified ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <AlertCircle className="w-2.5 h-2.5" /> Unverified
                        </span>
                      )
                    )}
                  </span>
                  <span className="font-medium text-foreground">{customer.phone || "Not provided"}</span>
                  {customer.phoneVerifiedAt && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Verified on: {new Date(customer.phoneVerifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {customer.phone && hasPermission("Customers", "write") && (
                   <Button variant="ghost" size="sm" onClick={handleToggleMobileVerification} className="h-7 text-xs border">
                     {customer.phoneVerified ? 'Mark Unverified' : 'Mark Verified'}
                   </Button>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase">Member Since</span>
                <span className="font-medium text-foreground">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase">Last Login</span>
                <span className="font-medium text-foreground">
                  {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString() : "Never logged in"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase">Default Shipping Address</span>
                <span className="font-medium text-foreground whitespace-pre-wrap">
                  {customer.shippingAddress || "123 Tech Blvd, Suite 100, San Francisco, CA 94107"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        title="Reset Customer Password"
        isOpen={showResetConfirm}
        onOpenChange={setShowResetConfirm}
       
        description={
          <>
            Are you sure you want to trigger a password reset for <strong>{customer?.email}</strong>? An automated reset instructions email will be sent immediately.
          </>
        }
        confirmText="Trigger Password Reset"
        variant="warning"
        isLoading={isResetting}
        onConfirm={handleConfirmResetPassword}
      />
    </div>
  );
}
