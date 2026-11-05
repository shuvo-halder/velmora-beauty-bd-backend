import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export class StorefrontAccountService {
  static async getDashboard(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        wishlist: {
          include: {
            _count: {
              select: { items: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new AppError("Customer profile not found", 404, "CUSTOMER_NOT_FOUND");
    }

    const [
      orders,
      recentActivity,
      paymentsAgg,
      refundsAgg,
      unreadNotificationsCount,
      deliveredOrderItems,
      reviewedOrderItemIds,
      recentSession,
    ] = await Promise.all([
      // 1. Fetch all non-deleted orders for user
      prisma.order.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              price: true,
            },
          },
        },
      }),

      // 2. Fetch recent activity log
      prisma.customerActivity.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, description: true, ipAddress: true, createdAt: true },
      }),

      // 3. Financial aggregation for completed payments
      prisma.payment.aggregate({
        where: { customerId, status: "PAID" },
        _sum: { amount: true },
      }),

      // 4. Financial aggregation for completed refunds
      prisma.refund.aggregate({
        where: { customerId, status: "COMPLETED" },
        _sum: { amount: true },
      }),

      // 5. Unread notifications
      prisma.notification.count({
        where: { customerId, status: { not: "READ" } },
      }),

      // 6. Delivered order items for review entitlement
      prisma.orderItem.findMany({
        where: {
          order: {
            customerId,
            deletedAt: null,
            status: { in: ["Delivered", "DELIVERED", "Completed", "COMPLETED"] },
          },
        },
        select: { id: true },
      }),

      // 7. Reviewed order item IDs
      prisma.review.findMany({
        where: { customerId, orderItemId: { not: null } },
        select: { orderItemId: true },
      }),

      // 8. Recent session
      prisma.customerRefreshToken.findFirst({
        where: { customerId, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      }),
    ]);

    // Compute Order Summaries
    const totalOrders = orders.length;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let activeOrdersCount = 0;
    let totalOrderValue = 0;

    const activeOrdersList: typeof orders = [];

    const cancelledStatuses = new Set(["Cancelled", "CANCELLED"]);
    const completedStatuses = new Set(["Delivered", "DELIVERED", "Completed", "COMPLETED"]);

    for (const ord of orders) {
      const isCancelled = cancelledStatuses.has(ord.status);
      const isCompleted = completedStatuses.has(ord.status);

      if (isCancelled) {
        cancelledOrdersCount++;
      } else if (isCompleted) {
        completedOrdersCount++;
        totalOrderValue += Number(ord.totalAmount || 0);
      } else {
        activeOrdersCount++;
        totalOrderValue += Number(ord.totalAmount || 0);
        if (activeOrdersList.length < 10) {
          activeOrdersList.push(ord);
        }
      }
    }

    const totalPaid = Number(paymentsAgg._sum.amount || 0);
    const totalRefunded = Number(refundsAgg._sum.amount || 0);
    const totalDue = Math.max(0, totalOrderValue - totalPaid + totalRefunded);

    // Compute Pending Reviews Count
    const reviewedSet = new Set(reviewedOrderItemIds.map((r) => r.orderItemId));
    const pendingReviewCount = deliveredOrderItems.filter((item) => !reviewedSet.has(item.id)).length;

    // Structured DTO
    const customerSummary = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      avatarUrl: customer.avatarUrl,
      verificationStatus: {
        phoneVerified: customer.phoneVerified,
        phoneVerifiedAt: customer.phoneVerifiedAt,
        emailVerified: customer.emailVerified,
        emailVerifiedAt: null,
      },
    };

    const orderSummary = {
      totalOrders,
      activeOrders: activeOrdersCount,
      completedOrders: completedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
    };

    const financialSummary = {
      totalOrderValue,
      totalPaid,
      totalDue,
      totalRefunded,
    };

    const engagement = {
      unreadNotifications: unreadNotificationsCount,
      pendingReviewCount,
    };

    const recent = {
      recentOrders: orders.slice(0, 5),
      activeOrders: activeOrdersList,
    };

    return {
      customerSummary,
      orderSummary,
      financialSummary,
      engagement,
      recent,
      // Backward compatibility fields
      profile: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified,
        lastLoginAt: customer.lastLoginAt,
        createdAt: customer.createdAt,
      },
      defaultAddress: customer.addresses[0] || null,
      stats: {
        orders: totalOrders,
        wishlist: customer.wishlist?._count.items || 0,
        totalSpending: totalOrderValue,
      },
      recentOrders: orders.slice(0, 5),
      recentActivity,
      recentSession,
    };
  }

  static async setDefaultAddress(customerId: string, addressId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.customerAddress.update({
        where: { id: addressId, customerId },
        data: { isDefault: true },
      });
    });
  }

  static async getSessions(customerId: string) {
    return prisma.customerRefreshToken.findMany({
      where: { customerId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      }
    });
  }

  static async revokeSession(customerId: string, sessionId: string) {
    await prisma.customerRefreshToken.updateMany({
      where: { id: sessionId, customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllSessionsExcept(customerId: string, currentSessionTokenHash: string | null) {
    const whereClause: any = {
      customerId,
      revokedAt: null,
    };
    if (currentSessionTokenHash) {
      whereClause.tokenHash = { not: currentSessionTokenHash };
    }

    await prisma.customerRefreshToken.updateMany({
      where: whereClause,
      data: { revokedAt: new Date() },
    });
  }

  static async getProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      throw new AppError("Customer profile not found", 404, "CUSTOMER_NOT_FOUND");
    }

    return customer;
  }

  static async updateProfile(
    customerId: string,
    data: { firstName?: string; lastName?: string | null; avatarUrl?: string | null }
  ) {
    // Ensure only safe fields are updated
    const updatePayload: { firstName?: string; lastName?: string | null; avatarUrl?: string | null } = {};
    if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
    if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
    if (data.avatarUrl !== undefined) updatePayload.avatarUrl = data.avatarUrl;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updatePayload,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return customer;
  }
}
