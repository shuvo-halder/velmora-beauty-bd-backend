// TODO(stub): not implemented
import React from 'react';

export interface ProductFaqsTabProps {
  productId?: string;
}

export function ProductFaqsTab({ productId: _productId }: ProductFaqsTabProps) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <h3 className="text-lg font-semibold leading-none tracking-tight">Product FAQs</h3>
      <p className="text-sm text-muted-foreground">Product FAQs management stub.</p>
    </div>
  );
}

export default ProductFaqsTab;
