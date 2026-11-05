import React, { useState, useEffect } from "react";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessions, revokeSession } from "../../services/session.service";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { MonitorX } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

export function Sessions() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] })
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device / User Agent</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session: any) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {session.user?.email}
                  </TableCell>
                  <TableCell>{session.ipAddress || "Unknown"}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={session.userAgent}>
                    {session.userAgent || "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(session.createdAt), 'PP pp')}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasPermission("Sessions", "delete") && (
                      <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(session.id)} className="text-destructive hover:bg-destructive/10">
                        <MonitorX className="mr-2 h-4 w-4" />
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No active sessions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
