// TODO(stub): not implemented
import { Request, Response } from "express";

export const getProductFaqs = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [] });
};

export const assignProductFaq = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Product FAQ not implemented" } });
};

export const reorderProductFaqs = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Product FAQ not implemented" } });
};

export const removeProductFaq = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Product FAQ not implemented" } });
};
