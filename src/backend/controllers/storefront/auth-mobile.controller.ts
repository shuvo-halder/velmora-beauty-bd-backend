// TODO(stub): not implemented
import { Request, Response } from "express";

export const registerMobile = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile auth not implemented" } });
};

export const verifyMobileRegistration = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile auth not implemented" } });
};

export const loginMobile = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile auth not implemented" } });
};

export const verifyMobileLogin = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Mobile auth not implemented" } });
};

export class AuthMobileController {
  public static registerMobile = registerMobile;
  public static verifyMobileRegistration = verifyMobileRegistration;
  public static loginMobile = loginMobile;
  public static verifyMobileLogin = verifyMobileLogin;
}
