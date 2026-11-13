// TODO(stub): not implemented
import { Request, Response } from "express";

export const requestMobileChange = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile change not implemented" } });
};

export const verifyMobileChange = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile change not implemented" } });
};

export class AccountMobileController {
  public static requestMobileChange = requestMobileChange;
  public static verifyMobileChange = verifyMobileChange;
}
