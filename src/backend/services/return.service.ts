import { prisma } from "../config/db";
import { emailService } from "./email.service";
import { AppError } from "../utils/AppError";
import { ReturnStatus, NotificationType, NotificationChannel } from "@prisma/client";

export class AdminReturnService {
  static async getReturns(options: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (options.status) {
      where.status = options.status as ReturnStatus;
    }

    if (options.search) {
      where.OR = [
        { id: { contains: options.search } },
        { orderId: { contains: options.search } },
        { reason: { contains: options.search } },
        { customer: { email: { contains: options.search } } }
      ];
    }

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          order: true,
          items: {
            include: {
              orderItem: {
                include: { product: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.returnRequest.count({ where })
    ]);

    return {
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getReturnById(id: string) {
    const returnReq = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        items: {
          include: {
            orderItem: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!returnReq) {
      throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");
    }

    return returnReq;
  }

  static async approveReturn(id: string, adminNotes?: string) {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Row lock returnRequest
      const lockedReq = await tx.returnRequest.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      if (!lockedReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      // 2. Re-read fresh state under lock
      const returnReq = await tx.returnRequest.findUnique({
        where: { id },
        include: { items: true, order: true },
      });

      if (!returnReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      if (returnReq.status !== ReturnStatus.REQUESTED) {
        throw new AppError(
          `Cannot approve return from status ${returnReq.status}. Only REQUESTED returns can be approved.`,
          400,
          "INVALID_STATUS"
        );
      }

      const updated = await tx.returnRequest.update({
        where: { id },
        data: { status: ReturnStatus.APPROVED, adminNotes: adminNotes || returnReq.adminNotes },
        include: { order: true, customer: true },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: returnReq.orderId,
          status: returnReq.order.status,
          action: "RETURN_APPROVED",
        },
      });

      // Send customer notification
      await tx.notification.create({
        data: {
          customerId: returnReq.customerId,
          orderId: returnReq.orderId,
          type: NotificationType.RETURN_APPROVED,
          channel: NotificationChannel.IN_APP,
          title: "Return Request Approved",
          message: `Your return request for order #${returnReq.orderId.split("-")[0]} has been approved.`,
          status: "PENDING",
        },
      });

      return updated;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: updatedTransaction.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendReturnApprovedEmail(emailRecipient, updatedTransaction, fullOrder).catch(() => {});
      }
    } catch (e) {}

    return updatedTransaction;
  }

  static async rejectReturn(id: string, adminNotes?: string) {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Row lock returnRequest
      const lockedReq = await tx.returnRequest.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      if (!lockedReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      // 2. Re-read fresh state under lock
      const returnReq = await tx.returnRequest.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!returnReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      if (returnReq.status !== ReturnStatus.REQUESTED) {
        throw new AppError(
          `Cannot reject return from status ${returnReq.status}. Only REQUESTED returns can be rejected.`,
          400,
          "INVALID_STATUS"
        );
      }

      const updated = await tx.returnRequest.update({
        where: { id },
        data: { status: ReturnStatus.REJECTED, adminNotes: adminNotes || returnReq.adminNotes },
        include: { order: true, customer: true },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: returnReq.orderId,
          status: returnReq.order.status,
          action: "RETURN_REJECTED",
        },
      });

      // Send customer notification
      await tx.notification.create({
        data: {
          customerId: returnReq.customerId,
          orderId: returnReq.orderId,
          type: NotificationType.GENERAL,
          channel: NotificationChannel.IN_APP,
          title: "Return Request Rejected",
          message: `Your return request for order #${returnReq.orderId.split("-")[0]} has been rejected.${adminNotes ? ` Note: ${adminNotes}` : ""}`,
          status: "PENDING",
        },
      });

      return updated;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: updatedTransaction.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendReturnRejectedEmail(emailRecipient, updatedTransaction, fullOrder).catch(() => {});
      }
    } catch (e) {}

    return updatedTransaction;
  }

  static async receiveReturn(id: string, adminNotes?: string) {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Row lock returnRequest
      const lockedReq = await tx.returnRequest.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      if (!lockedReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      // 2. Re-read fresh state with items under lock
      const returnReq = await tx.returnRequest.findUnique({
        where: { id },
        include: { items: { include: { orderItem: true } }, order: true },
      });

      if (!returnReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      if (returnReq.status === ReturnStatus.RECEIVED) {
        throw new AppError("Return request has already been marked as RECEIVED", 400, "RETURN_ALREADY_RECEIVED");
      }

      if (returnReq.status !== ReturnStatus.APPROVED) {
        throw new AppError(
          `Cannot receive return from status ${returnReq.status}. Only APPROVED returns can be marked as RECEIVED.`,
          400,
          "INVALID_STATUS"
        );
      }

      // 3. RESTOCK INVENTORY EXACTLY ONCE
      for (const item of returnReq.items) {
        const orderItem = item.orderItem;
        const targetWarehouseId = item.warehouseId || orderItem.warehouseId;

        if (targetWarehouseId) {
          let targetInv;
          if (orderItem.productVariantId) {
            targetInv = await tx.inventory.findFirst({
              where: { warehouseId: targetWarehouseId, variantId: orderItem.productVariantId },
            });
          } else {
            targetInv = await tx.inventory.findFirst({
              where: { warehouseId: targetWarehouseId, productId: orderItem.productId },
            });
          }

          if (!targetInv) {
            throw new AppError(`No inventory record found for warehouse ${targetWarehouseId} to restock.`, 409, "INVENTORY_NOT_FOUND");
          }

          await tx.inventory.update({
            where: { id: targetInv.id },
            data: { quantityAvailable: { increment: item.quantity } },
          });
        } else {
          // Historical order fallback with NULL warehouseId
          let matchingInventories;
          if (orderItem.productVariantId) {
            matchingInventories = await tx.inventory.findMany({
              where: { variantId: orderItem.productVariantId },
            });
          } else {
            matchingInventories = await tx.inventory.findMany({
              where: { productId: orderItem.productId },
            });
          }

          if (matchingInventories.length === 0) {
            throw new AppError("No inventory record found to restock.", 409, "INVENTORY_NOT_FOUND");
          } else if (matchingInventories.length === 1) {
            await tx.inventory.update({
              where: { id: matchingInventories[0].id },
              data: { quantityAvailable: { increment: item.quantity } },
            });
          } else {
            throw new AppError(
              "INVENTORY_WAREHOUSE_ORIGIN_UNKNOWN: Cannot determine fulfillment warehouse for historical return item.",
              409,
              "INVENTORY_WAREHOUSE_ORIGIN_UNKNOWN"
            );
          }
        }
      }

      const updated = await tx.returnRequest.update({
        where: { id },
        data: { status: ReturnStatus.RECEIVED, adminNotes: adminNotes || returnReq.adminNotes },
        include: { order: true, customer: true },
      });

      await tx.orderTimeline.create({
        data: { orderId: returnReq.orderId, status: returnReq.order.status, action: "RETURN_RECEIVED" },
      });

      // Send customer notification
      await tx.notification.create({
        data: {
          customerId: returnReq.customerId,
          orderId: returnReq.orderId,
          type: NotificationType.GENERAL,
          channel: NotificationChannel.IN_APP,
          title: "Return Item Received",
          message: `We have received your returned item(s) for order #${returnReq.orderId.split("-")[0]}.`,
          status: "PENDING",
        },
      });

      return updated;
    });

    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: updatedTransaction.orderId },
        include: { customer: true },
      });
      const orderEmail = fullOrder?.customer?.email || fullOrder?.customerEmail;
      if (fullOrder && orderEmail) {
        const emailRecipient = {
          email: orderEmail,
          firstName: fullOrder.customer?.firstName || "Customer",
        };
        emailService.sendReturnReceivedEmail(emailRecipient, updatedTransaction, fullOrder).catch(() => {});
      }
    } catch (e) {}

    return updatedTransaction;
  }

  static async closeReturn(id: string, adminNotes?: string) {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Row lock returnRequest
      const lockedReq = await tx.returnRequest.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      if (!lockedReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      // 2. Re-read fresh state under lock
      const returnReq = await tx.returnRequest.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!returnReq) throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");

      if (returnReq.status !== ReturnStatus.RECEIVED && returnReq.status !== ReturnStatus.REFUNDED) {
        throw new AppError(
          `Cannot close return from status ${returnReq.status}. Only RECEIVED or REFUNDED returns can be closed.`,
          400,
          "INVALID_STATUS"
        );
      }

      const updated = await tx.returnRequest.update({
        where: { id },
        data: { status: ReturnStatus.CLOSED, adminNotes: adminNotes || returnReq.adminNotes },
        include: { order: true, customer: true },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: returnReq.orderId,
          status: returnReq.order.status,
          action: "RETURN_CLOSED",
        },
      });

      return updated;
    });

    return updatedTransaction;
    }

  static async deleteReturn(id: string) {
    const returnReq = await prisma.returnRequest.findFirst({
      where: { id, deletedAt: null }
    });
    if (!returnReq) {
      throw new AppError("Return request not found", 404, "RETURN_NOT_FOUND");
    }
    return await prisma.returnRequest.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
