// TODO(stub): not implemented
export interface NormalizedShipmentRequest {
  orderId: string;
  orderNumber?: string | null;
  merchantReference?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  codAmount?: number | null;
  itemQuantity?: number | null;
  itemWeight?: number | null;
  weight?: number | null;
  specialInstructions?: string | null;
  notes?: string | null;
  items?: any[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface CourierProvider {
  id: string;
  name: string;
  displayName?: string;
  createShipment?: (req: NormalizedShipmentRequest) => Promise<any>;
  trackShipment?: (trackingNumber: string) => Promise<any>;
  cancelShipment?: (trackingNumber: string) => Promise<any>;
  [key: string]: any;
}

export interface CourierShipmentResult {
  trackingNumber: string;
  consignmentId?: string;
  status: string;
  rawResponse?: any;
}
