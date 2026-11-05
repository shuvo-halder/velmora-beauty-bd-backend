import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAsRead, markAllAsRead } from "../../../services/notification.service";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";

export function NotificationsList() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications({ page, limit: 10 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  if (isLoading) return <LoadingSpinner />;

  const notificationsList = data?.notifications || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">System alerts and customer messages.</p>
        </div>
        {notificationsList.some((n: any) => n.status !== 'READ') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All as Read
          </Button>
        )}
      </div>

      <Card className="divide-y">
        {notificationsList.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No notifications found.
          </div>
        ) : (
          notificationsList.map((notification: any) => {
            const isRead = notification.status === 'READ';
            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 flex items-start gap-4 transition-colors hover:bg-muted/50",
                  !isRead && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    !isRead ? "bg-primary" : "bg-transparent"
                  )}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{notification.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                    {notification.customer?.email && ` • ${notification.customer.email}`}
                  </p>
                </div>
                {!isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markReadMutation.mutate(notification.id)}
                    disabled={markReadMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" /> Mark Read
                  </Button>
                )}
              </div>
            );
          })
        )}
        
        <div className="p-4 flex items-center justify-between border-t">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
