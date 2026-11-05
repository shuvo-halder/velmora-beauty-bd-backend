import { Response, NextFunction } from "express";
import { Prisma, PaymentStatus, PaymentProvider, RefundStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthRequest } from "../middlewares/auth";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/audit.service";
import { emailService } from "../services/email.service";
import { MeasurementProtocolService } from "../services/measurement-protocol.service";

// GET /api/v1/orders
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      paymentStatus = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { customer: { firstName: { contains: search as string } } },
        { customer: { lastName: { contains: search as string } } },
        { customer: { email: { contains: search as string } } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          assignedStaff: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/:id
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        assignedStaff: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        shipments: {
          orderBy: { createdAt: "desc" },
          include: {
            courier: true,
            trackingEvents: {
              orderBy: { timestamp: "desc" },
            },
          },
        },
        timeline: {
          orderBy: { createdAt: "asc" },
        },
        orderNotes: {
          orderBy: { createdAt: "desc" },
        },
        coupon: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/orders/:id/status
export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, internalNotes } = req.body;

    const existingOrder = await prisma.order.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingOrder) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }


    const updateData: any = {};
    const timelineEntries: any[] = [];
    const actorName = req.user?.email || "Admin";

    if (status && status !== existingOrder.status) {
      updateData.status = status;
      timelineEntries.push({
        status,
        action: `Order status changed from ${existingOrder.status} to ${status}`,
        userId: req.user?.id || null,
        userName: actorName,
      });
    }

    if (paymentStatus && paymentStatus !== existingOrder.paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      timelineEntries.push({
        status: status || existingOrder.status,
        action: `Payment status updated to ${paymentStatus}`,
        userId: req.user?.id || null,
        userName: actorName,
      });
    }

    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes;
    }

    if (Object.keys(updateData).length === 0 && timelineEntries.length === 0) {
      return res.status(200).json({ status: "success", data: { order: existingOrder } });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Row lock Order
      const currentOrder = await tx.order.update({
        where: { id },
        data: { updatedAt: new Date() }
      });
      if (!currentOrder || currentOrder.deletedAt) throw new AppError("Order not found", 404, "NOT_FOUND");

      // State machine transition validation
      if (status && status !== currentOrder.status) {
        if (currentOrder.status === "Cancelled") {
          throw new AppError("Cannot change status of a Cancelled order", 400, "INVALID_ORDER_STATE");
        }
        if (currentOrder.status === "Returned") {
          throw new AppError("Cannot change status of a Returned order", 400, "INVALID_ORDER_STATE");
        }
        if (currentOrder.status === "Shipped" && status !== "Delivered") {
          throw new AppError(`Cannot transition order from Shipped to ${status}`, 400, "INVALID_ORDER_STATE");
        }
        if (currentOrder.status === "Delivered" && status !== "Returned") {
          throw new AppError(`Cannot transition order from Delivered to ${status}`, 400, "INVALID_ORDER_STATE");
        }
      }

      if (status === "Cancelled" && currentOrder.status !== "Cancelled") {
        const lowerStatus = currentOrder.status.toLowerCase();
        if (lowerStatus === "shipped" || lowerStatus === "delivered") {
          throw new AppError(`Cannot cancel an order that is already ${currentOrder.status}`, 400, "INVALID_ORDER_STATE");
        }

        // Financial lifecycle state management on cancellation
        const payments = await tx.payment.findMany({ where: { orderId: id } });
        if (payments.length > 0) {
          for (const payment of payments) {
            // Lock authoritative Payment row FIRST before checking or mutating financial status / refunds
            await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
            await tx.payment.update({
              where: { id: payment.id },
              data: { updatedAt: new Date() },
            });
            const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
            if (!lockedPayment) continue;

            if (lockedPayment.status === PaymentStatus.PENDING || lockedPayment.status === PaymentStatus.PROCESSING) {
              await tx.payment.update({
                where: { id: lockedPayment.id },
                data: { status: PaymentStatus.CANCELLED },
              });

              await tx.paymentTransaction.create({
                data: {
                  paymentId: lockedPayment.id,
                  status: PaymentStatus.CANCELLED,
                  responsePayload: { reason: "ORDER_CANCELLED" },
                },
              });

              updateData.paymentStatus = "Cancelled";
            } else if (lockedPayment.status === PaymentStatus.PAID) {
              const existingRefunds = await tx.refund.findMany({
                where: { paymentId: lockedPayment.id },
              });

              // Check if an active cancellation auto-refund already exists
              const activeCancellationRefund = existingRefunds.find(
                (r) =>
                  (r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING) &&
                  (r.reason === "Order cancellation auto-refund request" || r.reason === "ORDER_CANCELLED")
              );

              if (!activeCancellationRefund) {
                const totalReserved = existingRefunds
                  .filter((r) => r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING)
                  .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

                const remainingRefundable = lockedPayment.amount
                  .sub(lockedPayment.refundedAmount)
                  .sub(totalReserved);

                if (remainingRefundable.gt(0)) {
                  const refund = await tx.refund.create({
                    data: {
                      paymentId: lockedPayment.id,
                      orderId: currentOrder.id,
                      customerId: currentOrder.customerId,
                      amount: remainingRefundable,
                      currency: lockedPayment.currency,
                      status: RefundStatus.PENDING,
                      reason: "Order cancellation auto-refund request",
                    },
                  });

                  await tx.refundTransaction.create({
                    data: {
                      refundId: refund.id,
                      status: RefundStatus.PENDING,
                      requestPayload: { reason: "ORDER_CANCELLED", amount: remainingRefundable.toString() },
                    },
                  });
                }
              }
            }
          }
        } else {
          updateData.paymentStatus = "Cancelled";
        }

        // Restore inventory
        const orderItems = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of orderItems) {
          if (item.warehouseId) {
            let inv;
            if (item.productVariantId) {
              inv = await tx.inventory.findFirst({
                where: { warehouseId: item.warehouseId, variantId: item.productVariantId }
              });
            } else {
              inv = await tx.inventory.findFirst({
                where: { warehouseId: item.warehouseId, productId: item.productId }
              });
            }

            if (!inv) {
              throw new AppError(`No inventory record found for warehouse ${item.warehouseId} to restock.`, 409, "INVENTORY_NOT_FOUND");
            }

            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantityAvailable: { increment: item.quantity } }
            });
          } else {
            // Historical order fallback with NULL warehouseId
            let matchingInventories;
            if (item.productVariantId) {
              matchingInventories = await tx.inventory.findMany({
                where: { variantId: item.productVariantId }
              });
            } else {
              matchingInventories = await tx.inventory.findMany({
                where: { productId: item.productId }
              });
            }

            if (matchingInventories.length === 0) {
              throw new AppError(`No inventory record found to restock.`, 409, "INVENTORY_NOT_FOUND");
            } else if (matchingInventories.length === 1) {
              await tx.inventory.update({
                where: { id: matchingInventories[0].id },
                data: { quantityAvailable: { increment: item.quantity } }
              });
            } else {
              throw new AppError(
                `INVENTORY_WAREHOUSE_ORIGIN_UNKNOWN: Cannot determine fulfillment warehouse for historical order with multiple warehouses.`,
                409,
                "INVENTORY_WAREHOUSE_ORIGIN_UNKNOWN"
              );
            }
          }
        }

        // Restore coupon usage count if a coupon was used
        if (currentOrder.couponId) {
          await tx.coupon.updateMany({
            where: { id: currentOrder.couponId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
      } else if (status === "Cancelled" && currentOrder.status === "Cancelled") {
        // Remove status update from updateData if it's already cancelled
        delete updateData.status;
        const index = timelineEntries.findIndex(e => e.action.includes("changed from"));
        if (index !== -1) timelineEntries.splice(index, 1);
      }

      // Synchronize Payment ledger when paymentStatus is updated
      if (paymentStatus && paymentStatus !== currentOrder.paymentStatus) {
        const isTargetPaid = paymentStatus.toLowerCase() === "paid";
        const isTargetUnpaid = paymentStatus.toLowerCase() === "unpaid";

        if (isTargetPaid) {
          const payments = await tx.payment.findMany({ where: { orderId: id } });

          if (payments.length > 0) {
            for (const payment of payments) {
              if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
                await tx.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                  },
                });

                await tx.paymentTransaction.create({
                  data: {
                    paymentId: payment.id,
                    status: PaymentStatus.PAID,
                    responsePayload: {
                      action: "MANUAL_COD_MARK_PAID",
                      markedBy: actorName,
                      note: "COD payment manually marked as PAID by admin",
                      timestamp: new Date().toISOString(),
                    },
                  },
                });
              }
            }
          } else {
            // If order has no Payment row, create one for COD tracking
            let provider: PaymentProvider = PaymentProvider.COD;
            const pm = (currentOrder.paymentMethod || "").toUpperCase();
            if (Object.values(PaymentProvider).includes(pm as any)) {
              provider = pm as PaymentProvider;
            }

            const newPayment = await tx.payment.create({
              data: {
                orderId: id,
                customerId: currentOrder.customerId || null,
                provider,
                amount: currentOrder.totalAmount,
                currency: "BDT",
                status: PaymentStatus.PAID,
                paidAt: new Date(),
              },
            });

            await tx.paymentTransaction.create({
              data: {
                paymentId: newPayment.id,
                status: PaymentStatus.PAID,
                responsePayload: {
                  action: "MANUAL_COD_MARK_PAID",
                  markedBy: actorName,
                  note: "COD payment record created and marked as PAID by admin",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        } else if (isTargetUnpaid) {
          // Revert payments marked as PAID if no refunds exist
          const payments = await tx.payment.findMany({
            where: {
              orderId: id,
              status: PaymentStatus.PAID,
              refundedAmount: { equals: 0 },
            },
          });

          for (const payment of payments) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.PENDING,
                paidAt: null,
              },
            });

            await tx.paymentTransaction.create({
              data: {
                paymentId: payment.id,
                status: PaymentStatus.PENDING,
                responsePayload: {
                  action: "MANUAL_COD_MARK_UNPAID",
                  markedBy: actorName,
                  note: "Payment status reverted to UNPAID by admin",
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        }
      }

      return await tx.order.update({
        where: { id },
        data: {
          ...updateData,
          ...(timelineEntries.length > 0 && {
            timeline: {
              create: timelineEntries,
            }
          }),
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          shipments: {
            orderBy: { createdAt: "desc" },
            include: {
              courier: true,
              trackingEvents: {
                orderBy: { timestamp: "desc" },
              },
            },
          },
          timeline: { orderBy: { createdAt: "asc" } },
          orderNotes: { orderBy: { createdAt: "desc" } },
          coupon: true,
          payments: { orderBy: { createdAt: "desc" } },
          refunds: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    await AuditService.createLog(
      req.user?.id || null,
      "UPDATE_ORDER_STATUS",
      "Order",
      id,
      null,
      { oldStatus: existingOrder.status, newStatus: status, paymentStatus },
      req
    );

    const orderEmail = updatedOrder?.customer?.email || updatedOrder?.customerEmail;
    if (status && status !== existingOrder.status && orderEmail) {
      try {
        const emailRecipient = { email: orderEmail, firstName: updatedOrder.customer?.firstName || "Customer" };
        if (status === "Processing") {
          emailService.sendOrderProcessingEmail(emailRecipient, updatedOrder).catch(() => {});
        } else if (status === "Confirmed") {
          emailService.sendOrderConfirmedEmail(emailRecipient, updatedOrder).catch(() => {});
        } else if (status === "Cancelled") {
          emailService.sendOrderCancelledEmail(emailRecipient, updatedOrder).catch(() => {});
        }
      } catch (err) {
        console.error(`[Email Service] Failed to dispatch order status email for ${id}`);
      }
    }

    if (
      existingOrder.paymentStatus?.toUpperCase() !== "PAID" &&
      updatedOrder.paymentStatus?.toUpperCase() === "PAID"
    ) {
      MeasurementProtocolService.processOrderPaymentSuccess(id).catch((err) => {
        console.error("[Analytics] Error tracking purchase on admin order update:", err);
      });
    }

    const updatedStatusUpper = updatedOrder.status?.toUpperCase() || "";
    const isConfirmedOrProcessing = updatedStatusUpper === "CONFIRMED" || updatedStatusUpper === "PROCESSING";
    const methodUpper = (updatedOrder.paymentMethod || "").toUpperCase();
    const isCod = methodUpper.includes("COD") || methodUpper.includes("CASH");

    if (isCod && isConfirmedOrProcessing) {
      MeasurementProtocolService.processCodOrderConfirmation(id).catch((err) => {
        console.error("[Analytics] Error tracking COD purchase on admin order update:", err);
      });
    }

    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/orders/:id/assign
export const assignOrderStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { assignedStaffId } = req.body;

    const existingOrder = await prisma.order.findFirst({ where: { id, deletedAt: null } });
    if (!existingOrder) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }

    let staffName = "Unassigned";
    if (assignedStaffId) {
      const staff = await prisma.user.findFirst({ where: { id: assignedStaffId } });
      if (staff) {
        staffName = `${staff.firstName} ${staff.lastName || ""}`.trim();
      }
    }

    const actorName = req.user?.email || "Admin";

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        assignedStaffId: assignedStaffId || null,
        timeline: {
          create: {
            status: existingOrder.status,
            action: assignedStaffId ? `Order assigned to ${staffName}` : "Staff unassigned from order",
            userId: req.user?.id || null,
            userName: actorName,
          },
        },
      },
      include: {
        assignedStaff: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (updatedOrder.assignedStaff) {
      
      emailService.sendStaffAssignmentEmail(updatedOrder.assignedStaff, updatedOrder).catch(() => {});
    }

    res.status(200).json({
      status: "success",
      message: "Order staff updated successfully",
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/orders/:id/notes
export const addOrderNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return next(new AppError("Note text is required", 400, "VALIDATION_ERROR"));
    }

    const order = await prisma.order.findFirst({ where: { id, deletedAt: null } });
    if (!order) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }

    const actorName = req.user?.email || "Admin";

    const newNote = await prisma.orderNote.create({
      data: {
        orderId: id,
        note: note.trim(),
        author: actorName,
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: order.status,
        action: `Internal note added by ${actorName}: "${note.trim()}"`,
        userId: req.user?.id || null,
        userName: actorName,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Order note added successfully",
      data: { note: newNote },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/orders/:id
export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({ where: { id, deletedAt: null } });
    if (!order) {
      return next(new AppError("Order not found", 404, "NOT_FOUND"));
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { deletedAt: now },
      }),
      prisma.payment.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.refund.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.returnRequest.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.shipment.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      })
    ]);

    await AuditService.createLog(
      req.user?.id || null,
      "DELETE_ORDER",
      "Order",
      id,
      null,
      { orderNumber: order.orderNumber },
      req
    );

    res.status(200).json({
      status: "success",
      message: "Order deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
