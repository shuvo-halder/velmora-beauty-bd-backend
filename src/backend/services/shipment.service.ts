import { prisma } from "../config/db";
import { emailService } from "./email.service";
import { AppError } from "../utils/AppError";
import { ShipmentStatus, TrackingStatus, NotificationType, NotificationChannel } from "@prisma/client";
import { courierRegistry } from "../integrations/courier/courier-provider.registry";
import { NormalizedShipmentRequest } from "../integrations/courier/courier.types";

export interface CreateShipmentOptions {
  orderId: string;
  courierId?: string | null;
  trackingNumber?: string | null;
  items?: { orderItemId: string; quantity: number }[];
  provider?: string;
  deliveryFee?: number | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  codAmount?: number | null;
  weight?: number | null;
  status?: string | null;
  metadata?: Record<string, any>;
}

export class AdminShipmentService {
  /**
   * Provider-agnostic shipment creation workflow.
   * Flow: Admin -> Select Order -> Create Shipment -> Select Courier Provider -> Backend Shipment Service -> Provider Adapter -> Shipment
   */
  static async createShipment(
    orderIdOrOptions: string | CreateShipmentOptions,
    courierId?: string | null,
    trackingNumber?: string | null,
    items?: { orderItemId: string; quantity: number }[],
    provider?: string,
    additionalOptions?: {
      deliveryFee?: number | null;
      notes?: string | null;
      idempotencyKey?: string | null;
      status?: string | null;
      metadata?: Record<string, any>;
    }
  ) {
    const opts: CreateShipmentOptions =
      typeof orderIdOrOptions === "object"
        ? orderIdOrOptions
        : {
            orderId: orderIdOrOptions,
            courierId,
            trackingNumber,
            items,
            provider,
            ...additionalOptions,
          };

    if (!opts.orderId) {
      throw new AppError("Order ID is required", 400, "INVALID_ORDER_ID");
    }

    // 1. Idempotency Check: if idempotencyKey is supplied and shipment already exists, return existing
    if (opts.idempotencyKey) {
      const existingByIdempotency = await prisma.shipment.findUnique({
        where: { idempotencyKey: opts.idempotencyKey },
        include: {
          items: true,
          trackingEvents: true,
          order: { include: { customer: true } },
          courier: true,
        },
      });
      if (existingByIdempotency) {
        return existingByIdempotency;
      }
    }

    // 2. Resolve Courier Provider via Registry
    const resolvedProviderId = (opts.provider || "").toLowerCase().trim() || "manual";
    if (!courierRegistry.hasProvider(resolvedProviderId)) {
      throw new AppError(
        `Unsupported courier provider '${opts.provider}'. Available providers: ${courierRegistry
          .getAllProviders()
          .map((p) => p.id)
          .join(", ")}`,
        400,
        "PROVIDER_NOT_FOUND"
      );
    }
    const courierAdapter = courierRegistry.getProvider(resolvedProviderId);

    // 3. Execute in Transaction with Order Row Lock & Validation
    return await prisma.$transaction(async (tx) => {
      // Lock Order row for transactional consistency
      await tx.order.update({
        where: { id: opts.orderId },
        data: { updatedAt: new Date() },
      });

      // Fetch fresh state of Order, items, and non-deleted shipments
      const order = await tx.order.findUnique({
        where: { id: opts.orderId },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
          shipments: {
            where: { deletedAt: null },
            include: { items: true },
          },
        },
      });

      if (!order || order.deletedAt) {
        throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
      }

      // State Validation
      const orderStatusLower = (order.status || "").toLowerCase();
      if (orderStatusLower === "cancelled") {
        throw new AppError("Cannot create shipment for a cancelled order", 400, "ORDER_CANCELLED");
      }
      if (orderStatusLower === "refunded" || orderStatusLower === "returned") {
        throw new AppError(
          `Cannot create shipment for order in '${order.status}' status`,
          400,
          "ORDER_TERMINAL"
        );
      }
      if (orderStatusLower === "delivered") {
        throw new AppError(
          "Cannot create shipment for an already delivered order",
          400,
          "ORDER_ALREADY_DELIVERED"
        );
      }
      if (!order.items || order.items.length === 0) {
        throw new AppError("Order has no items to ship", 400, "NO_ITEMS_TO_SHIP");
      }

      // Idempotency: An order must not accidentally receive duplicate active shipments
      const activeShipment = order.shipments.find(
        (s) =>
          s.status !== ShipmentStatus.CANCELLED &&
          s.status !== ShipmentStatus.FAILED_DELIVERY
      );

      if (activeShipment) {
        if (opts.idempotencyKey && activeShipment.idempotencyKey === opts.idempotencyKey) {
          return activeShipment;
        }
        throw new AppError(
          `Order already has an active shipment (${
            activeShipment.trackingNumber || activeShipment.consignmentId || activeShipment.id
          }). Duplicate active shipments are not permitted.`,
          409,
          "ACTIVE_SHIPMENT_EXISTS"
        );
      }

      // Validate quantities against authoritative order items and previously shipped quantities
      const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
      const shippedMap = new Map<string, number>();

      for (const shipment of order.shipments) {
        if (shipment.status !== ShipmentStatus.CANCELLED) {
          for (const item of shipment.items) {
            shippedMap.set(
              item.orderItemId,
              (shippedMap.get(item.orderItemId) || 0) + item.quantity
            );
          }
        }
      }

      let shipmentItems: { orderItemId: string; quantity: number }[] = [];

      if (opts.items && opts.items.length > 0) {
        for (const item of opts.items) {
          if (!item.quantity || item.quantity <= 0) {
            throw new AppError(
              "Shipment item quantity must be greater than zero",
              400,
              "INVALID_QUANTITY"
            );
          }

          const orderItem = orderItemMap.get(item.orderItemId);
          if (!orderItem) {
            throw new AppError(
              `Item ${item.orderItemId} is not part of this order`,
              400,
              "INVALID_ITEM"
            );
          }

          const orderedQty = orderItem.quantity;
          const previouslyShipped = shippedMap.get(item.orderItemId) || 0;
          const remainingToShip = orderedQty - previouslyShipped;

          if (item.quantity > remainingToShip) {
            throw new AppError(
              `Cannot ship ${item.quantity} of item '${
                orderItem.productName || item.orderItemId
              }'. Only ${remainingToShip} remaining.`,
              400,
              "EXCEEDS_ORDERED_QUANTITY"
            );
          }

          shippedMap.set(item.orderItemId, previouslyShipped + item.quantity);
          shipmentItems.push({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          });
        }
      } else {
        // Default to all remaining unshipped items
        for (const item of order.items) {
          const previouslyShipped = shippedMap.get(item.id) || 0;
          const remainingToShip = item.quantity - previouslyShipped;
          if (remainingToShip > 0) {
            shipmentItems.push({
              orderItemId: item.id,
              quantity: remainingToShip,
            });
          }
        }

        if (shipmentItems.length === 0) {
          throw new AppError(
            "All items in this order have already been shipped",
            400,
            "ALL_ITEMS_SHIPPED"
          );
        }
      }

      // Build Normalized Shipment Request for Provider Adapter
      const recipientName =
        opts.recipientName ||
        (order.customer
          ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() ||
            order.customer.email
          : "Customer");
      const recipientPhone = opts.recipientPhone || order.customer?.phone || "";
      const recipientAddress = opts.recipientAddress || order.shippingAddress || "";

      // Calculate authoritative due/collectable amount from existing Order financials
      const isPaid = order.paymentStatus?.toLowerCase() === "paid";
      let calculatedDueAmount = 0;
      if (!isPaid) {
        let totalPaid = 0;
        if (order.payments && Array.isArray(order.payments)) {
          totalPaid = order.payments
            .filter((p: any) => p.status === "PAID" || p.status === "COMPLETED")
            .reduce(
              (sum: number, p: any) =>
                sum + (Number(p.amount || 0) - Number(p.refundedAmount || 0)),
              0
            );
        }
        calculatedDueAmount = Math.max(0, Number(order.totalAmount || 0) - totalPaid);
      }

      // Customer collectable amount flows directly from the authoritative Order due amount
      const codAmount =
        opts.codAmount !== undefined && opts.codAmount !== null
          ? opts.codAmount
          : isPaid
          ? 0
          : calculatedDueAmount;

      const totalQty = shipmentItems.reduce((acc, it) => acc + it.quantity, 0);

      const normalizedRequest: NormalizedShipmentRequest = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        merchantReference: opts.trackingNumber || undefined,
        recipientName,
        recipientPhone,
        recipientAddress,
        codAmount,
        itemQuantity: totalQty,
        itemWeight: opts.weight || 0.5,
        specialInstructions: opts.notes || undefined,
        items: shipmentItems.map((si) => {
          const oi = orderItemMap.get(si.orderItemId);
          return {
            orderItemId: si.orderItemId,
            name: oi?.productName || "Item",
            quantity: si.quantity,
            unitPrice: oi?.price ? Number(oi.price) : undefined,
          };
        }),
        metadata: {
          ...opts.metadata,
          notes: opts.notes,
          deliveryFee: opts.deliveryFee !== null ? opts.deliveryFee : undefined,
          status: opts.status,
        },
      };

      // 4. Invoke Provider Adapter (Clean Provider Abstraction)
      const providerResult = await courierAdapter.createShipment(normalizedRequest);

      // 5. Handle Provider Adapter Failure
      // If provider is unconfigured, disabled, or rejected, abort transaction cleanly without creating a fake shipment
      if (!providerResult.success) {
        throw new AppError(
          providerResult.errorMessage || `Shipment creation failed with ${courierAdapter.displayName}`,
          400,
          providerResult.errorCode || `${courierAdapter.id.toUpperCase()}_FAILED`
        );
      }

      // 6. Map Normalized Status
      let mappedStatus: ShipmentStatus = ShipmentStatus.PROCESSING;
      if (providerResult.status === "SHIPPED") {
        mappedStatus = ShipmentStatus.SHIPPED;
      } else if (providerResult.status === "PENDING") {
        mappedStatus = ShipmentStatus.PENDING;
      } else if (providerResult.status === "IN_TRANSIT") {
        mappedStatus = ShipmentStatus.IN_TRANSIT;
      } else if (providerResult.status === "DELIVERED") {
        mappedStatus = ShipmentStatus.DELIVERED;
      }

      const resolvedDeliveryFee =
        providerResult.deliveryFee !== undefined && providerResult.deliveryFee !== null
          ? providerResult.deliveryFee
          : opts.deliveryFee !== undefined && opts.deliveryFee !== null
          ? opts.deliveryFee
          : null;

      // 7. Store Normalized Shipment in DB
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          courierId: opts.courierId || null,
          provider: courierAdapter.id,
          status: mappedStatus,
          trackingNumber: providerResult.trackingNumber || opts.trackingNumber || null,
          trackingUrl: providerResult.trackingUrl || null,
          consignmentId: providerResult.providerShipmentId || null,
          providerStatus: providerResult.status,
          deliveryFee: resolvedDeliveryFee !== null ? resolvedDeliveryFee : null,
          codAmount: codAmount,
          idempotencyKey: opts.idempotencyKey || null,
          shippedAt: mappedStatus === ShipmentStatus.SHIPPED ? new Date() : null,
          providerMetadata: {
            ...(providerResult.providerMetadata || {}),
            notes: opts.notes || undefined,
          },
          items: {
            create: shipmentItems.map((i) => {
              const orderItem = orderItemMap.get(i.orderItemId)!;
              return {
                orderItemId: i.orderItemId,
                warehouseId: orderItem.warehouseId || null,
                quantity: i.quantity,
              };
            }),
          },
          trackingEvents: {
            create: {
              status: TrackingStatus.INFO_RECEIVED,
              description: `Shipment created via ${courierAdapter.displayName}${
                providerResult.trackingNumber ? ` (${providerResult.trackingNumber})` : ""
              }`,
            },
          },
        },
        include: {
          items: true,
          trackingEvents: true,
          order: { include: { customer: true } },
          courier: true,
        },
      });

      // 8. Update Order Status
      if (order.status === "Pending" || order.status === "PROCESSING") {
        const newOrderStatus = mappedStatus === ShipmentStatus.SHIPPED ? "Shipped" : "PROCESSING";
        await tx.order.update({
          where: { id: order.id },
          data: { status: newOrderStatus, updatedAt: new Date() },
        });
      }

      // 9. Append to Order Timeline
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: order.status,
          action: `Shipment created via ${courierAdapter.displayName}. Tracking: ${
            shipment.trackingNumber || shipment.consignmentId || "N/A"
          }`,
        },
      });

      return shipment;
    });
  }

  static async getShipments(options: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (options.status) {
      where.status = options.status as ShipmentStatus;
    }

    if (options.search) {
      where.OR = [
        { trackingNumber: { contains: options.search } },
        { orderId: { contains: options.search } },
        { courier: { name: { contains: options.search } } }
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: { include: { customer: true } },
          courier: true,
          items: { include: { orderItem: { include: { product: true } } } },
          trackingEvents: { orderBy: { timestamp: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shipment.count({ where })
    ]);

    return {
      shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getShipmentById(id: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true } },
        courier: true,
        items: { include: { orderItem: { include: { product: true } } } },
        trackingEvents: { orderBy: { timestamp: 'desc' } }
      }
    });

    if (!shipment) {
      throw new AppError("Shipment not found", 404, "SHIPMENT_NOT_FOUND");
    }

    return shipment;
  }

  static async updateShipmentStatus(
    id: string,
    status: ShipmentStatus,
    location?: string,
    description?: string,
    trackingNumber?: string,
    courierName?: string,
    courierId?: string
  ) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { order: { include: { customer: true } }, courier: true }
    });

    if (!shipment) {
      throw new AppError("Shipment not found", 404, "SHIPMENT_NOT_FOUND");
    }

    const updatedShipmentTransaction = await prisma.$transaction(async (tx) => {
      // 1. Lock and re-verify fresh Order state FIRST before any shipment modifications
      const currentOrder = await tx.order.update({
        where: { id: shipment.orderId },
        data: { updatedAt: new Date() }
      });

      if (!currentOrder || currentOrder.deletedAt) {
        throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
      }

      if (currentOrder.status === "Cancelled") {
        throw new AppError("Cannot update shipment for a cancelled order", 400, "ORDER_CANCELLED");
      }

      if (currentOrder.status === "Returned") {
        throw new AppError("Cannot update shipment for a returned order", 400, "ORDER_RETURNED");
      }

      let resolvedCourierId = courierId || shipment.courierId;

      if (!resolvedCourierId && courierName) {
        let courierRecord = await tx.courier.findFirst({
          where: { name: { equals: courierName } }
        });
        if (!courierRecord) {
          courierRecord = await tx.courier.create({
            data: { name: courierName }
          });
        }
        resolvedCourierId = courierRecord.id;
      }

      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status,
          trackingNumber: trackingNumber || shipment.trackingNumber,
          courierId: resolvedCourierId,
          shippedAt: status === "SHIPPED" && !shipment.shippedAt ? new Date() : undefined,
          deliveredAt: status === "DELIVERED" && !shipment.deliveredAt ? new Date() : undefined
        },
        include: { courier: true, order: true }
      });

      let trackingStatus: TrackingStatus = TrackingStatus.INFO_RECEIVED;
      if (status === "SHIPPED" || status === "IN_TRANSIT") trackingStatus = TrackingStatus.IN_TRANSIT;
      if (status === "OUT_FOR_DELIVERY") trackingStatus = TrackingStatus.OUT_FOR_DELIVERY;
      if (status === "DELIVERED") trackingStatus = TrackingStatus.DELIVERED;
      if (status === "FAILED_DELIVERY" || status === "RETURNED") trackingStatus = TrackingStatus.EXCEPTION;

      await tx.trackingEvent.create({
        data: {
          shipmentId: id,
          status: trackingStatus,
          location,
          description: description || `Status updated to ${status}`
        }
      });

      if (status === "DELIVERED") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: "Delivered" }
        });
        await tx.orderTimeline.create({
          data: { orderId: shipment.orderId, status: "Delivered", action: "Order DELIVERED" }
        });

        if (shipment.order?.customerId) {
          await tx.notification.create({
            data: {
              customerId: shipment.order.customerId,
              orderId: shipment.orderId,
              type: NotificationType.ORDER_DELIVERED,
              channel: NotificationChannel.IN_APP,
              title: "Order Delivered",
              message: `Your order #${shipment.orderId.split("-")[0]} has been delivered.`,
              status: "PENDING"
            }
          });
        }
      } else if (status === "SHIPPED") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: "Shipped" }
        });
        await tx.orderTimeline.create({
          data: { orderId: shipment.orderId, status: "Shipped", action: "Order SHIPPED" }
        });

        if (shipment.order?.customerId) {
          await tx.notification.create({
            data: {
              customerId: shipment.order.customerId,
              orderId: shipment.orderId,
              type: NotificationType.ORDER_SHIPPED,
              channel: NotificationChannel.IN_APP,
              title: "Order Shipped",
              message: `Your order #${shipment.orderId.split("-")[0]} has been shipped with ${updatedShipment.courier?.name || 'carrier'}. Tracking: ${updatedShipment.trackingNumber || 'N/A'}`,
              status: "PENDING"
            }
          });
        }
      }

      return updatedShipment;
    });

    if (shipment.status !== status) {
      try {
        if (status === "SHIPPED" || status === "DELIVERED") {
          const fullOrder = await prisma.order.findUnique({
            where: { id: shipment.orderId },
            include: { customer: true, items: true }
          });
          
          const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
          if (fullOrder && orderEmail) {
            const emailRecipient = { email: orderEmail, firstName: fullOrder.customer?.firstName || "Customer" };
            if (status === "SHIPPED") {
              emailService.sendOrderShippedEmail(emailRecipient, updatedShipmentTransaction, fullOrder).catch(() => {});
            } else if (status === "DELIVERED") {
              emailService.sendOrderDeliveredEmail(emailRecipient, updatedShipmentTransaction, fullOrder).catch(() => {});
            }
          }
        }
      } catch (err) {}
    }

    return updatedShipmentTransaction;
    }

  static async deleteShipment(id: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { id, deletedAt: null }
    });
    if (!shipment) {
      throw new AppError("Shipment not found", 404, "SHIPMENT_NOT_FOUND");
    }
    return await prisma.shipment.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
