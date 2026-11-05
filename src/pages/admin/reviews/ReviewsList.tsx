import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getReviews,
  getReviewStats,
  updateReviewStatus,
  deleteReview,
} from "../../../services/review.service";
import { getProducts } from "../../../services/product.service";
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
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  PackageX,
  AlertCircle,
  Check,
  X,
  Trash2,
  Star
} from "lucide-react";

export function ReviewsList() {
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can("Products", "write") || user?.role?.name === "Super Admin";
  const canDelete = can("Products", "delete") || user?.role?.name === "Super Admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  
  // New Filters
  const [productFilter, setProductFilter] = useState("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState<"ALL" | "TRUE" | "FALSE">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-reviews-stats"],
    queryFn: () => getReviewStats(),
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: () => getProducts(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", page, statusFilter, ratingFilter, search, productFilter, verifiedFilter, startDate, endDate],
    queryFn: () => getReviews({
      page,
      limit: 10,
      keyword: search,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      rating: ratingFilter !== "ALL" ? ratingFilter : undefined,
      productId: productFilter !== "ALL" ? productFilter : undefined,
      isVerifiedPurchase: verifiedFilter !== "ALL" ? (verifiedFilter === "TRUE" ? true : false) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" | "HIDDEN" }) => updateReviewStatus(id, status),
    onSuccess: () => {
      notify.success("Review status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews-stats"] });
    },
    onError: (error: any) => {
      notify.error(error.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      notify.success("Review deleted successfully");
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews-stats"] });
    },
    onError: (error: any) => {
      notify.error(error.message || "Failed to delete review");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      case "HIDDEN":
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"><Eye className="w-3 h-3 mr-1" /> Hidden</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setRatingFilter("ALL");
    setProductFilter("ALL");
    setVerifiedFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">Manage and moderate customer reviews</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><AlertCircle className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Clock className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">Approved</p><p className="text-2xl font-bold">{stats.approved}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-lg text-red-600"><XCircle className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">Rejected</p><p className="text-2xl font-bold">{stats.rejected}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><PackageCheck className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">Verified</p><p className="text-2xl font-bold">{stats.verified}</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <CardTitle>All Reviews</CardTitle>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-grow max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search reviews..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <select
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="HIDDEN">Hidden</option>
              </select>

              <select
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
                value={ratingFilter}
                onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[180px]"
                value={productFilter}
                onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Products</option>
                {productsData?.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>

              <select
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[160px]"
                value={verifiedFilter}
                onChange={(e) => { setVerifiedFilter(e.target.value as any); setPage(1); }}
              >
                <option value="ALL">All Purchases</option>
                <option value="TRUE">Verified Only</option>
                <option value="FALSE">Not Verified</option>
              </select>

              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground ml-1">From:</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
                <span className="text-sm text-muted-foreground ml-1">To:</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.reviews?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No reviews found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.reviews?.map((review: any) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="font-medium">{review.product?.name}</div>
                            {review.isVerifiedPurchase && (
                              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                Verified Purchase
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{review.customerName}</div>
                            <div className="text-xs text-gray-500">
                              {review.customerMobile ? review.customerMobile.replace(/.(?=.{4})/g, '*') : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-yellow-500">
                              <Star className="w-4 h-4 fill-current mr-1" />
                              <span className="font-medium text-gray-900">{review.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(review.status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{new Date(review.createdAt).toLocaleDateString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link to={`/admin/reviews/${review.id}`}>
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Link>
                              </Button>
                              {canWrite && review.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => updateStatusMutation.mutate({ id: review.id, status: "APPROVED" })}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => updateStatusMutation.mutate({ id: review.id, status: "REJECTED" })}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeleteConfirm(review.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
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
              
              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.pagination.total)} of {data.pagination.total} reviews
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={page === data.pagination.totalPages}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete Review"
        variant="destructive"
      />
    </div>
  );
}
