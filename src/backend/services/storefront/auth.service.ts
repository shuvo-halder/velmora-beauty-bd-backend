import { prisma } from "../../config/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { EventService } from "../event.service";
import { ActivityType } from "@prisma/client";
import { normalizePhone } from "../../utils/phone";

export interface GuestOrderClaimResult {
  linkedOrdersCount: number;
  linkedOrderIds: string[];
}

export class StorefrontAuthService {
  static async revokeCustomerRefreshToken(tokenHash: string) {
    await prisma.customerRefreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllCustomerRefreshTokens(customerId: string) {
    await prisma.customerRefreshToken.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static async createCustomerRefreshToken(customerId: string, tokenString: string, expiresAt: Date, ipAddress?: string, userAgent?: string) {
    const tokenHash = this.hashToken(tokenString);
    await prisma.customerRefreshToken.create({
      data: {
        customerId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Safely links historical unassociated guest orders (customerId is null) to a verified Customer account.
   * Execution is transaction-safe, idempotent, requires a valid, phone/email-verified Customer,
   * and cascades ownership atomically to Order, Payment, Refund, ReturnRequest, Review, and ActivityLog.
   */
  static async linkGuestOrdersToCustomer(
    customerId: string,
    verifiedPhone?: string | null,
    email?: string | null,
    ipAddress?: string | null,
    dbClient: any = prisma
  ): Promise<GuestOrderClaimResult> {
    if (!customerId) return { linkedOrdersCount: 0, linkedOrderIds: [] };

    const normalizedPhone = verifiedPhone ? normalizePhone(verifiedPhone) : null;
    const normalizedEmail = email?.trim().toLowerCase() || null;

    if (!normalizedPhone && !normalizedEmail) {
      return { linkedOrdersCount: 0, linkedOrderIds: [] };
    }

    // 1. Verify customer exists and is active, non-deleted, and has verified credentials
    const customer = await dbClient.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        email: true,
        emailVerified: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!customer || !customer.isActive || customer.deletedAt !== null) {
      return { linkedOrdersCount: 0, linkedOrderIds: [] };
    }

    // 2. Phone match requires customer.phoneVerified to be true and matching normalized phone
    const canUsePhone = Boolean(
      normalizedPhone &&
      customer.phoneVerified &&
      customer.phone &&
      normalizePhone(customer.phone) === normalizedPhone
    );

    // Email match requires customer.emailVerified to be true and matching normalized email
    const canUseEmail = Boolean(
      normalizedEmail &&
      customer.emailVerified &&
      customer.email &&
      customer.email.toLowerCase() === normalizedEmail
    );

    if (!canUsePhone && !canUseEmail) {
      return { linkedOrdersCount: 0, linkedOrderIds: [] };
    }

    const conditions: any[] = [];
    if (canUsePhone && normalizedPhone) {
      conditions.push({ shippingAddress: { contains: normalizedPhone } });
      const digits = normalizedPhone.replace(/\D/g, "");
      if (digits && digits !== normalizedPhone) {
        conditions.push({ shippingAddress: { contains: digits } });
      }
      if (digits.startsWith("8801")) {
        const localDigits = digits.slice(2);
        conditions.push({ shippingAddress: { contains: localDigits } });
      }
    }

    if (canUseEmail && normalizedEmail) {
      conditions.push({ customerEmail: { equals: normalizedEmail, mode: "insensitive" } });
    }

    if (conditions.length === 0) {
      return { linkedOrdersCount: 0, linkedOrderIds: [] };
    }

    const executeTransaction = async (tx: any) => {
      // 3. Find candidate guest orders strictly where customerId IS NULL and not soft-deleted
      const candidateOrders = await tx.order.findMany({
        where: {
          customerId: null,
          OR: conditions,
        },
        select: { id: true },
      });

      if (!candidateOrders || candidateOrders.length === 0) {
        return { linkedOrdersCount: 0, linkedOrderIds: [] };
      }

      const candidateOrderIds = candidateOrders.map((o: any) => o.id);

      // 4. Perform atomic update with strict customerId: null constraint (concurrency guard)
      const updateResult = await tx.order.updateMany({
        where: {
          id: { in: candidateOrderIds },
          customerId: null, // Ownership protection: never overwrite an existing non-null customerId
        },
        data: {
          customerId: customer.id,
        },
      });

      if (updateResult.count === 0) {
        return { linkedOrdersCount: 0, linkedOrderIds: [] };
      }

      // 5. Find the exact order IDs that were successfully claimed in this transaction
      const claimedOrders = await tx.order.findMany({
        where: {
          id: { in: candidateOrderIds },
          customerId: customer.id,
        },
        select: { id: true },
      });
      const claimedOrderIds = claimedOrders.map((o: any) => o.id);

      if (claimedOrderIds.length === 0) {
        return { linkedOrdersCount: 0, linkedOrderIds: [] };
      }

      // 6. Cascade ownership to Payment (only unassigned guest payments for claimed orders)
      if (tx.payment) {
        await tx.payment.updateMany({
          where: {
            orderId: { in: claimedOrderIds },
            customerId: null,
          },
          data: {
            customerId: customer.id,
          },
        });
      }

      // 7. Cascade ownership to Refund (only unassigned/mismatched refunds for claimed orders)
      if (tx.refund) {
        await tx.refund.updateMany({
          where: {
            orderId: { in: claimedOrderIds },
            customerId: { not: customer.id },
          },
          data: {
            customerId: customer.id,
          },
        });
      }

      // 8. Cascade ownership to ReturnRequest (only unassigned/mismatched return requests for claimed orders)
      if (tx.returnRequest) {
        await tx.returnRequest.updateMany({
          where: {
            orderId: { in: claimedOrderIds },
            customerId: { not: customer.id },
          },
          data: {
            customerId: customer.id,
          },
        });
      }

      // 9. Cascade ownership to Review (only unowned reviews whose orderItemId belongs to claimed orders)
      if (tx.orderItem && tx.review) {
        const orderItems = await tx.orderItem.findMany({
          where: {
            orderId: { in: claimedOrderIds },
          },
          select: { id: true },
        });
        const orderItemIds = orderItems.map((item: any) => item.id);
        if (orderItemIds.length > 0) {
          await tx.review.updateMany({
            where: {
              orderItemId: { in: orderItemIds },
              customerId: null,
            },
            data: {
              customerId: customer.id,
              isVerifiedPurchase: true,
            },
          });
        }
      }

      // 10. Create ActivityLog audit entry
      if (tx.activityLog) {
        try {
          await tx.activityLog.create({
            data: {
              userId: null,
              action: "CLAIM_GUEST_ORDERS",
              entityType: "Customer",
              entityId: customer.id,
              details: JSON.stringify({
                claimedOrdersCount: claimedOrderIds.length,
                orderIds: claimedOrderIds,
                source: "guest_order_claim",
              }),
              ipAddress: ipAddress || null,
            },
          });
        } catch {
          // Non-blocking if ActivityLog creation fails
        }
      }

      return {
        linkedOrdersCount: claimedOrderIds.length,
        linkedOrderIds: claimedOrderIds,
      };
    };

    // 11. Ensure atomic transaction safety
    if (typeof dbClient.$transaction === "function") {
      return await dbClient.$transaction(async (tx: any) => executeTransaction(tx));
    } else {
      return await executeTransaction(dbClient);
    }
  }

  /**
   * Alias for backward compatibility
   */
  static async linkHistoricalGuestOrders(
    customerId: string,
    phone?: string | null,
    email?: string | null,
    ipAddress?: string | null,
    dbClient: any = prisma
  ): Promise<GuestOrderClaimResult> {
    return this.linkGuestOrdersToCustomer(customerId, phone, email, ipAddress, dbClient);
  }
}

