import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getShipmentById, updateShipmentStatus } from "../../../services/shipment.service";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { ArrowLeft, Truck, CheckCircle, Navigation } from "lucide-react";

export function ShipmentDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  
  const { data: shipment, isLoading, isError } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => getShipmentById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {status: string, trackingInfo?: any}) => updateShipmentStatus(id!, vars.status, vars.trackingInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    }
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !shipment) return <div className="p-6">Shipment not found.</div>;

  const handleShip = () => {
    updateMutation.mutate({
      status: 'SHIPPED',
      trackingInfo: { trackingNumber, courier }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/shipments">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shipment Details</h2>
          <p className="text-muted-foreground">ID: {shipment.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Shipment Status & Tracking</h3>
          
          {shipment.status === 'PENDING' ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Courier Name</label>
                <Input value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g. FedEx, DHL, UPS" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tracking Number</label>
                <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Tracking code" />
              </div>
              <Button onClick={handleShip} disabled={updateMutation.isPending || !trackingNumber || !courier} className="w-full">
                <Truck className="w-4 h-4 mr-2" /> Mark as Shipped
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold text-lg text-primary">{shipment.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Courier</p>
                <p className="font-medium text-base">{shipment.courier?.name || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Tracking Number</p>
                <p className="font-mono font-bold text-lg">{shipment.trackingNumber || 'N/A'}</p>
              </div>
            </div>
          )}
          
          {shipment.status === 'SHIPPED' && (
            <Button
              onClick={() => updateMutation.mutate({ status: 'DELIVERED' })}
              disabled={updateMutation.isPending}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Mark as Delivered
            </Button>
          )}

          {/* Tracking Events History */}
          {shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
            <div className="pt-6 border-t space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" /> Tracking History
              </h4>
              <div className="space-y-2">
                {shipment.trackingEvents.map((evt: any) => (
                  <div key={evt.id} className="text-xs p-2 rounded bg-muted/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold">{evt.status}</span>: {evt.description}
                      {evt.location && <span className="text-muted-foreground"> ({evt.location})</span>}
                    </div>
                    <span className="text-muted-foreground shrink-0">{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Order Context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <p className="text-muted-foreground">Order ID</p>
                <Link to={`/orders`} className="font-medium text-primary hover:underline">
                  #{shipment.orderId?.split("-")[0]}
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{shipment.order?.customer?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{new Date(shipment.createdAt).toLocaleString()}</p>
              </div>
              {shipment.shippedAt && (
                <div>
                  <p className="text-muted-foreground">Shipped At</p>
                  <p className="font-medium">{new Date(shipment.shippedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Shipment Items</h3>
            <div className="space-y-2 text-sm">
              {shipment.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium">{item.orderItem?.product?.name || `Item ${item.orderItemId.split("-")[0]}`}</span>
                  <span className="font-bold">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
