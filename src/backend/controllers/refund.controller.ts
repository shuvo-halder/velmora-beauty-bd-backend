import { Response, NextFunction } from "express";
import { AdminRefundService } from "../services/refund.service";

export const getRefunds = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await AdminRefundService.getRefunds({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      status: status as string,
    });
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const getRefundById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const refund = await AdminRefundService.getRefundById(id);
    res.status(200).json({ status: "success", data: { refund } });
  } catch (error) {
    next(error);
  }
};

export const approveRefund = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { providerReference } = req.body || {};
    const refund = await AdminRefundService.processRefund(id, true, providerReference);
    res.status(200).json({
      status: "success",
      message: "Refund approved successfully",
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRefund = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, providerReference } = req.body || {};
    const refund = await AdminRefundService.processRefund(id, false, providerReference || reason);
    res.status(200).json({
      status: "success",
      message: "Refund rejected successfully",
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (
  req: any, // or AdminAuthRequest if you have one
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { approve, providerReference } = req.body;

    const refund = await AdminRefundService.processRefund(id, approve, providerReference);

    res.status(200).json({
      status: "success",
      message: "Refund processed successfully",
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};

export const initiateRefund = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, paymentId, amount, reason } = req.body;

    const refund = await AdminRefundService.initiateAdminRefund(orderId, paymentId, amount, reason);

    res.status(201).json({
      status: "success",
      message: "Refund initiated successfully",
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};


export const deleteRefund = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await AdminRefundService.deleteRefund(id);
    res.status(200).json({
      status: "success",
      message: "Refund archived successfully"
    });
  } catch (error) {
    next(error);
  }
};
