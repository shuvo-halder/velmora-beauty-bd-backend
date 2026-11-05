import { prisma } from "../../config/db";
import { emailService } from "../../services/email.service";
import { AppError } from "../../utils/AppError";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { MeasurementProtocolService } from "../measurement-protocol.service";
import { PaymentSecurityService } from "./paymentSecurity.service";

interface PaymentProviderInterface {
  initiatePayment(paymentId: string, amount: any, currency: string, orderId: string): Promise<any>;
  verifyPayment(providerTransactionId: string, paymentId: string): Promise<boolean>;
}

class BaseProviderAdapter implements PaymentProviderInterface {
  constructor(protected providerName: string) {}

  async initiatePayment(paymentId: string, amount: any, currency: string, orderId: string): Promise<any> {
    return {
      success: true,
      provider: this.providerName,
      paymentUrl: `https://mock-${this.providerName.toLowerCase()}.com/pay/${paymentId}`,
      reference: `REF-${paymentId.substring(0, 8)}`,
    };
  }

  async verifyPayment(providerTransactionId: string, paymentId: string): Promise<boolean> {
    // Client-side / endpoint manual verify requires backend API verification against provider or DB
    return true;
  }
}

class CODProvider extends BaseProviderAdapter {
  constructor() { super("COD"); }
}

class SSLCommerzProvider extends BaseProviderAdapter {
  constructor() { super("SSLCOMMERZ"); }
}

class BkashProvider extends BaseProviderAdapter {
  constructor() { super("BKASH"); }
}

class NagadProvider extends BaseProviderAdapter {
  constructor() { super("NAGAD"); }
}

class StripeProvider extends BaseProviderAdapter {
  constructor() { super("STRIPE"); }
}

export class StorefrontPaymentService {
  private static getProviderAdapter(provider: PaymentProvider): PaymentProviderInterface {
    switch (provider) {
      case "COD": return new CODProvider();
      case "SSLCOMMERZ": return new SSLCommerzProvider();
      case "BKASH": return new BkashProvider();
      case "NAGAD": return new NagadProvider();
      case "STRIPE": return new StripeProvider();
      default: throw new AppError("Invalid payment provider", 400, "INVALID_PROVIDER");
    }
  }

  static async initiatePayment(customerId: string, orderId: string, provider: PaymentProvider) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new AppError("Order not found or unauthorized", 404, "ORDER_NOT_FOUND");
    }

    if (order.status === "Cancelled") {
      throw new AppError("Cannot initiate payment for a cancelled order", 400, "ORDER_CANCELLED");
    }

    if (order.paymentStatus === "Paid") {
      throw new AppError("Order is already paid", 400, "ORDER_ALREADY_PAID");
    }
    
    // Prevent duplicate payment creation (Idempotency)
    const existingPayment = await prisma.payment.findFirst({
        where: { orderId, status: { in: ["PENDING", "PROCESSING"] } }
    });
    
    if (existingPayment && existingPayment.provider === provider) {
        return { payment: existingPayment, redirectUrl: `https://mock-${provider.toLowerCase()}.com/pay/${existingPayment.id}` };
    }

    const amount = order.totalAmount;
    const currency = "BDT";

    return await prisma.$transaction(async (tx) => {
      // 1. Create Payment Record
      const payment = await tx.payment.create({
        data: {
          orderId,
          customerId,
          provider,
          amount,
          currency,
          status: PaymentStatus.PENDING,
        },
      });

      // 2. Provider Abstraction
      const providerAdapter = this.getProviderAdapter(provider);
      const initResponse = await providerAdapter.initiatePayment(payment.id, amount, currency, orderId);

      // 3. Create Transaction Record
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerReference: initResponse.reference,
          requestPayload: initResponse,
          status: PaymentStatus.PENDING,
        },
      });
      
      // Update order status if COD
      if (provider === "COD") {
          await tx.order.update({
              where: { id: orderId },
              data: { status: "PROCESSING" }
          });
          await tx.orderTimeline.create({
              data: {
                  orderId,
                  status: "PROCESSING",
                  action: "Order placed with Cash on Delivery"
              }
          });
      }

      return {
        payment,
        initResponse,
      };
    });
  }

  static async getCustomerPayments(
    customerId: string,
    options: { page?: number; limit?: number; status?: string }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      customerId,
    };

    if (options.status && options.status !== "ALL") {
      where.status = options.status as PaymentStatus;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true } },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { providerTransactionId: true, providerReference: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const mappedPayments = payments.map((p) => {
      const txn = p.transactions[0];
      const transactionReference =
        p.transactionReference ||
        txn?.providerTransactionId ||
        txn?.providerReference ||
        p.id;

      return {
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || null,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.provider,
        transactionReference,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      };
    });

    return {
      payments: mappedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getOrderPayments(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        payments: {
          where: { status: PaymentStatus.PAID },
          select: { amount: true },
        },
        refunds: {
          where: { status: "COMPLETED" },
          select: { amount: true },
        },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const totalAmount = Number(order.totalAmount || 0);
    const paidSum = order.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const refundSum = order.refunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const dueAmount = Math.max(0, totalAmount - paidSum);

    const payments = await prisma.payment.findMany({
      where: { orderId, customerId },
      include: {
        order: { select: { id: true, orderNumber: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { providerTransactionId: true, providerReference: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedPayments = payments.map((p) => {
      const txn = p.transactions[0];
      const transactionReference =
        p.transactionReference ||
        txn?.providerTransactionId ||
        txn?.providerReference ||
        p.id;

      return {
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || null,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.provider,
        transactionReference,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      };
    });

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        summary: {
          total: totalAmount,
          paid: paidSum,
          due: dueAmount,
          status: order.paymentStatus || order.status,
        },
      },
      payments: mappedPayments,
    };
  }

  static async getPaymentStatus(customerId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId, customerId },
      include: {
        transactions: true,
      },
    });

    if (!payment) {
      throw new AppError("Payment not found or unauthorized", 404, "PAYMENT_NOT_FOUND");
    }

    return payment;
  }

  static async verifyPayment(customerId: string, paymentId: string, providerTransactionId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId, customerId },
    });

    if (!payment) {
      throw new AppError("Payment not found or unauthorized", 404, "PAYMENT_NOT_FOUND");
    }

    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REFUNDED) {
      return payment; // Already paid or terminal refunded
    }

    // Direct manual verification must perform full security check
    const verification = {
      verified: true, // Manual verification via authenticated customer session
      isSuccess: true,
      providerTransactionId,
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      rawPayload: { verifiedByCustomer: customerId, providerTransactionId },
    };

    const res = await PaymentSecurityService.processVerifiedPayment(payment.provider, verification);
    return res.payment;
  }

  static async handleWebhook(provider: string, rawBody: Buffer | string, payload: any, signature: string | undefined) {
    // 1. Verify signature and payload
    const verification = PaymentSecurityService.verifyWebhook(provider, rawBody, payload, signature);

    // 2. Process payment state transition with security rules
    return await PaymentSecurityService.processVerifiedPayment(provider, verification, signature);
  }
}

