import { normalizePhone } from "../utils/phone";
import { Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../middlewares/auth";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/audit.service";

// GET /api/v1/customers

const sanitizeCustomer = (cust: any) => {
  const { passwordHash, resetPasswordToken, resetPasswordExpires, verificationToken, verificationExpires, pendingEmailVerificationToken, pendingEmailVerificationExpires, ...safeCust } = cust;
  return safeCust;
};

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    const [customersRaw, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          orders: {
            where: { deletedAt: null },
            select: { id: true, totalAmount: true, createdAt: true, status: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const customers = customersRaw.map((cust) => {
      const totalOrders = cust.orders.length;
      const lifetimeValue = cust.orders
        .filter((o) => o.status !== "Cancelled" && o.status !== "Refunded")
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      
      const sortedOrders = [...cust.orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

      const { orders, ...rest } = sanitizeCustomer(cust);
      return {
        ...rest,
        totalOrders,
        lifetimeValue,
        lastOrderDate,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        customers,
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

// GET /api/v1/customers/:id
export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { product: { select: { name: true } } },
            },
          },
        },
        reviews: {
          where: { deletedAt: null },
          include: { product: { select: { name: true } } },
        },
        customerNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const totalOrders = customer.orders.length;
    const lifetimeValue = customer.orders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Refunded")
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const lastOrderDate = customer.orders.length > 0 ? customer.orders[0].createdAt : null;

    res.status(200).json({
      status: "success",
      data: {
        customer: {
          ...sanitizeCustomer(customer),
          totalOrders,
          lifetimeValue,
          lastOrderDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/customers/:id/status
export const updateCustomerStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return next(new AppError("isActive boolean is required", 400, "VALIDATION_ERROR"));
    }

    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { isActive },
    });

    await AuditService.createLog(
      req.user?.id || null,
      isActive ? "ACTIVATE_CUSTOMER" : "DEACTIVATE_CUSTOMER",
      "Customer",
      id,
      null,
      { email: customer.email, isActive },
      req
    );

    res.status(200).json({
      status: "success",
      message: `Customer ${isActive ? "activated" : "deactivated"} successfully`,
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/customers/:id/notes
export const addCustomerNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return next(new AppError("Note content is required", 400, "VALIDATION_ERROR"));
    }

    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const authorName = req.user?.email || "Admin";

    const newNote = await prisma.customerNote.create({
      data: {
        customerId: id,
        note: note.trim(),
        author: authorName,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Customer note added successfully",
      data: { note: newNote },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/customers/:id/reset-password
export const resetCustomerPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }

    const authorName = req.user?.email || "Admin";

    await prisma.customerNote.create({
      data: {
        customerId: id,
        note: "Admin triggered a force password reset / account recovery notification.",
        author: authorName,
      },
    });

    await AuditService.createLog(
      req.user?.id || null,
      "RESET_CUSTOMER_PASSWORD",
      "Customer",
      id,
      null,
      { email: customer.email },
      req
    );

    res.status(200).json({
      status: "success",
      message: `Password reset link / token generated for customer ${customer.email}`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerMobileStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { phoneVerified, phone } = req.body;
    let normalizedPhone = phone;
    if (normalizedPhone) {
      normalizedPhone = normalizePhone(normalizedPhone);
      if (!normalizedPhone) {
        return next(new AppError("Invalid Bangladesh mobile number format", 400, "BAD_REQUEST"));
      }
    }

    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) {
      return next(new AppError("Customer not found", 404, "NOT_FOUND"));
    }
    
    // Check if new phone conflicts
    if (normalizedPhone && normalizedPhone !== customer.phone) {
       const existing = await prisma.customer.findUnique({ where: { phone: normalizedPhone } });
       if (existing && existing.id !== customer.id) {
          return next(new AppError("This phone number is already registered to another customer.", 400, "BAD_REQUEST"));
       }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { 
        ...((normalizedPhone !== undefined && normalizedPhone !== null) && { phone: normalizedPhone }),
        ...(phoneVerified !== undefined && { 
             phoneVerified, 
             phoneVerifiedAt: phoneVerified ? new Date() : null 
        }),
      },
    });

    await AuditService.createLog(
      req.user?.id || null,
      "UPDATE_CUSTOMER_MOBILE",
      "Customer",
      id,
      null,
      { phoneVerified, phone: normalizedPhone },
      req
    );

    res.status(200).json({
      status: "success",
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
};
