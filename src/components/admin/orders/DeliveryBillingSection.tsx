// TODO(stub): not implemented
import React from 'react';

export interface DeliveryBillingSectionProps {
  order?: any;
}

export function DeliveryBillingSection({ order: _order }: DeliveryBillingSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <h3 className="font-semibold leading-none tracking-tight">Delivery & Billing</h3>
      <p className="text-sm text-muted-foreground mt-2">Delivery & billing section stub.</p>
    </div>
  );
}

export default DeliveryBillingSection;
