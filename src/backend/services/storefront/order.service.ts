import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { mapOrderToStorefrontDTO, mapShipmentToStorefrontDTO } from "../../dtos/storefront/mappers";
import { StorefrontAuthService } from "./auth.service";

export class StorefrontOrderService {
  static async claimGuestOrders(customerId: string, ipAddress?: string, dbClient: any = prisma) {
    const customer = await dbClient.customer.findUnique({
      where: { id: customerId },
      select: { phone: true, email: true },
    });

    if (!customer) {
      throw new AppError("Customer not found", 404, "NOT_FOUND");
    }

    return await StorefrontAuthService.linkGuestOrdersToCustomer(
      customerId,
      customer.phone,
      customer.email,
      ipAddress,
      dbClient
    );
  }

  static async getCustomerOrders(
    customerId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      customerId,
    };

    if (options.status && options.status !== "ALL") {
      where.status = options.status;
    }

    if (options.search && options.search.trim() !== "") {
      where.orderNumber = { contains: options.search.trim(), mode: "insensitive" };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    select: { url: true, isPrimary: true },
                  },
                },
              },
              productVariant: {
                select: {
                  id: true,
                  sku: true,
                },
              },
            },
          },
          payments: {
            where: { status: "PAID" },
            select: { amount: true },
          },
          refunds: {
            where: { status: "COMPLETED" },
            select: { amount: true },
          },
          shipments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const mappedOrders = orders.map((order: any) => {
      const baseDto = mapOrderToStorefrontDTO(order);
      const paidSum = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) || 0;
      const refundSum = order.refunds?.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0) || 0;
      const totalAmount = Number(order.totalAmount || 0);
      const paidAmount = paidSum;
      const dueAmount = Math.max(0, totalAmount - paidSum);
      const itemCount = order.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0;

      // Primary product image
      let primaryProductImage: string | null = null;
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const imgs = item.product?.images || [];
          const primaryImg = imgs.find((img: any) => img.isPrimary) || imgs[0];
          if (primaryImg?.url) {
            primaryProductImage = primaryImg.url;
            break;
          }
        }
      }

      const estimatedDeliveryDate = null;

      return {
        ...baseDto,
        total: totalAmount,
        paidAmount,
        dueAmount,
        itemCount,
        primaryProductImage,
        estimatedDeliveryDate,
      };
    });

    return {
      orders: mappedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCustomerOrderById(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  select: { url: true, isPrimary: true },
                },
              },
            },
            productVariant: {
              select: {
                id: true,
                sku: true,
              },
            },
          },
        },
        coupon: {
          select: {
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
        payments: {
          select: {
            id: true,
            provider: true,
            amount: true,
            status: true,
            paidAt: true,
            transactionReference: true,
          },
        },
        shipments: {
          include: {
            courier: { select: { name: true, trackingUrl: true } },
            trackingEvents: { orderBy: { timestamp: "desc" } },
          },
        },
        returnRequests: {
          include: {
            items: true,
          },
        },
        refunds: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            reason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    // Check review eligibility
    const deliveredStatuses = new Set(["Delivered", "DELIVERED", "Completed", "COMPLETED"]);
    const isDelivered = deliveredStatuses.has(order.status);

    const orderItemIds = order.items.map((i: any) => i.id);
    const existingReviews = orderItemIds.length > 0
      ? await prisma.review.findMany({
          where: {
            customerId,
            orderItemId: { in: orderItemIds },
          },
          select: { orderItemId: true },
        })
      : [];

    const reviewedSet = new Set(existingReviews.map((r: any) => r.orderItemId));

    const itemsWithReviewEligibility = order.items.map((item: any) => {
      const isEligibleForReview = isDelivered && !reviewedSet.has(item.id);
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
        productName: item.product?.name || item.productName || null,
        productSlug: item.product?.slug || null,
        productImage:
          item.product?.images?.find((img: any) => img.isPrimary)?.url ||
          item.product?.images?.[0]?.url ||
          null,
        variantSku: item.productVariant?.sku || null,
        isEligibleForReview,
      };
    });

    const paidSum = order.payments
      ?.filter((p: any) => p.status === "PAID")
      .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0) || 0;
    const refundSum = order.refunds
      ?.filter((r: any) => r.status === "COMPLETED")
      .reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0) || 0;

    const totalAmount = Number(order.totalAmount || 0);
    const paidAmount = paidSum;
    const dueAmount = Math.max(0, totalAmount - paidSum);

    // Shipment and Tracking Summary
    const shipmentSummary = order.shipments.map((s: any) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      status: s.status,
      shippedAt: s.shippedAt,
      courierName: s.courier?.name || null,
      trackingUrl: s.courier?.trackingUrl && s.trackingNumber
        ? `${s.courier.trackingUrl}${s.trackingNumber}`
        : null,
    }));

    const trackingSummary = order.shipments.flatMap((s: any) =>
      s.trackingEvents.map((e: any) => ({
        id: e.id,
        shipmentId: s.id,
        trackingNumber: s.trackingNumber,
        status: e.status,
        location: e.location,
        description: e.description,
        timestamp: e.timestamp,
      }))
    );

    // Return & Refund Summary
    const returnSummary = order.returnRequests.map((r: any) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      itemCount: r.items?.length || 0,
    }));

    const refundSummary = order.refunds.map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    }));

    // Parse shipping address cleanly without internal tokens
    let shippingInformation = null;
    if (order.shippingAddress) {
      try {
        shippingInformation = typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;
      } catch {
        shippingInformation = { address: order.shippingAddress };
      }
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      subtotal: order.subtotal ? Number(order.subtotal) : null,
      tax: order.taxAmount ? Number(order.taxAmount) : 0,
      shippingCost: order.shippingFee ? Number(order.shippingFee) : 0,
      discount: order.discountAmount ? Number(order.discountAmount) : 0,
      total: totalAmount,
      paidAmount,
      dueAmount,
      shippingInformation,
      coupon: order.coupon
        ? {
            code: order.coupon.code,
            discountType: order.coupon.discountType,
            discountValue: order.coupon.discountValue ? Number(order.coupon.discountValue) : null,
          }
        : null,
      items: itemsWithReviewEligibility,
      shipmentSummary,
      trackingSummary,
      returnSummary,
      refundSummary,
      reviewEligibility: {
        isEligible: itemsWithReviewEligibility.some((i: any) => i.isEligibleForReview),
        eligibleItemIds: itemsWithReviewEligibility.filter((i: any) => i.isEligibleForReview).map((i: any) => i.id),
      },
    };
  }

  static async getCustomerOrderTimeline(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      select: { id: true, orderNumber: true, status: true },
    });

    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }

    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        action: true,
        createdAt: true,
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      timeline,
    };
  }

  static async getOrderShipments(customerId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, customerId }
    });
    if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    
    const shipments = await prisma.shipment.findMany({
      where: { orderId },
      include: {
        courier: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        items: { include: { orderItem: { include: { product: true } } } }
      }
    });

    return shipments.map(mapShipmentToStorefrontDTO);
  }
}
