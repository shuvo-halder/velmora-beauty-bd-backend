import { prisma } from "../../config/db";
import { emailService } from "../../services/email.service";
import { AppError } from "../../utils/AppError";
import { Prisma, RefundStatus, PaymentStatus } from "@prisma/client";
import { mapRefundToStorefrontDTO } from "../../dtos/storefront/mappers";

export class StorefrontRefundService {
  /**
   * Customer requests a refund
   */
  static async requestRefund(
    customerId: string,
    orderId: string,
    reason: string,
    amount?: Prisma.Decimal | number | string
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new AppError("Reason is required for refund request", 400, "INVALID_REASON");
    }

    const refundTransaction = await prisma.$transaction(async (tx) => {
      // 1. Find Order & verify customer ownership
      const order = await tx.order.findUnique({
        where: { id: orderId, customerId },
        include: {
          payments: {
            where: { status: PaymentStatus.PAID },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!order) {
        throw new AppError("Order not found or unauthorized", 404, "ORDER_NOT_FOUND");
      }

      if (!order.payments || order.payments.length === 0) {
        throw new AppError("No successful payment found for this order to refund", 400, "NO_PAYMENT");
      }

      const payment = order.payments[0];

      // 2. Lock the authoritative Payment row (FOR UPDATE)
      await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
      await tx.payment.update({
        where: { id: payment.id },
        data: { updatedAt: new Date() },
      });

      // 3. Re-read fresh Payment state under lock
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      if (!currentPayment || currentPayment.status !== PaymentStatus.PAID) {
        throw new AppError("Payment is not eligible for refund", 400, "INVALID_PAYMENT_STATUS");
      }

      // 4. Calculate total reserved refunds under lock
      const reservedRefunds = await tx.refund.aggregate({
        where: {
          paymentId: currentPayment.id,
          status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
        },
        _sum: { amount: true },
      });
      const totalReserved = reservedRefunds._sum.amount || new Prisma.Decimal(0);
      const currentlyRefundable = currentPayment.amount.sub(currentPayment.refundedAmount).sub(totalReserved);

      if (totalReserved.gt(0)) {
        throw new AppError("A refund request is already pending for this payment", 400, "REFUND_ALREADY_PENDING");
      }

      if (currentlyRefundable.lte(0)) {
        throw new AppError("This order has no remaining refundable balance", 400, "NO_REFUNDABLE_BALANCE");
      }

      const requestedAmount = amount ? new Prisma.Decimal(amount) : currentlyRefundable;

      if (requestedAmount.lte(0)) {
        throw new AppError("Refund amount must be greater than zero", 400, "INVALID_AMOUNT");
      }

      if (requestedAmount.gt(currentlyRefundable)) {
        throw new AppError(
          `Cannot request refund greater than refundable amount (${currentlyRefundable.toString()})`,
          400,
          "EXCEEDS_REFUNDABLE_AMOUNT"
        );
      }

      // 5. Create authoritative pending refund
      const refund = await tx.refund.create({
        data: {
          paymentId: currentPayment.id,
          orderId: order.id,
          customerId,
          amount: requestedAmount,
          currency: currentPayment.currency,
          status: RefundStatus.PENDING,
          reason,
        },
      });

      await tx.refundTransaction.create({
        data: {
          refundId: refund.id,
          status: RefundStatus.PENDING,
          requestPayload: { reason, requestedBy: "CUSTOMER", amount: requestedAmount.toString() },
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: order.status,
          action: "REFUND_REQUESTED",
        },
      });

      return refund;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: refundTransaction.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendRefundRequestedEmail(emailRecipient, refundTransaction, fullOrder).catch(() => {});
        emailService.sendAdminRefundEmail(refundTransaction, fullOrder, "Requested").catch(() => {});
      }
    } catch (e) {}

    return mapRefundToStorefrontDTO(refundTransaction);
  }

  static async getCustomerRefunds(
    customerId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      customerId,
    };

    if (options.status && options.status !== "ALL") {
      where.status = options.status as RefundStatus;
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.refund.count({ where }),
    ]);

    const mappedRefunds = refunds.map((r) => {
      const processedAt =
        r.completedAt ||
        (["COMPLETED", "REJECTED", "FAILED"].includes(r.status) ? r.updatedAt : null);

      return {
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order?.orderNumber || null,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        processedAt,
      };
    });

    return {
      refunds: mappedRefunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getOrderRefunds(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const refunds = await prisma.refund.findMany({
      where: { orderId, customerId },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedRefunds = refunds.map((r) => {
      const processedAt =
        r.completedAt ||
        (["COMPLETED", "REJECTED", "FAILED"].includes(r.status) ? r.updatedAt : null);

      return {
        id: r.id,
        orderId: r.orderId,
        orderNumber: order.orderNumber,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        processedAt,
      };
    });

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
      refunds: mappedRefunds,
    };
  }
}

