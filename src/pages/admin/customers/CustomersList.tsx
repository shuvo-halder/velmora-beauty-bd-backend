import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  ShoppingBag,
  Key,
  FileText
} from "lucide-react";
import {
  getCustomers,
  updateCustomerStatus,
  resetCustomerPassword,
  addCustomerNote
} from "../../../services/customer.service";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../context/AuthContext";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { notify } from "../../../lib/notify";

export function CustomersList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Add Note Modal
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Reset password confirmation
  const [customerToReset, setCustomerToReset] = useState<any | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCustomers({ page, limit, search });
      setCustomers(data.customers || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleToggleStatus = async (customer: any) => {
    const newStatus = !customer.isActive;
    try {
      await updateCustomerStatus(customer.id, newStatus);
      notify.success("Status Updated", `Customer account ${newStatus ? "activated" : "deactivated"}.`);
      fetchCustomers();
    } catch (err: any) {
      notify.apiError(err, "Failed to update customer status.");
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!customerToReset) return;
    setResettingPassword(true);
    try {
      const res = await resetCustomerPassword(customerToReset.id);
      notify.success("Password Reset Initiated", res?.message || `Password reset link sent to ${customerToReset.email}.`);
      setCustomerToReset(null);
    } catch (err: any) {
      notify.apiError(err, "Failed to reset customer password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !noteText.trim()) return;
    setSubmittingNote(true);
    try {
      await addCustomerNote(selectedCust.id, noteText);
      setNoteModalOpen(false);
      setNoteText("");
      notify.success("Note Added", "Internal customer note recorded.");
    } catch (err: any) {
      notify.apiError(err, "Failed to add note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Management</h1>
          <p className="text-sm text-muted-foreground">Manage registered customer accounts, view LTV, orders, and activity.</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-card border rounded-lg p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={() => { setSearch(""); setPage(1); fetchCustomers(); }}>Reset</Button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-card border rounded-lg overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p>Loading customers...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Email & Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Total Orders</th>
                  <th className="px-4 py-3 text-right">Lifetime Value (LTV)</th>
                  <th className="px-4 py-3">Last Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <Link to={`/customers/${cust.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {cust.firstName?.[0]}{cust.lastName?.[0]}
                        </div>
                        <div>
                          <p>{cust.firstName} {cust.lastName}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <p className="text-foreground">{cust.email}</p>
                        {cust.emailVerified ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <p>{cust.phone || "No phone"}</p>
                        {cust.phone ? (
                          cust.phoneVerified ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cust.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {cust.totalOrders || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      ৳{Number(cust.lifetimeValue || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {cust.lastOrderDate ? new Date(cust.lastOrderDate).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/customers/${cust.id}`)}
                         
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {hasPermission("Customers", "write") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedCust(cust); setNoteModalOpen(true); }}
                             
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCustomerToReset(cust)}
                             
                            >
                              <Key className="w-4 h-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(cust)}
                              title={cust.isActive ? "Deactivate Customer" : "Activate Customer"}
                            >
                              {cust.isActive ? (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{customers.length}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {noteModalOpen && selectedCust && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Add Note for {selectedCust.firstName} {selectedCust.lastName}</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <textarea
                rows={4}
                placeholder="Type internal note for this customer profile..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-3 rounded-md border border-input text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setNoteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingNote || !noteText.trim()}>
                  {submittingNote ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        title="Reset Customer Password"
        isOpen={!!customerToReset}
        onOpenChange={(open) => !open && setCustomerToReset(null)}
       
        description={
          <>
            Are you sure you want to trigger a password reset for customer <strong>{customerToReset?.email}</strong>? An automated reset instructions email will be sent.
          </>
        }
        confirmText="Trigger Reset"
        variant="warning"
        isLoading={resettingPassword}
        onConfirm={handleConfirmResetPassword}
      />
    </div>
  );
}
