import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReviewById,
  updateReviewStatus,
  updateAdminResponse,
} from "../../../services/review.service";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

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
  ShoppingBag,
  User,
  Star,
  Image as ImageIcon, MessageSquare, Save
} from "lucide-react";

export function ReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adminResponse, setAdminResponse] = useState<string>("");
  const { can, user } = useAuth();
  
  const canWrite = can("Products", "write") || user?.role?.name === "Super Admin";

  
  const { data: review, isLoading } = useQuery({
    queryKey: ["admin-review", id],
    queryFn: () => getReviewById(id as string),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (review && review.adminResponse !== undefined) {
      setAdminResponse(review.adminResponse || "");
    }
  }, [review]);

  
  const updateResponseMutation = useMutation({
    mutationFn: (response: string) => updateAdminResponse(id as string, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review", id] });
      notify.success("Admin response updated successfully");
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to update response");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: "APPROVED" | "REJECTED" | "HIDDEN") => updateReviewStatus(id as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review", id] });
      notify.success("Review status updated successfully");
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to update status");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Approved</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1.5" /> Rejected</span>;
      case "HIDDEN":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"><AlertCircle className="w-4 h-4 mr-1.5" /> Hidden</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4 mr-1.5" /> Pending</span>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  }

  if (!review) {
    return <div className="text-center p-12 text-gray-500">Review not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin/reviews")} className="-ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reviews
        </Button>
        <div className="flex gap-2">
          {canWrite && review.status !== "APPROVED" && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => updateStatusMutation.mutate("APPROVED")}
              disabled={updateStatusMutation.isPending}
            >
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          )}
          {canWrite && review.status !== "REJECTED" && (
            <Button 
              variant="destructive"
              onClick={() => updateStatusMutation.mutate("REJECTED")}
              disabled={updateStatusMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
          )}
          {canWrite && review.status === "APPROVED" && (
            <Button 
              variant="secondary"
              onClick={() => updateStatusMutation.mutate("HIDDEN")}
              disabled={updateStatusMutation.isPending}
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Hide
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Review Details</h1>
        {getStatusBadge(review.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" /> Reviewer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{review.customerName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Mobile (Masked)</div>
                <div className="font-medium">{review.customerMobile?.replace(/.(?=.{4})/g, '*') || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{review.customerEmail || 'N/A'}</div>
              </div>
              {review.customerId && (
                <div>
                  <div className="text-sm text-gray-500">Customer Account</div>
                  <Link to={`/admin/customers/${review.customerId}`} className="text-blue-600 hover:underline text-sm font-medium">
                    View Customer Profile
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2 text-gray-500" /> Purchase Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500">Product</div>
                <div className="font-medium">{review.product?.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Verified Purchase</div>
                <div className="font-medium">
                  {review.isVerifiedPurchase ? (
                    <span className="text-blue-600 font-semibold flex items-center mt-1">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Yes
                    </span>
                  ) : "No"}
                </div>
              </div>
              {review.orderItem?.order && (
                <>
                  <div>
                    <div className="text-sm text-gray-500">Order Number</div>
                    <Link to={`/admin/orders/${review.orderItem.order.id}`} className="text-blue-600 hover:underline font-medium">
                      {review.orderItem.order.orderNumber}
                    </Link>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Order Date</div>
                    <div className="font-medium">{new Date(review.orderItem.order.createdAt).toLocaleDateString()}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Review Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center">
                <Star className="w-5 h-5 mr-2 text-gray-500" /> Review Content
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= review.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="text-gray-500 font-medium ml-2">({review.rating} out of 5)</span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900">{review.headline || "No Headline Provided"}</h3>
                <p className="mt-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {review.comment}
                </p>
              </div>

              {review.images && review.images.length > 0 && (
                <div className="pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2 text-gray-500" /> Attached Images
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {review.images.map((img: any, i: number) => (
                      <a href={img.url} target="_blank" rel="noopener noreferrer" key={i} className="block border rounded-md overflow-hidden hover:opacity-90 transition-opacity">
                        <img src={img.url} alt={`Review photo ${i+1}`} className="w-32 h-32 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-2" /> Submitted on {new Date(review.createdAt).toLocaleString()}
              </div>

            
              {/* Admin Response */}
              <div className="pt-6 border-t mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-500" /> Admin Response
                </h4>
                {canWrite ? (
                  <div className="space-y-4">
                    <textarea 
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Write a public response to this review..."
                      className="min-h-[120px] resize-none"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {adminResponse.length}/1000 characters
                      </span>
                      <Button 
                        onClick={() => updateResponseMutation.mutate(adminResponse)}
                        disabled={updateResponseMutation.isPending || adminResponse === (review.adminResponse || "")}
                        size="sm"
                      >
                        {updateResponseMutation.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2"/> Save Response</>}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-md">
                    {review.adminResponse ? (
                      <p className="text-sm whitespace-pre-wrap">{review.adminResponse}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No response provided.</p>
                    )}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
