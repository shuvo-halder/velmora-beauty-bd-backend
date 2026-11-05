import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  FileText,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Trash2,
  XCircle,
  RotateCcw
} from "lucide-react";
import { getOrders, updateOrderStatus, deleteOrder } from "../../../services/order.service";
import { getStoreSettings } from "../../../services/setting.service";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../context/AuthContext";
import { useBranding } from "../../../context/BrandingContext";
import { notify } from "../../../lib/notify";

export function OrdersList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { branding } = useBranding();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Update Status Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Print Slip Modal State
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [printType, setPrintType] = useState<"invoice" | "packing_slip" | null>(null);

  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    getStoreSettings().then(setStoreSettings).catch(console.error);
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPendingOrders = async () => {
    setIsExporting(true);
    try {
      let allPendingOrders: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const data = await getOrders({
          page: currentPage,
          limit: 100,
          status: "Pending",
        });
        
        allPendingOrders = [...allPendingOrders, ...(data.orders || [])];
        totalPages = data.pagination?.totalPages || 1;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allPendingOrders.length === 0) {
        notify.info("No pending orders available for export.");
        return;
      }

      const headers = [
        "Order ID",
        "Order Date",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Shipping Address",
        "Product Details",
        "Total Amount",
        "Delivery Fee",
        "Payment Method",
        "Payment Status",
        "Order Status",
      ];

      const escapeCsv = (str: any) => {
        if (!str) return '""';
        const stringified = String(str);
        if (stringified.includes('"') || stringified.includes(',') || stringified.includes('\n') || stringified.includes('\r')) {
          return `"${stringified.replace(/"/g, '""')}"`;
        }
        return stringified;
      };

      const rows = allPendingOrders.map((order) => {
        const customerName = order.customer ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() : "Guest";
        const customerPhone = order.customer?.phone || "";
        const customerEmail = order.customer?.email || order.customerEmail || "";
        
        const productsDetail = (order.items || [])
          .map((item: any) => `${item.product?.name || item.productName || "Product"} x${item.quantity}`)
          .join("; ");

        return [
          escapeCsv(order.orderNumber || order.id),
          escapeCsv(new Date(order.createdAt).toLocaleDateString()),
          escapeCsv(customerName),
          escapeCsv(customerPhone),
          escapeCsv(customerEmail),
          escapeCsv(order.shippingAddress || ""),
          escapeCsv(productsDetail),
          escapeCsv(Number(order.totalAmount || 0).toFixed(2)),
          escapeCsv(Number(order.shippingFee || 0).toFixed(2)),
          escapeCsv(order.paymentMethod || ""),
          escapeCsv(order.paymentStatus || "Unpaid"),
          escapeCsv(order.status || "Pending"),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `pending-orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      notify.success(`Exported ${allPendingOrders.length} pending orders.`);
    } catch (err: any) {
      console.error(err);
      notify.error("Failed to export pending orders.");
    } finally {
      setIsExporting(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrders({
        page,
        limit,
        search,
        status,
        paymentStatus,
        startDate,
        endDate,
      });
      setOrders(data.orders || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, limit, status, paymentStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleOpenStatusModal = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewPaymentStatus(order.paymentStatus || "Unpaid");
    setStatusModalOpen(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive this order and all related operational records?")) return;
    try {
      await deleteOrder(id);
      notify.success("Order archived successfully.");
      fetchOrders();
    } catch (err: any) {
      notify.apiError(err, "Failed to archive order.");
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await updateOrderStatus(selectedOrder.id, {
        status: newStatus,
        paymentStatus: newPaymentStatus,
      });
      setStatusModalOpen(false);
      notify.success("Order Updated", `Order #${selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)} status set to ${newStatus}.`);
      fetchOrders();
    } catch (err: any) {
      notify.apiError(err, "Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
      case "processing":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 animate-spin" /> Processing</span>;
      case "packed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800"><Package className="w-3 h-3" /> Packed</span>;
      case "shipped":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Truck className="w-3 h-3" /> Shipped</span>;
      case "delivered":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><XCircle className="w-3 h-3" /> Cancelled</span>;
      case "refunded":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><RotateCcw className="w-3 h-3" /> Refunded</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  const getPaymentBadge = (pst: string) => {
    switch (pst?.toLowerCase()) {
      case "paid":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case "unpaid":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Unpaid</span>;
      case "refunded":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Refunded</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">{pst || "Unpaid"}</span>;
    }
  };

  return (
    <>
      <div className="p-6 space-y-6 max-w-7xl mx-auto print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Order Management</h1>
          <p className="text-sm text-muted-foreground">View, search, filter, and manage store customer orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPendingOrders} variant="outline" size="sm" className="gap-2" disabled={isExporting}>
            <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} /> 
            {isExporting ? "Exporting..." : "Export Pending CSV"}
          </Button>
          <Button onClick={fetchOrders} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border rounded-lg p-4 space-y-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div>
            <select
              value={paymentStatus}
              onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">Search</Button>
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>Reset</Button>
          </div>
        </form>

        {/* Date Range Inputs */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setPage(1); fetchOrders(); }}>
            Apply Date Filter
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border rounded-lg overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p>Loading orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">No orders found</p>
            <p className="text-xs">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">
                      <Link to={`/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {order.customer ? (
                        <div>
                          <p className="font-medium text-foreground">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3">{getPaymentBadge(order.paymentStatus)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      ৳{Number(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {hasPermission("Orders", "write") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStatusModal(order)}
                            title="Update Status"
                          >
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setPrintOrder(order); setPrintType("invoice"); }}
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                        {hasPermission("Orders", "write") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            title="Archive Order"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        )}
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
            Showing <span className="font-medium text-foreground">{orders.length}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> orders
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

      {/* Update Status Modal */}
      {statusModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Update Status - {selectedOrder.orderNumber}</h3>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Order Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Payment Status
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStatusModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Update Status"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Printable Slip Modal */}
      {printOrder && printType && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 print:static print:inset-auto print:block print:bg-white print:p-0">
          <div className="bg-card border rounded-lg shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:w-full print:m-0 print:p-0">
            <div className="flex items-center justify-between border-b pb-4 print:border-none print:pb-0 print:hidden">
              <h3 className="text-lg font-bold">
                {printType === "invoice" ? "Official Tax Invoice" : "Packing Slip"} - {printOrder.orderNumber}
              </h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => window.print()} className="gap-2">
                  <Printer className="w-4 h-4" /> Print Document
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setPrintOrder(null); setPrintType(null); }}>
                  Close
                </Button>
              </div>
            </div>

            {/* Print Body */}
            <div className="space-y-6 text-sm print:text-black">
              {/* Optional: Add a clean print-only title */}
              <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-wider">{printType === "invoice" ? "Tax Invoice" : "Packing Slip"}</h1>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  {(branding.invoiceLogo || branding.logoUrl || branding.adminPanelLogo) && (
                    <img 
                      src={branding.invoiceLogo || branding.logoUrl || branding.adminPanelLogo} 
                      alt="Store Logo" 
                      className="h-12 w-auto mb-2 object-contain" 
                    />
                  )}
                  <h2 className="text-xl font-extrabold tracking-tight">{branding.siteName || "E-Commerce Enterprise Inc."}</h2>
                  {storeSettings?.address ? (
                    <p className="text-xs text-muted-foreground print:text-gray-600 whitespace-pre-wrap">{storeSettings.address}</p>
                  ) : null}
                  {storeSettings?.supportEmail ? (
                    <p className="text-xs text-muted-foreground print:text-gray-600">{storeSettings.supportEmail}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary print:text-black">{printOrder.orderNumber}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-600">Date: {new Date(printOrder.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-600">Status: {printOrder.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 print:border-gray-300">
                <div>
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-1 print:text-gray-500">Customer / Shipping Address</h4>
                  <p className="font-medium">{printOrder.customer?.firstName} {printOrder.customer?.lastName}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-600">{printOrder.customer?.email}</p>
                  <p className="text-xs whitespace-pre-wrap print:text-gray-600">{printOrder.shippingAddress || "123 Tech Blvd, Suite 100, San Francisco, CA 94107"}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-1 print:text-gray-500">Payment Method</h4>
                  <p className="font-medium">{printOrder.paymentMethod || "Credit Card"}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-600">Payment Status: {printOrder.paymentStatus || "Paid"}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-t border-b print:border-gray-300">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground font-semibold print:bg-gray-100 print:text-gray-700">
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    {printType === "invoice" && <th className="py-2 px-2 text-right">Price</th>}
                    {printType === "invoice" && <th className="py-2 px-2 text-right">Subtotal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-xs print:divide-gray-300">
                  {printOrder.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-medium">{item.product?.name || "Product"}</td>
                      <td className="py-2 px-2 text-center">{item.quantity}</td>
                      {printType === "invoice" && <td className="py-2 px-2 text-right">৳{Number(item.price).toFixed(2)}</td>}
                      {printType === "invoice" && <td className="py-2 px-2 text-right">৳{(item.quantity * Number(item.price)).toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>

              {printType === "invoice" && (
                <div className="flex justify-end text-sm">
                  <div className="w-48 space-y-1">
                    <div className="flex justify-between font-bold text-base border-t pt-1 print:border-gray-300">
                      <span>Total Amount:</span>
                      <span className="text-primary print:text-black">৳{Number(printOrder.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
