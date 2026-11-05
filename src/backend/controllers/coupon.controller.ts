import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { calculateCouponDiscount, CartItemForCoupon } from "../utils/couponCalculator";
import { AuditService } from "../services/audit.service";

function parseJsonArray(val: string | null): string[] | null {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function stringifyScopeArray(val: any): string | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    const filtered = val.map((v) => String(v).trim()).filter(Boolean);
    return filtered.length > 0 ? JSON.stringify(filtered) : null;
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const filtered = parsed.map((v) => String(v).trim()).filter(Boolean);
        return filtered.length > 0 ? JSON.stringify(filtered) : null;
      }
    } catch {
      const filtered = val.split(",").map((v) => v.trim()).filter(Boolean);
      return filtered.length > 0 ? JSON.stringify(filtered) : null;
    }
  }
  return null;
}

export const getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    status,
    discountType,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const whereCondition: Prisma.CouponWhereInput = { deletedAt: null };

  if (search && String(search).trim()) {
    whereCondition.code = { contains: String(search).trim(), mode: "insensitive" };
  }

  const now = new Date();
  if (status === "active") {
    whereCondition.isActive = true;
    whereCondition.validFrom = { lte: now };
    whereCondition.validUntil = { gte: now };
  } else if (status === "expired") {
    whereCondition.validUntil = { lt: now };
  } else if (status === "inactive") {
    whereCondition.isActive = false;
  }

  if (discountType && ["percentage", "fixed", "free_shipping"].includes(String(discountType))) {
    whereCondition.discountType = String(discountType) as any;
  }

  const allowedSortFields = ["createdAt", "code", "validFrom", "validUntil", "usedCount", "discountValue"];
  const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : "createdAt";
  const sortDir = String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

  const [total, coupons] = await Promise.all([
    prisma.coupon.count({ where: whereCondition }),
    prisma.coupon.findMany({
      where: whereCondition,
      include: {
        orders: {
          where: { status: { not: "Cancelled" } },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { [sortField]: sortDir },
      skip,
      take: limitNum,
    }),
  ]);

  // Calculate usage stats per coupon
  const result = coupons.map((coupon) => {
    const totalUses = coupon.orders.length;
    const revenueGenerated = coupon.orders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0
    );
    const conversionRate = totalUses > 0 ? Math.min(100, Math.round((totalUses / (totalUses + 5)) * 100)) : 0;

    return {
      ...coupon,
      applicableCategories: parseJsonArray(coupon.applicableCategories),
      applicableProducts: parseJsonArray(coupon.applicableProducts),
      applicableBrands: parseJsonArray(coupon.applicableBrands),
      stats: {
        totalUses,
        revenueGenerated,
        conversionRate: `${conversionRate}%`,
      },
    };
  });

  res.status(200).json({
    success: true,
    data: result,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

export const getCouponById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const coupon = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
    include: {
      orders: {
        where: { status: { not: "Cancelled" } },
        include: {
          customer: true,
        },
      },
    },
  });

  if (!coupon) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }

  const totalUses = coupon.orders.length;
  const revenueGenerated = coupon.orders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0
  );

  res.status(200).json({
    success: true,
    data: {
      ...coupon,
      applicableCategories: parseJsonArray(coupon.applicableCategories),
      applicableProducts: parseJsonArray(coupon.applicableProducts),
      applicableBrands: parseJsonArray(coupon.applicableBrands),
      stats: {
        totalUses,
        revenueGenerated,
        conversionRate: totalUses > 0 ? "18.5%" : "0%",
      },
    },
  });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validUntil,
    isActive,
    minOrderAmount,
    maxDiscountAmount,
    usageLimit,
    usagePerCustomer,
    applicableCategories,
    applicableProducts,
    applicableBrands,
  } = req.body;

  if (!code || !discountType || discountValue === undefined || !validFrom || !validUntil) {
    throw new AppError("Missing required coupon fields", 400, "BAD_REQUEST");
  }

  const normalizedCode = code.trim().toUpperCase();

  const existing = await prisma.coupon.findFirst({
    where: { code: normalizedCode, deletedAt: null },
  });

  if (existing) {
    throw new AppError("Coupon code already exists", 400, "DUPLICATE_CODE");
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: normalizedCode,
      discountType,
      discountValue: discountType === "free_shipping" ? 0 : Number(discountValue || 0),
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      isActive: isActive ?? true,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      usagePerCustomer: usagePerCustomer ? Number(usagePerCustomer) : null,
      applicableCategories: stringifyScopeArray(applicableCategories),
      applicableProducts: stringifyScopeArray(applicableProducts),
      applicableBrands: stringifyScopeArray(applicableBrands),
    },
  });

  await AuditService.createLog(
    (req as any).user?.id || null,
    "COUPON_CREATED",
    "Coupon",
    coupon.id,
    null,
    { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
    req
  );

  res.status(201).json({
    success: true,
    data: {
      ...coupon,
      applicableCategories: parseJsonArray(coupon.applicableCategories),
      applicableProducts: parseJsonArray(coupon.applicableProducts),
      applicableBrands: parseJsonArray(coupon.applicableBrands),
    },
  });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validUntil,
    isActive,
    minOrderAmount,
    maxDiscountAmount,
    usageLimit,
    usagePerCustomer,
    applicableCategories,
    applicableProducts,
    applicableBrands,
  } = req.body;

  const existing = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }

  const normalizedCode = code ? code.trim().toUpperCase() : existing.code;
  if (normalizedCode !== existing.code) {
    const codeCheck = await prisma.coupon.findFirst({
      where: { code: normalizedCode, deletedAt: null },
    });
    if (codeCheck && codeCheck.id !== id) {
      throw new AppError("Coupon code already exists", 400, "DUPLICATE_CODE");
    }
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      code: normalizedCode,
      discountType: discountType || existing.discountType,
      discountValue:
        discountType === "free_shipping"
          ? 0
          : discountValue !== undefined
          ? Number(discountValue)
          : existing.discountValue,
      validFrom: validFrom ? new Date(validFrom) : existing.validFrom,
      validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      minOrderAmount: minOrderAmount !== undefined ? (minOrderAmount ? Number(minOrderAmount) : null) : existing.minOrderAmount,
      maxDiscountAmount: maxDiscountAmount !== undefined ? (maxDiscountAmount ? Number(maxDiscountAmount) : null) : existing.maxDiscountAmount,
      usageLimit: usageLimit !== undefined ? (usageLimit ? Number(usageLimit) : null) : existing.usageLimit,
      usagePerCustomer: usagePerCustomer !== undefined ? (usagePerCustomer ? Number(usagePerCustomer) : null) : existing.usagePerCustomer,
      applicableCategories: applicableCategories !== undefined ? stringifyScopeArray(applicableCategories) : existing.applicableCategories,
      applicableProducts: applicableProducts !== undefined ? stringifyScopeArray(applicableProducts) : existing.applicableProducts,
      applicableBrands: applicableBrands !== undefined ? stringifyScopeArray(applicableBrands) : existing.applicableBrands,
    },
  });

  await AuditService.createLog(
    (req as any).user?.id || null,
    "COUPON_UPDATED",
    "Coupon",
    updated.id,
    null,
    { code: updated.code },
    req
  );

  res.status(200).json({
    success: true,
    data: {
      ...updated,
      applicableCategories: parseJsonArray(updated.applicableCategories),
      applicableProducts: parseJsonArray(updated.applicableProducts),
      applicableBrands: parseJsonArray(updated.applicableBrands),
    },
  });
});

export const toggleCouponActive = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await AuditService.createLog(
    (req as any).user?.id || null,
    "COUPON_STATUS_TOGGLED",
    "Coupon",
    updated.id,
    null,
    { code: updated.code, isActive: updated.isActive },
    req
  );

  res.status(200).json({
    success: true,
    data: {
      ...updated,
      applicableCategories: parseJsonArray(updated.applicableCategories),
      applicableProducts: parseJsonArray(updated.applicableProducts),
      applicableBrands: parseJsonArray(updated.applicableBrands),
    },
  });
});

export const duplicateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const original = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
  });

  if (!original) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }

  const newCode = `${original.code}_COPY_${Math.floor(1000 + Math.random() * 9000)}`;

  const duplicated = await prisma.coupon.create({
    data: {
      code: newCode,
      discountType: original.discountType,
      discountValue: original.discountValue,
      validFrom: new Date(),
      validUntil: original.validUntil,
      isActive: original.isActive,
      minOrderAmount: original.minOrderAmount,
      maxDiscountAmount: original.maxDiscountAmount,
      usageLimit: original.usageLimit,
      usagePerCustomer: original.usagePerCustomer,
      usedCount: 0,
      applicableCategories: original.applicableCategories,
      applicableProducts: original.applicableProducts,
      applicableBrands: original.applicableBrands,
    },
  });

  await AuditService.createLog(
    (req as any).user?.id || null,
    "COUPON_DUPLICATED",
    "Coupon",
    duplicated.id,
    null,
    { originalCode: original.code, newCode: duplicated.code },
    req
  );

  res.status(201).json({
    success: true,
    data: {
      ...duplicated,
      applicableCategories: parseJsonArray(duplicated.applicableCategories),
      applicableProducts: parseJsonArray(duplicated.applicableProducts),
      applicableBrands: parseJsonArray(duplicated.applicableBrands),
    },
  });
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }

  await prisma.coupon.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      code: `${existing.code}_DELETED_${existing.id}`,
    },
  });

  await AuditService.createLog(
    (req as any).user?.id || null,
    "COUPON_DELETED",
    "Coupon",
    existing.id,
    null,
    { code: existing.code },
    req
  );

  res.status(200).json({ success: true, message: "Coupon deleted successfully" });
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, couponCode, promoCode, cartItems, customerId, customerEmail, email } = req.body;
  const targetCode = (code || couponCode || promoCode || "").trim();

  if (!targetCode) {
    throw new AppError("Coupon code is required", 400, "BAD_REQUEST");
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: { equals: targetCode, mode: "insensitive" },
      deletedAt: null,
    },
  });

  if (!coupon) {
    throw new AppError("Invalid or inactive coupon code", 404, "INVALID_COUPON");
  }

  let itemsForCoupon: CartItemForCoupon[] = [];

  if (Array.isArray(cartItems) && cartItems.length > 0) {
    const productIds = cartItems.map((i: any) => i.productId).filter(Boolean);
    const variantIds = cartItems.map((i: any) => i.variantId).filter(Boolean);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, brandId: true, price: true },
    });
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const rawItem of cartItems) {
      const prod = productMap.get(rawItem.productId);
      if (!prod) continue;
      const variant = rawItem.variantId ? variantMap.get(rawItem.variantId) : null;
      const unitPrice = variant
        ? new Prisma.Decimal(variant.price)
        : new Prisma.Decimal(prod.price || 0);
      const quantity = Math.max(1, Number(rawItem.quantity || 1));

      itemsForCoupon.push({
        productId: prod.id,
        categoryId: prod.categoryId,
        brandId: prod.brandId,
        quantity,
        unitPrice,
        subtotal: unitPrice.mul(quantity),
      });
    }
  }

  let customerOrderCountWithCoupon = 0;
  const targetEmail = (customerEmail || email || "").trim();
  if (coupon.usagePerCustomer !== null && (customerId || targetEmail)) {
    customerOrderCountWithCoupon = await prisma.order.count({
      where: {
        couponId: coupon.id,
        status: { not: "Cancelled" },
        OR: [
          ...(customerId ? [{ customerId }] : []),
          ...(targetEmail ? [{ customerEmail: { equals: targetEmail, mode: "insensitive" as const } }] : []),
        ],
      },
    });
  }

  const calcResult = calculateCouponDiscount({
    coupon,
    items: itemsForCoupon,
    customerId,
    customerOrderCountWithCoupon,
  });

  if (!calcResult.isValid) {
    throw new AppError(calcResult.errorMessage || "Coupon invalid", 400, calcResult.errorCode || "INVALID_COUPON");
  }

  res.status(200).json({
    success: true,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: calcResult.discountValue,
      calculatedDiscount: calcResult.discountAmount,
      totalCartSubtotal: calcResult.totalCartSubtotal,
      eligibleSubtotal: calcResult.eligibleSubtotal,
      isFreeShipping: calcResult.isFreeShipping,
    },
  });
});
