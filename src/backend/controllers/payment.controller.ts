import { Request, Response, NextFunction } from "express";
import { AdminPaymentService } from "../services/payment.service";

export class PaymentController {
  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await AdminPaymentService.getPayments({ page, limit, search, status });
      return res.json({
        status: "success",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await AdminPaymentService.getPaymentById(id);
      return res.json({
        status: "success",
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await AdminPaymentService.updatePaymentStatus(id, status);
      return res.json({
        status: "success",
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
  static async deletePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AdminPaymentService.deletePayment(id);
      return res.json({
        status: "success",
        message: "Payment archived successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}
