// TODO(stub): not implemented
import { Request, Response } from "express";

export const getMyShipments = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [] });
};

export const getShipmentById = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Shipment details not implemented" } });
};

export const getOrderShipments = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [] });
};

export const getOrderTracking = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Order tracking not implemented" } });
};

export class ShipmentController {
  public static getMyShipments = getMyShipments;
  public static getShipmentById = getShipmentById;
  public static getOrderShipments = getOrderShipments;
  public static getOrderTracking = getOrderTracking;
}
