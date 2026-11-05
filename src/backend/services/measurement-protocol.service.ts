import { prisma } from "../config/db";
import { logger } from "../config/logger";

export interface MeasurementProtocolItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  [key: string]: any;
}

export interface MeasurementProtocolEventParams {
  transaction_id: string;
  value: number;
  currency: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items?: MeasurementProtocolItem[];
  session_id?: string;
  engagement_time_msec?: number;
  [key: string]: any;
}

export interface MeasurementProtocolEvent {
  name: string;
  params: MeasurementProtocolEventParams;
}

export interface TrackOrderInput {
  id: string;
  orderNumber?: string;
  totalAmount?: any;
  total?: any;
  currency?: string;
  taxAmount?: any;
  shippingAmount?: any;
  couponCode?: string;
  customerId?: string;
  items?: any[];
  orderItems?: any[];
  [key: string]: any;
}

export interface TrackRefundInput {
  id?: string;
  amount?: any;
  currency?: string;
  refundTracked?: boolean;
  refundTrackedAt?: Date | null;
  [key: string]: any;
}

export class MeasurementProtocolService {
  /**
   * Send a server-side event to GA4 via Measurement Protocol with retry logic (3 retries max)
   */
  static async sendEvent(
    clientId: string,
    events: MeasurementProtocolEvent[],
    userId?: string
  ): Promise<{ success: boolean; status?: number; error?: string; reason?: string }> {
    try {
      const analyticsSetting = await prisma.analyticsSetting.findFirst();
      if (!analyticsSetting || !analyticsSetting.enableAnalytics) {
        logger.info("[Measurement Protocol] Analytics disabled or settings missing.");
        return { success: false, reason: "Analytics disabled" };
      }

      const measurementId = analyticsSetting.googleAnalyticsId || process.env.GA_MEASUREMENT_ID;
      const apiSecret = analyticsSetting.ga4ApiSecret || process.env.GA_API_SECRET;

      if (!measurementId || !apiSecret) {
        logger.info("[Measurement Protocol] Missing measurement_id or api_secret.");
        return { success: false, reason: "Missing credentials" };
      }

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

      const payload = {
        client_id: clientId || "server.generated.client_id",
        ...(userId ? { user_id: userId } : {}),
        events
      };

      const maxAttempts = 3;
      let lastError = "";
      let lastStatus: number | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            logger.info(
              `[Measurement Protocol] Successfully dispatched ${events.length} event(s) to GA4 (${measurementId}) on attempt ${attempt}`
            );
            return { success: true };
          }

          lastStatus = response.status;
          lastError = await response.text();

          logger.warn(
            `[Measurement Protocol] Attempt ${attempt}/${maxAttempts} failed with status ${response.status}: ${lastError}`
          );
        } catch (err: any) {
          lastError = err?.message || String(err);
          logger.warn(
            `[Measurement Protocol] Attempt ${attempt}/${maxAttempts} encountered network/fetch error: ${lastError}`
          );
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
      }

      logger.error(
        `[Measurement Protocol] All ${maxAttempts} attempts failed for clientId: ${clientId}, events: ${events.map((e) => e.name).join(", ")}, error: ${lastError}`
      );
      return { success: false, status: lastStatus, error: lastError };
    } catch (error: any) {
      logger.error("[Measurement Protocol] Unexpected error sending event:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper to send server-side purchase event with transaction-safe idempotency guard
   */
  static async trackPurchase(
    order: TrackOrderInput,
    clientId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; status?: number; error?: string; reason?: string }> {
    // Transaction-safe idempotency check & update
    if (order.id) {
      // Atomic check and claim using Prisma updateMany to prevent race conditions
      const claim = await prisma.order.updateMany({
        where: {
          id: order.id,
          purchaseTracked: false
        },
        data: {
          purchaseTracked: true,
          purchaseTrackedAt: new Date()
        }
      });

      // If count is 0, the order was either already tracked or doesn't exist in DB
      if (claim.count === 0) {
        const existingOrder = await prisma.order.findUnique({
          where: { id: order.id },
          select: { purchaseTracked: true, purchaseTrackedAt: true }
        });

        if (existingOrder?.purchaseTracked) {
          logger.info(`[Measurement Protocol] Order ${order.id} purchase already tracked at ${existingOrder.purchaseTrackedAt}. Skipping.`);
          return { success: true, reason: "Already tracked" };
        }
      }
    }

    const items: MeasurementProtocolItem[] = (order.items || order.orderItems || []).map((item: any) => ({
      item_id: String(item.product?.sku || item.productId || item.id || "ITEM"),
      item_name: String(item.product?.name || item.name || "Product"),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1)
    }));

    const event: MeasurementProtocolEvent = {
      name: "purchase",
      params: {
        transaction_id: String(order.orderNumber || order.id),
        value: Number(order.totalAmount || order.total || 0),
        currency: order.currency || "BDT",
        tax: Number(order.taxAmount || 0),
        shipping: Number(order.shippingAmount || 0),
        coupon: order.couponCode || undefined,
        items,
        ...(sessionId ? { session_id: sessionId } : {}),
        engagement_time_msec: 100
      }
    };

    const targetClientId = clientId || `customer_${order.customerId || "guest"}`;

    return this.sendEvent(targetClientId, [event], order.customerId);
  }

  /**
   * Helper to send server-side refund event with transaction-safe idempotency guard
   */
  static async trackRefund(
    refund: TrackRefundInput,
    order: TrackOrderInput,
    clientId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; status?: number; error?: string; reason?: string }> {
    // Transaction-safe idempotency check & update for refund
    if (refund.id) {
      const claim = await prisma.refund.updateMany({
        where: {
          id: refund.id,
          refundTracked: false
        },
        data: {
          refundTracked: true,
          refundTrackedAt: new Date()
        }
      });

      if (claim.count === 0) {
        const existingRefund = await prisma.refund.findUnique({
          where: { id: refund.id },
          select: { refundTracked: true, refundTrackedAt: true }
        });

        if (existingRefund?.refundTracked) {
          logger.info(`[Measurement Protocol] Refund ${refund.id} already tracked at ${existingRefund.refundTrackedAt}. Skipping.`);
          return { success: true, reason: "Already tracked" };
        }
      }
    }

    const event: MeasurementProtocolEvent = {
      name: "refund",
      params: {
        transaction_id: String(order.orderNumber || order.id),
        value: Number(refund.amount || 0),
        currency: refund.currency || order.currency || "BDT",
        ...(sessionId ? { session_id: sessionId } : {}),
        engagement_time_msec: 100
      }
    };

    const targetClientId = clientId || (order.customerId ? `customer_${order.customerId}` : "customer_guest");

    return this.sendEvent(targetClientId, [event], order.customerId);
  }

  /**
   * Helper to process purchase tracking when payment status transitions to PAID.
   * Enforces idempotency via purchaseTracked boolean on Order.
   */
  static async processOrderPaymentSuccess(
    orderId: string,
    clientId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; tracked?: boolean; reason?: string }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });

      if (!order) {
        logger.warn(`[Measurement Protocol] Order ${orderId} not found for payment success tracking.`);
        return { success: false, reason: "Order not found" };
      }

      const isPaid = order.paymentStatus?.toUpperCase() === "PAID";
      if (!isPaid) {
        logger.info(`[Measurement Protocol] Order ${orderId} paymentStatus is '${order.paymentStatus}' (not PAID). Skipping.`);
        return { success: false, reason: "Order not paid" };
      }

      if (!order.purchaseTracked) {
        const result = await this.trackPurchase(order, clientId, sessionId);
        return { success: result.success, tracked: true };
      }

      logger.info(`[Measurement Protocol] Order ${orderId} purchase already tracked at ${order.purchaseTrackedAt}. Skipping.`);
      return { success: true, tracked: false, reason: "Already tracked" };
    } catch (error: any) {
      logger.error(`[Measurement Protocol] Failed to process payment success tracking for order ${orderId}:`, error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Helper to process purchase tracking for COD orders when confirmed or processing.
   * Enforces idempotency via purchaseTracked boolean on Order.
   */
  static async processCodOrderConfirmation(
    orderId: string,
    clientId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; tracked?: boolean; reason?: string }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });

      if (!order) {
        logger.warn(`[Measurement Protocol] Order ${orderId} not found for COD confirmation tracking.`);
        return { success: false, reason: "Order not found" };
      }

      const method = (order.paymentMethod || "").toUpperCase();
      const isCod = method.includes("COD") || method.includes("CASH");
      if (!isCod) {
        return { success: false, reason: "Not a COD order" };
      }

      const validStatuses = ["CONFIRMED", "PROCESSING"];
      const currentStatus = (order.status || "").toUpperCase();
      if (!validStatuses.includes(currentStatus)) {
        logger.info(`[Measurement Protocol] COD Order ${orderId} status is '${order.status}' (not CONFIRMED/PROCESSING). Skipping.`);
        return { success: false, reason: "Order status not confirmed/processing" };
      }

      if (!order.purchaseTracked) {
        const result = await this.trackPurchase(order, clientId, sessionId);
        return { success: result.success, tracked: true };
      }

      logger.info(`[Measurement Protocol] Order ${orderId} purchase already tracked at ${order.purchaseTrackedAt}. Skipping.`);
      return { success: true, tracked: false, reason: "Already tracked" };
    } catch (error: any) {
      logger.error(`[Measurement Protocol] Failed to process COD confirmation tracking for order ${orderId}:`, error);
      return { success: false, reason: error.message };
    }
  }
}

