// TODO(stub): not implemented
import React from 'react';

export interface PathaoShipmentCardProps {
  order?: any;
  onOrderUpdated?: () => void;
  canManage?: boolean;
}

export function PathaoShipmentCard({
  order: _order,
  onOrderUpdated: _onOrderUpdated,
  canManage: _canManage,
}: PathaoShipmentCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <h3 className="font-semibold leading-none tracking-tight">Courier / Shipment</h3>
      <p className="text-sm text-muted-foreground mt-2">Shipment details stub.</p>
    </div>
  );
}

export default PathaoShipmentCard;
