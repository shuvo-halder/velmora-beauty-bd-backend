import { prisma } from "../config/db";
import { emailService } from "./email.service";
import { AppError } from "../utils/AppError";
import { Prisma, RefundStatus, PaymentStatus } from "@prisma/client";
import { MeasurementProtocolService } from "./measurement-protocol.service";

export class AdminRefundService {
  /**
   * List refunds with pagination, status filtering, and search
   */
  static async getRefunds({ page = 1, limit = 10, search, status }: { page?: number; limit?: number; search?: string; status?: string }) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status && Object.values(RefundStatus).includes(status as RefundStatus)) {
      where.status = status as RefundStatus;
    }
    if (search && search.trim() !== "") {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { orderId: { contains: search, mode: "insensitive" } },
        { paymentId: { contains: search, mode: "insensitive" } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      ];
    }
    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              paymentStatus: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              refundedAmount: true,
              status: true,
              provider: true,
              transactionReference: true,
            },
          },
        },
      }),
    ]);

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get detailed refund information by ID
   */
  static async getRefundById(id: string) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { select: { imageUrl: true, secureUrl: true }, take: 1 },
                  },
                },
                productVariant: { select: { id: true, sku: true } },
              },
            },
          },
        },
        payment: true,
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!refund) throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");
    return refund;
  }

  /**
   * Process (approve or reject) a pending refund request
   * Canonical locking order:
   * 1. Lock authoritative Payment row FIRST (FOR UPDATE)
   * 2. Lock authoritative Refund row SECOND (FOR UPDATE)
   * 3. Re-read fresh state under locks
   * 4. Validate refundable balance & eligibility
   * 5. Mutate state atomically (Refund, Payment, Order, Timeline)
   * 6. Commit and trigger side effects
   */
  static async processRefund(refundId: string, approve: boolean, providerReference?: string) {
    const targetRefund = await prisma.refund.findUnique({
      where: { id: refundId },
      select: { id: true, paymentId: true },
    });
    if (!targetRefund) throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");

    if (!approve) {
      const rejectedTransaction = await prisma.$transaction(async (tx) => {
        // 1. Lock authoritative Payment row FIRST
        await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${targetRefund.paymentId} FOR UPDATE`;
        await tx.payment.update({
          where: { id: targetRefund.paymentId },
          data: { updatedAt: new Date() },
        });

        // 2. Lock authoritative Refund row SECOND
        await tx.$executeRaw`SELECT id FROM "Refund" WHERE id = ${refundId} FOR UPDATE`;
        await tx.refund.update({
          where: { id: refundId },
          data: { updatedAt: new Date() },
        });

        // 3. Re-read fresh state under lock
        const refund = await tx.refund.findUnique({
          where: { id: refundId },
          include: { payment: true, order: true },
        });

        if (!refund) throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");
        if (refund.paymentId !== targetRefund.paymentId) {
          throw new AppError("Payment ID mismatch for refund", 400, "PAYMENT_MISMATCH");
        }
        if (refund.status !== RefundStatus.PENDING && refund.status !== RefundStatus.PROCESSING) {
          throw new AppError(`Refund cannot be processed from status ${refund.status}`, 400, "INVALID_STATUS");
        }

        const rejectedRefund = await tx.refund.update({
          where: { id: refund.id },
          data: { status: RefundStatus.REJECTED },
          include: { order: true, payment: true },
        });

        await tx.refundTransaction.create({
          data: {
            refundId: refund.id,
            status: RefundStatus.REJECTED,
            responsePayload: { approved: false, actedBy: "ADMIN", providerReference },
          },
        });

        await tx.orderTimeline.create({
          data: {
            orderId: refund.orderId,
            status: refund.order.status,
            action: "REFUND_REJECTED",
          },
        });

        return rejectedRefund;
      });

      try {
        const fullOrder = await prisma.order.findUnique({
          where: { id: rejectedTransaction.orderId },
          include: { customer: true },
        });
        const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
        if (fullOrder && orderEmail) {
          const emailRecipient = {
            email: orderEmail,
            firstName: fullOrder.customer?.firstName || "Customer",
          };
          emailService.sendRefundRejectedEmail(emailRecipient, rejectedTransaction, fullOrder).catch(() => {});
          emailService.sendAdminRefundEmail(rejectedTransaction, fullOrder, "Rejected").catch(() => {});
        }
      } catch (e) {}

      return rejectedTransaction;
    }

    // Process approval
    const completedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Lock authoritative Payment row FIRST
      await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${targetRefund.paymentId} FOR UPDATE`;
      const lockedPaymentRow = await tx.payment.update({
        where: { id: targetRefund.paymentId },
        data: { updatedAt: new Date() },
      });

      if (!lockedPaymentRow) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

      // 2. Lock authoritative Refund row SECOND
      await tx.$executeRaw`SELECT id FROM "Refund" WHERE id = ${refundId} FOR UPDATE`;
      const lockedRefundRow = await tx.refund.update({
        where: { id: refundId },
        data: { updatedAt: new Date() },
      });

      if (!lockedRefundRow) throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");

      // 3. Re-read fresh state under row locks
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { payment: true, order: true },
      });

      if (!refund) throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");
      if (refund.paymentId !== targetRefund.paymentId) {
        throw new AppError("Payment ID mismatch for refund", 400, "PAYMENT_MISMATCH");
      }
      if (refund.status !== RefundStatus.PENDING && refund.status !== RefundStatus.PROCESSING) {
        throw new AppError(`Refund cannot be processed from status ${refund.status}`, 400, "INVALID_STATUS");
      }

      const payment = await tx.payment.findUnique({
        where: { id: refund.paymentId },
      });

      if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

      if (payment.status !== PaymentStatus.PAID) {
        throw new AppError(`Payment status must be PAID to refund, got ${payment.status}`, 400, "INVALID_PAYMENT_STATUS");
      }

      // 4. Validate refundable balance
      const currentRefundable = payment.amount.sub(payment.refundedAmount);
      if (refund.amount.lte(0)) {
        throw new AppError("Refund amount must be greater than zero", 400, "INVALID_AMOUNT");
      }

      if (refund.amount.gt(currentRefundable)) {
        throw new AppError("Refund amount exceeds remaining refundable amount", 400, "EXCEEDS_REFUNDABLE_AMOUNT");
      }

      const newRefundedAmount = payment.refundedAmount.add(refund.amount);
      const isFullRefund = newRefundedAmount.equals(payment.amount);

      // 5. Mutate Refund record
      const completedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.COMPLETED,
          refundedAmount: refund.amount,
          transactionReference: providerReference,
          completedAt: new Date(),
        },
        include: { order: true, payment: true },
      });

      // 6. Mutate Payment record
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: newRefundedAmount,
          status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
        },
      });

      // 7. Create Refund Transaction Audit Log
      await tx.refundTransaction.create({
        data: {
          refundId: refund.id,
          providerReference,
          status: RefundStatus.COMPLETED,
          responsePayload: { approved: true, actedBy: "ADMIN", amount: refund.amount.toString() },
        },
      });

      // 8. Mutate Order paymentStatus
      const orderPaymentStatus = isFullRefund ? "Refunded" : "Partially Refunded";
      const actionText = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

      await tx.order.update({
        where: { id: refund.orderId },
        data: { paymentStatus: orderPaymentStatus },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: refund.orderId,
          status: refund.order.status,
          action: actionText,
        },
      });

      if (completedRefund.order && !completedRefund.refundTracked) {
        MeasurementProtocolService.trackRefund(completedRefund, completedRefund.order).catch((err) => {
          console.error("[Measurement Protocol] Refund tracking failed:", err);
        });
      }

      return completedRefund;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: completedTransaction.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendRefundCompletedEmail(emailRecipient, completedTransaction, fullOrder).catch(() => {});
        emailService.sendAdminRefundEmail(completedTransaction, fullOrder, "Completed").catch(() => {});
      }
    } catch (e) {}

    return completedTransaction;
  }

  /**
   * Admin directly initiates and executes an authoritative refund
   */
  static async initiateAdminRefund(
    orderId: string,
    paymentId: string,
    amount: string | number | Prisma.Decimal,
    reason: string
  ) {
    const requestedAmount = new Prisma.Decimal(amount);
    if (requestedAmount.lte(0)) {
      throw new AppError("Refund amount must be greater than zero", 400, "INVALID_AMOUNT");
    }

    const completedRefund = await prisma.$transaction(async (tx) => {
      // 1. Lock authoritative Payment row first (FOR UPDATE)
      await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const lockedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { updatedAt: new Date() },
      });

      if (!lockedPayment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

      // 2. Re-read fresh state under lock
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!currentPayment || currentPayment.orderId !== orderId) {
        throw new AppError("Payment record not found for this order", 404, "PAYMENT_NOT_FOUND");
      }

      if (currentPayment.status !== PaymentStatus.PAID) {
        throw new AppError(
          `Only paid payments can be refunded (current status: ${currentPayment.status})`,
          400,
          "INVALID_PAYMENT_STATUS"
        );
      }

      // 3. Compute remaining refundable amount under row lock
      const reservedRefunds = await tx.refund.aggregate({
        where: {
          paymentId: currentPayment.id,
          status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
        },
        _sum: { amount: true },
      });
      const totalReserved = reservedRefunds._sum.amount || new Prisma.Decimal(0);
      const currentlyRefundable = currentPayment.amount.sub(currentPayment.refundedAmount).sub(totalReserved);

      if (requestedAmount.gt(currentlyRefundable)) {
        throw new AppError(
          `Requested amount (${requestedAmount.toString()}) exceeds available refundable amount (${currentlyRefundable.toString()})`,
          400,
          "EXCEEDS_REFUNDABLE_AMOUNT"
        );
      }

      const newRefundedAmount = currentPayment.refundedAmount.add(requestedAmount);
      const isFullRefund = newRefundedAmount.equals(currentPayment.amount);

      // 4. Create authoritative Refund record
      const createdRefund = await tx.refund.create({
        data: {
          paymentId: currentPayment.id,
          orderId: currentPayment.orderId,
          customerId: currentPayment.customerId || currentPayment.order.customerId || "anonymous",
          amount: requestedAmount,
          currency: currentPayment.currency,
          refundedAmount: requestedAmount,
          status: RefundStatus.COMPLETED,
          reason,
          transactionReference: "admin-direct",
          completedAt: new Date(),
        },
        include: { order: true, payment: true },
      });

      // 5. Create audit transaction
      await tx.refundTransaction.create({
        data: {
          refundId: createdRefund.id,
          status: RefundStatus.COMPLETED,
          providerReference: "admin-direct",
          requestPayload: { reason, requestedBy: "ADMIN", amount: requestedAmount.toString() },
          responsePayload: { approved: true, actedBy: "ADMIN", direct: true },
        },
      });

      // 6. Mutate Payment
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          refundedAmount: newRefundedAmount,
          status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
        },
      });

      // 7. Mutate Order paymentStatus & timeline
      const orderPaymentStatus = isFullRefund ? "Refunded" : "Partially Refunded";
      const actionText = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

      await tx.order.update({
        where: { id: currentPayment.orderId },
        data: { paymentStatus: orderPaymentStatus },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: currentPayment.orderId,
          status: currentPayment.order.status,
          action: actionText,
        },
      });

      if (createdRefund.order && !createdRefund.refundTracked) {
        MeasurementProtocolService.trackRefund(createdRefund, createdRefund.order).catch((err) => {
          console.error("[Measurement Protocol] Refund tracking failed:", err);
        });
      }

      return createdRefund;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: completedRefund.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendRefundCompletedEmail(emailRecipient, completedRefund, fullOrder).catch(() => {});
        emailService.sendAdminRefundEmail(completedRefund, fullOrder, "Completed").catch(() => {});
      }
    } catch (e) {}

    return completedRefund;
    }

  static async deleteRefund(id: string) {
    const refund = await prisma.refund.findFirst({
      where: { id, deletedAt: null }
    });
    if (!refund) {
      throw new AppError("Refund not found", 404, "REFUND_NOT_FOUND");
    }
    return await prisma.refund.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

