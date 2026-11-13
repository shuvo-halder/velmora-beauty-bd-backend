// TODO(stub): not implemented
export class StorefrontShipmentService {
  public static async getOrderShipments(_customerId: string, _orderId: string): Promise<any[]> {
    return [];
  }

  public static async getOrderTracking(_customerId: string, _orderId: string): Promise<any> {
    return null;
  }

  public static async getGuestOrderTracking(_orderNumber: string, _phoneOrEmail: string): Promise<any> {
    return null;
  }
}
