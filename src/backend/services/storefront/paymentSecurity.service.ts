import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Prisma, PaymentStatus, PaymentProvider, RefundStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { emailService } from "../../services/email.service";
import { AppError } from "../../utils/AppError";
import { MeasurementProtocolService } from "../measurement-protocol.service";

/**
 * Payment Security Provider Verification Interfaces and Utilities
 */

export interface VerificationResult {
  verified: boolean;
  isSuccess: boolean;
  providerTransactionId?: string;
  paymentId?: string;
  orderId?: string;
  amount?: Prisma.Decimal;
  currency?: string;
  errorMessage?: string;
  rawPayload?: any;
  eventId?: string;
}

// Security Configuration Helper for Payment Secrets
function getPaymentEnv() {
  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "dummy_stripe_secret_key",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "dummy_stripe_webhook_secret",
    bkashAppKey: process.env.BKASH_APP_KEY || "dummy_bkash_app_key",
    bkashAppSecret: process.env.BKASH_APP_SECRET || "dummy_bkash_app_secret",
    bkashWebhookSecret: process.env.BKASH_WEBHOOK_SECRET || "dummy_bkash_webhook_secret",
    nagadMerchantId: process.env.NAGAD_MERCHANT_ID || "dummy_nagad_merchant_id",
    nagadWebhookSecret: process.env.NAGAD_WEBHOOK_SECRET || "dummy_nagad_webhook_secret",
    sslStoreId: process.env.SSLCOMMERZ_STORE_ID || "dummy_ssl_store_id",
    sslStorePass: process.env.SSLCOMMERZ_STORE_PASSWORD || "dummy_ssl_store_pass",
  };
}

/**
 * Provider-Specific Security Adapters
 */

export class StripeSecurityAdapter {
  /**
   * Signature Algorithm: HMAC-SHA256 (Stripe signature scheme v1)
   * Header: t={timestamp},v1={signature}
   */
  static verifyWebhookSignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    const env = getPaymentEnv();
    const parts = signatureHeader.split(",");
    let timestamp = "";
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, val] = part.split("=");
      if (key?.trim() === "t") timestamp = val?.trim() || "";
      if (key?.trim() === "v1") signatures.push(val?.trim() || "");
    }

    if (!timestamp || signatures.length === 0) return false;

    const payloadToSign = `${timestamp}.${rawBody.toString("utf8")}`;
    const expectedSignature = crypto
      .createHmac("sha256", env.stripeWebhookSecret)
      .update(payloadToSign, "utf8")
      .digest("hex");

    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSignature, "hex"));
      } catch {
        return false;
      }
    });
  }

  /**
   * Verification API / Payload parser for Stripe Webhook
   */
  static parseWebhookPayload(payload: any): VerificationResult {
    const eventType = payload.type;
    const dataObject = payload.data?.object || {};

    const providerTransactionId = dataObject.id || dataObject.payment_intent;
    const paymentId = dataObject.metadata?.paymentId || dataObject.client_reference_id;
    const orderId = dataObject.metadata?.orderId;
    const amountInCents = dataObject.amount_received || dataObject.amount;
    const amount = amountInCents !== undefined ? new Prisma.Decimal(amountInCents).div(100) : undefined;
    const currency = (dataObject.currency || "BDT").toUpperCase();

    const isSuccess = eventType === "payment_intent.succeeded" || eventType === "checkout.session.completed";
    const eventId = payload.id || payload.eventId || (eventType && providerTransactionId ? `${eventType}_${providerTransactionId}` : (providerTransactionId || payload.id));

    return {
      verified: true,
      isSuccess,
      providerTransactionId,
      paymentId,
      orderId,
      amount,
      currency,
      rawPayload: payload,
      eventId,
    };
  }
}

export class BkashSecurityAdapter {
  /**
   * Signature Algorithm: HMAC-SHA256 of canonical payload string using BKASH_WEBHOOK_SECRET
   */
  static verifyWebhookSignature(payload: any, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    const env = getPaymentEnv();
    const rawString = typeof payload === "string" ? payload : JSON.stringify(payload);
    
    const expectedSig = crypto
      .createHmac("sha256", env.bkashWebhookSecret)
      .update(rawString)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader, "hex"), Buffer.from(expectedSig, "hex"));
    } catch {
      return false;
    }
  }

  static parseWebhookPayload(payload: any): VerificationResult {
    const transactionStatus = payload.transactionStatus || payload.status;
    const providerTransactionId = payload.trxID || payload.transactionId;
    const paymentId = payload.paymentID || payload.paymentId;
    const orderId = payload.merchantInvoiceNumber || payload.orderId;
    const amount = payload.amount !== undefined ? new Prisma.Decimal(payload.amount) : undefined;
    const currency = (payload.currency || "BDT").toUpperCase();

    const isSuccess = transactionStatus === "Completed" || transactionStatus === "SUCCESS";
    const eventId = payload.eventId || payload.header?.eventId || (transactionStatus && providerTransactionId ? `${transactionStatus}_${providerTransactionId}` : (providerTransactionId || payload.paymentID));

    return {
      verified: true,
      isSuccess,
      providerTransactionId,
      paymentId,
      orderId,
      amount,
      currency,
      rawPayload: payload,
      eventId,
    };
  }
}

export class NagadSecurityAdapter {
  /**
   * Signature Algorithm: SHA256withRSA or HMAC-SHA256 hash using NAGAD_WEBHOOK_SECRET
   */
  static verifyWebhookSignature(payload: any, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    const env = getPaymentEnv();
    const rawString = typeof payload === "string" ? payload : JSON.stringify(payload);

    const expectedSig = crypto
      .createHmac("sha256", env.nagadWebhookSecret)
      .update(rawString)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader, "hex"), Buffer.from(expectedSig, "hex"));
    } catch {
      return false;
    }
  }

  static parseWebhookPayload(payload: any): VerificationResult {
    const status = payload.status || payload.payment_status;
    const providerTransactionId = payload.payment_ref_id || payload.issuerPaymentRefNo || payload.trxID;
    const paymentId = payload.payment_id || payload.paymentId;
    const orderId = payload.order_id || payload.orderId;
    const amount = payload.amount !== undefined ? new Prisma.Decimal(payload.amount) : undefined;
    const currency = (payload.currency || "BDT").toUpperCase();

    const isSuccess = status === "Success" || status === "SUCCESS" || status === "PAID";
    const eventId = payload.eventId || (status && providerTransactionId ? `${status}_${providerTransactionId}` : (providerTransactionId || payload.payment_id));

    return {
      verified: true,
      isSuccess,
      providerTransactionId,
      paymentId,
      orderId,
      amount,
      currency,
      rawPayload: payload,
      eventId,
    };
  }
}

export class SSLCommerzSecurityAdapter {
  /**
   * Signature Algorithm: MD5 hash of sorting key-value parameters + Store Password
   * Or verification via x-signature / verify_sign parameter
   */
  static verifyWebhookSignature(payload: any, signatureHeader?: string): boolean {
    const env = getPaymentEnv();
    const verifySign = signatureHeader || payload.verify_sign || payload.verify_key;
    if (!verifySign) return false;

    // Standard SSLCommerz verify_sign validation string: MD5(store_password + sort_keys)
    // If simple x-signature provided, verify HMAC or MD5
    const rawString = typeof payload === "string" ? payload : JSON.stringify(payload);
    const expectedMd5 = crypto
      .createHash("md5")
      .update(`${env.sslStorePass}${rawString}`)
      .digest("hex");

    const expectedHmac = crypto
      .createHmac("sha256", env.sslStorePass)
      .update(rawString)
      .digest("hex");

    try {
      if (crypto.timingSafeEqual(Buffer.from(verifySign, "hex"), Buffer.from(expectedMd5, "hex"))) {
        return true;
      }
    } catch {}

    try {
      if (crypto.timingSafeEqual(Buffer.from(verifySign, "hex"), Buffer.from(expectedHmac, "hex"))) {
        return true;
      }
    } catch {}

    return false;
  }

  static parseWebhookPayload(payload: any): VerificationResult {
    const status = payload.status;
    const providerTransactionId = payload.bank_tran_id || payload.tran_id;
    const paymentId = payload.value_a || payload.payment_id || payload.paymentId;
    const orderId = payload.tran_id || payload.orderId;
    const amount = payload.amount !== undefined ? new Prisma.Decimal(payload.amount) : undefined;
    const currency = (payload.currency || "BDT").toUpperCase();

    const isSuccess = status === "VALID" || status === "VALIDATED" || status === "SUCCESS";
    const eventId = payload.eventId || (status && providerTransactionId ? `${status}_${providerTransactionId}` : (providerTransactionId || payload.val_id));

    return {
      verified: true,
      isSuccess,
      providerTransactionId,
      paymentId,
      orderId,
      amount,
      currency,
      rawPayload: payload,
      eventId,
    };
  }
}

/**
 * Master Payment Security Service
 */
export class PaymentSecurityService {
  /**
   * Strictly verify payment webhook signature and payload integrity
   */
  static verifyWebhook(
    provider: string,
    rawBody: Buffer | string,
    payload: any,
    signatureHeader?: string
  ): VerificationResult {
    const upperProvider = provider.toUpperCase();

    let verified = false;
    let parsedResult: VerificationResult;

    switch (upperProvider) {
      case "STRIPE":
        verified = StripeSecurityAdapter.verifyWebhookSignature(rawBody, signatureHeader);
        parsedResult = StripeSecurityAdapter.parseWebhookPayload(payload);
        break;
      case "BKASH":
        verified = BkashSecurityAdapter.verifyWebhookSignature(payload, signatureHeader);
        parsedResult = BkashSecurityAdapter.parseWebhookPayload(payload);
        break;
      case "NAGAD":
        verified = NagadSecurityAdapter.verifyWebhookSignature(payload, signatureHeader);
        parsedResult = NagadSecurityAdapter.parseWebhookPayload(payload);
        break;
      case "SSLCOMMERZ":
        verified = SSLCommerzSecurityAdapter.verifyWebhookSignature(payload, signatureHeader);
        parsedResult = SSLCommerzSecurityAdapter.parseWebhookPayload(payload);
        break;
      case "COD":
        // Cash on delivery webhooks/manual verifications
        verified = true;
        parsedResult = {
          verified: true,
          isSuccess: true,
          paymentId: payload.paymentId,
          orderId: payload.orderId,
          amount: payload.amount ? new Prisma.Decimal(payload.amount) : undefined,
          currency: payload.currency || "BDT",
          rawPayload: payload,
        };
        break;
      default:
        throw new AppError(`Unsupported payment provider: ${provider}`, 400, "UNSUPPORTED_PROVIDER");
    }

    if (!verified) {
      return {
        verified: false,
        isSuccess: false,
        errorMessage: "Invalid or missing cryptographic signature",
        rawPayload: payload,
      };
    }

    return parsedResult;
  }

  /**
   * Process payment state transition with strict transaction-authoritative validations:
   * 1. Signature cryptographic check
   * 2. Transaction / Order Identity matching
   * 3. Paid Amount vs Payment.amount check (exact or overpayment protection, underpayment rejection)
   * 4. Currency matching
   * 5. Idempotent processing & duplicate rejection
   */
  static async processVerifiedPayment(
    provider: string,
    verification: VerificationResult,
    signatureHeader?: string
  ) {
    // 1. Signature check
    if (!verification.verified) {
      throw new AppError(
        verification.errorMessage || "Cryptographic signature verification failed",
        400,
        "INVALID_SIGNATURE"
      );
    }

    const paymentId = verification.paymentId;
    if (!paymentId) {
      throw new AppError("Webhook payload is missing required paymentId", 400, "MISSING_PAYMENT_ID");
    }

    const eventId = verification.eventId || null;

    // 2. Perform transaction-authoritative processing with Row Lock on Payment
    return await prisma.$transaction(async (tx) => {
      // 2a. Fast application-level check for existing webhook event
      if (eventId) {
        const existingLog = await (tx.paymentWebhookLog as any).findFirst({
          where: {
            provider,
            eventId,
          },
        });

        if (existingLog) {
          const currentPayment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { order: true },
          });

          return {
            status: "ALREADY_PROCESSED",
            message: `Webhook event ${eventId} for provider ${provider} was already processed`,
            payment: currentPayment || null,
          };
        }
      }

      // 2b. Create webhook log with DB-level unique constraint protection against race conditions
      let webhookLog;
      try {
        webhookLog = await (tx.paymentWebhookLog as any).create({
          data: {
            provider,
            eventId,
            payload: verification.rawPayload || {},
            signature: signatureHeader || null,
          },
        });
      } catch (err: any) {
        if (
          err?.code === "P2002" ||
          (err?.message && (err.message.includes("Unique constraint") || err.message.includes("paymentWebhookLog")))
        ) {
          const currentPayment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { order: true },
          });

          return {
            status: "ALREADY_PROCESSED",
            message: `Webhook event ${eventId || "duplicate"} for provider ${provider} was already processed (DB unique constraint caught)`,
            payment: currentPayment || null,
          };
        }
        throw err;
      }

      // Lock Payment row first (FOR UPDATE) to guarantee serial execution across concurrent webhooks
      await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      await tx.payment.update({
        where: { id: paymentId },
        data: { updatedAt: new Date() },
      });

      // Find payment record under lock
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new AppError(`Payment record not found for ID ${paymentId}`, 404, "PAYMENT_NOT_FOUND");
      }

      // Verify order identity if orderId supplied in webhook
      if (verification.orderId && verification.orderId !== payment.orderId) {
        throw new AppError(
          `Webhook orderId (${verification.orderId}) does not match payment orderId (${payment.orderId})`,
          400,
          "ORDER_MISMATCH"
        );
      }

      // Check Idempotency & Terminal State: if already PAID or REFUNDED, return without mutating state
      if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.CANCELLED) {
        await tx.paymentWebhookLog.update({
          where: { id: webhookLog.id },
          data: { processed: true, processedAt: new Date() },
        });

        return {
          status: "ALREADY_PROCESSED",
          message:
            payment.status === PaymentStatus.REFUNDED ? "Payment is already in terminal REFUNDED status" : payment.status === PaymentStatus.FAILED ? "Payment is already in terminal FAILED status" : payment.status === PaymentStatus.CANCELLED ? "Payment is already in terminal CANCELLED status" : "Payment is already marked as PAID",
          payment,
        };
      }

      // Handle Fake Success / Failed webhook status from provider
      if (!verification.isSuccess) {
        const failedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentId: payment.id,
            providerTransactionId: verification.providerTransactionId || null,
            status: PaymentStatus.FAILED,
            responsePayload: verification.rawPayload || {},
          },
        });

        await tx.paymentWebhookLog.update({
          where: { id: webhookLog.id },
          data: { processed: true, processedAt: new Date() },
        });

        const fullOrder = await tx.order.findUnique({ where: { id: payment.orderId }, include: { customer: true } });
        if (fullOrder) {
          
          const customerInfo = fullOrder.customer ? { email: fullOrder.customer.email, firstName: fullOrder.customer.firstName, lastName: fullOrder.customer.lastName } : { email: fullOrder.customerEmail || "Guest", firstName: "Guest" };
          emailService.sendPaymentFailedEmail(customerInfo, failedPayment, fullOrder).catch(() => {});
          emailService.sendAdminPaymentFailedEmail(failedPayment, fullOrder).catch(() => {});
        }

        return {
          status: "FAILED",
          message: "Payment verification reported failure status",
          payment: failedPayment,
        };
      }

      // 3. Verify Currency matching
      if (verification.currency && verification.currency.toUpperCase() !== payment.currency.toUpperCase()) {
        throw new AppError(
          `Currency mismatch: Expected ${payment.currency}, got ${verification.currency}`,
          400,
          "CURRENCY_MISMATCH"
        );
      }

      // 4. Verify Paid Amount against Payment.amount
      if (verification.amount !== undefined) {
        const expectedAmount = new Prisma.Decimal(payment.amount);
        const paidAmount = new Prisma.Decimal(verification.amount);

        // Underpayment Protection: strictly reject if paidAmount < expectedAmount
        if (paidAmount.lt(expectedAmount)) {
          // Log failed underpayment attempt in transactions
          await tx.paymentTransaction.create({
            data: {
              paymentId: payment.id,
              providerTransactionId: verification.providerTransactionId || null,
              status: PaymentStatus.FAILED,
              responsePayload: {
                error: "Underpayment detected",
                expectedAmount: expectedAmount.toString(),
                paidAmount: paidAmount.toString(),
                raw: verification.rawPayload,
              },
            },
          });

          const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.FAILED },
          });
          
          const fullOrder = await tx.order.findUnique({ where: { id: payment.orderId }, include: { customer: true } });
          if (fullOrder) {
            
            const customerInfo = fullOrder.customer ? { email: fullOrder.customer.email, firstName: fullOrder.customer.firstName, lastName: fullOrder.customer.lastName } : { email: fullOrder.customerEmail || "Guest", firstName: "Guest" };
            emailService.sendPaymentFailedEmail(customerInfo, updatedPayment, fullOrder).catch(() => {});
            emailService.sendAdminPaymentFailedEmail(updatedPayment, fullOrder).catch(() => {});
          }

          throw new AppError(
            `Underpayment rejected: expected ${expectedAmount}, received ${paidAmount}`,
            400,
            "UNDERPAYMENT_DETECTED"
          );
        }

        // Overpayment Protection: Accept payment up to expectedAmount, record overpayment details without corrupting order
        if (paidAmount.gt(expectedAmount)) {
          console.warn(
            `[PaymentSecurity] Overpayment detected on payment ${payment.id}. Expected: ${expectedAmount}, Paid: ${paidAmount}`
          );
        }
      }

      // 5. Everything verified! Transition Payment state to PAID
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          transactionReference: verification.providerTransactionId || payment.transactionReference || "verified_tx",
          paidAt: new Date(),
        },
      });

      // Create transaction log record
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerTransactionId: verification.providerTransactionId || null,
          status: PaymentStatus.PAID,
          responsePayload: verification.rawPayload || {},
        },
      });

      // Fetch fresh order under lock and preserve terminal states
      const currentOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { updatedAt: new Date() }
      });

      const nextOrderStatus = (currentOrder.status === "Cancelled" || currentOrder.status === "Returned")
        ? currentOrder.status
        : "PROCESSING";

      // If order is cancelled, flag funds for auto-refund
      if (currentOrder.status === "Cancelled") {
        const existingRefunds = await tx.refund.findMany({
          where: { paymentId: payment.id },
        });

        // Check if an active cancellation auto-refund already exists
        const activeCancellationRefund = existingRefunds.find(
          (r) =>
            (r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING) &&
            (r.reason === "Payment received via webhook for already cancelled order" ||
              r.reason === "Order cancellation auto-refund request" ||
              r.reason === "LATE_PAYMENT_WEBHOOK_ON_CANCELLED_ORDER")
        );

        if (!activeCancellationRefund) {
          const totalReserved = existingRefunds
            .filter((r) => r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING)
            .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

          const remainingRefundable = payment.amount
            .sub(payment.refundedAmount)
            .sub(totalReserved);

          if (remainingRefundable.gt(0)) {
            const refund = await tx.refund.create({
              data: {
                paymentId: payment.id,
                orderId: currentOrder.id,
                customerId: currentOrder.customerId,
                amount: remainingRefundable,
                currency: payment.currency,
                status: RefundStatus.PENDING,
                reason: "Payment received via webhook for already cancelled order",
              },
            });

            await tx.refundTransaction.create({
              data: {
                refundId: refund.id,
                status: RefundStatus.PENDING,
                requestPayload: { reason: "LATE_PAYMENT_WEBHOOK_ON_CANCELLED_ORDER", amount: remainingRefundable.toString() },
              },
            });
          }
        }
      }

      // Update Order paymentStatus to Paid and status to PROCESSING (if not terminal)
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "Paid",
          status: nextOrderStatus,
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: payment.orderId,
          status: nextOrderStatus,
          action: currentOrder.status === "Cancelled"
            ? `Payment verified via ${provider} for CANCELLED order (Flagged for refund)`
            : `Payment successfully verified via ${provider}`,
        },
      });

      await tx.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, processedAt: new Date() },
      });

      // Side effects (Email & Analytics)
      try {
        const fullOrder = await tx.order.findUnique({
          where: { id: payment.orderId },
          include: { customer: true, items: true },
        });

        const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
        if (fullOrder && orderEmail) {
          const emailRecipient = {
            email: orderEmail,
            firstName: fullOrder.customer?.firstName || "Customer",
          };
          emailService.sendPaymentSuccessEmail(emailRecipient, updatedPayment, fullOrder).catch(() => {});
          emailService.sendOrderProcessingEmail(emailRecipient, fullOrder).catch(() => {});
        }
      } catch (err) {
        console.error("Error sending payment success email:", err);
      }

      MeasurementProtocolService.processOrderPaymentSuccess(payment.orderId).catch((err) => {
        console.error("[Analytics] Error tracking purchase on payment success:", err);
      });

      return {
        status: "SUCCESS",
        message: "Payment verified and marked as PAID",
        payment: updatedPayment,
      };
    });
  }
}
