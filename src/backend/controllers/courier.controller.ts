// TODO(stub): not implemented
import { Request, Response } from "express";

export class CourierController {
  public static listProviders = (_req: Request, res: Response) => {
    res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Courier controller not implemented" } });
  };

  public static getProvider = (_req: Request, res: Response) => {
    res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Courier controller not implemented" } });
  };

  public static updateProviderConfig = (_req: Request, res: Response) => {
    res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Courier controller not implemented" } });
  };

  public static testProvider = (_req: Request, res: Response) => {
    res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Courier controller not implemented" } });
  };

  public static setActiveProvider = (_req: Request, res: Response) => {
    res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Courier controller not implemented" } });
  };
}
