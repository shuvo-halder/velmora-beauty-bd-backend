import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { PaymentStatus } from "@prisma/client";
import { MeasurementProtocolService } from "./measurement-protocol.service";

export class AdminPaymentService {
  static async getPayments(options: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (options.status) {
      where.status = options.status as PaymentStatus;
    }

    if (options.search) {
      where.OR = [
        { id: { contains: options.search } },
        { orderId: { contains: options.search } },
        { transactionReference: { contains: options.search } },
        { customer: { email: { contains: options.search } } }
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          order: true,
          transactions: true,
          refunds: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        transactions: true,
        refunds: true
      }
    });

    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    return payment;
  }

  static async updatePaymentStatus(id: string, newStatus: PaymentStatus) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock authoritative Payment row
      await tx.payment.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      // 2. Read fresh payment state under lock
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!payment) {
        throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
      }

      const currentStatus = payment.status;

      if (currentStatus === newStatus) {
        return payment;
      }

      // Terminal state check
      if (currentStatus === PaymentStatus.REFUNDED) {
        throw new AppError("Cannot change status of a REFUNDED payment", 400, "INVALID_PAYMENT_STATE");
      }
      if (currentStatus === PaymentStatus.CANCELLED) {
        throw new AppError("Cannot change status of a CANCELLED payment", 400, "INVALID_PAYMENT_STATE");
      }
      if (currentStatus === PaymentStatus.FAILED) {
        throw new AppError("Cannot change status of a FAILED payment", 400, "INVALID_PAYMENT_STATE");
      }

      // PAID state transition check
      if (currentStatus === PaymentStatus.PAID) {
        if (newStatus === PaymentStatus.REFUNDED) {
          if (!payment.refundedAmount.equals(payment.amount)) {
            throw new AppError("Payment cannot be marked REFUNDED unless refundedAmount equals total amount", 400, "INVALID_REFUND_AMOUNT");
          }
        } else {
          throw new AppError(`PAID payment cannot transition to ${newStatus}. Use refund process instead.`, 400, "INVALID_PAYMENT_STATE");
        }
      }

      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: newStatus,
          paidAt: newStatus === PaymentStatus.PAID ? new Date() : payment.paidAt,
        },
      });

      // Record transaction
      await tx.paymentTransaction.create({
        data: {
          paymentId: id,
          status: newStatus,
          responsePayload: {
            action: "ADMIN_UPDATE_PAYMENT_STATUS",
            newStatus,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Keep Order.paymentStatus and Order.status consistent
      if (payment.orderId) {
        const currentOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: { updatedAt: new Date() },
        });

        let orderPaymentStatus = currentOrder.paymentStatus;
        if (newStatus === PaymentStatus.PAID) {
          orderPaymentStatus = payment.refundedAmount.gt(0) ? "Partially Refunded" : "Paid";
        } else if (newStatus === PaymentStatus.REFUNDED) {
          orderPaymentStatus = "Refunded";
        } else if (newStatus === PaymentStatus.FAILED) {
          orderPaymentStatus = "Failed";
        } else if (newStatus === PaymentStatus.CANCELLED) {
          orderPaymentStatus = "Cancelled";
        } else if (newStatus === PaymentStatus.PENDING) {
          orderPaymentStatus = "Unpaid";
        }

        // Only advance to Processing if order is currently in Pending state
        const nextOrderStatus = (newStatus === PaymentStatus.PAID && currentOrder.status === "Pending")
          ? "Processing"
          : currentOrder.status;

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: orderPaymentStatus,
            status: nextOrderStatus,
          },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            status: nextOrderStatus,
            action: `Payment status updated to ${newStatus} by admin`,
          },
        });
      }

      return updatedPayment;
    });

    if (result.orderId && newStatus === PaymentStatus.PAID) {
      MeasurementProtocolService.processOrderPaymentSuccess(result.orderId).catch((err) => {
        console.error("[Analytics] Error tracking payment success on admin payment update:", err);
      });
    }

    return result;
  }

  static async deletePayment(id: string) {
    const payment = await prisma.payment.findFirst({
      where: { id, deletedAt: null }
    });
    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }
    return await prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
