import { Prisma } from "@prisma/client";

export interface CartItemForCoupon {
  productId: string;
  categoryId?: string | null;
  brandId?: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal | number | string;
  subtotal?: Prisma.Decimal | number | string;
}

export interface CouponModel {
  id: string;
  code: string;
  discountType: string; // "percentage", "fixed", "free_shipping"
  discountValue: Prisma.Decimal | number | string;
  validFrom: Date | string;
  validUntil: Date | string;
  isActive: boolean;
  deletedAt?: Date | string | null;
  minOrderAmount?: Prisma.Decimal | number | string | null;
  maxDiscountAmount?: Prisma.Decimal | number | string | null;
  usageLimit?: number | null;
  usagePerCustomer?: number | null;
  usedCount: number;
  applicableCategories?: string | null;
  applicableProducts?: string | null;
  applicableBrands?: string | null;
}

export interface CalculateCouponParams {
  coupon: CouponModel;
  items: CartItemForCoupon[];
  customerId?: string | null;
  customerOrderCountWithCoupon?: number;
  now?: Date;
}

export interface CouponCalculationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  couponId: string;
  code: string;
  discountType: string;
  discountValue: Prisma.Decimal;
  totalCartSubtotal: Prisma.Decimal;
  eligibleSubtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  isFreeShipping: boolean;
  eligibleItemCount: number;
}

export function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch {
        // Fallthrough to comma split
      }
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function isItemEligibleForCoupon(
  item: { productId: string; categoryId?: string | null; brandId?: string | null },
  coupon: {
    applicableProducts?: string | null;
    applicableCategories?: string | null;
    applicableBrands?: string | null;
  }
): boolean {
  const prodList = parseJsonArray(coupon.applicableProducts);
  const catList = parseJsonArray(coupon.applicableCategories);
  const brandList = parseJsonArray(coupon.applicableBrands);

  const hasProdRestriction = prodList.length > 0;
  const hasCatRestriction = catList.length > 0;
  const hasBrandRestriction = brandList.length > 0;

  // If no restrictions are defined at all, all items are eligible
  if (!hasProdRestriction && !hasCatRestriction && !hasBrandRestriction) {
    return true;
  }

  // If product restriction exists, item MUST match product restriction
  if (hasProdRestriction && !prodList.includes(item.productId)) {
    return false;
  }

  // If category restriction exists, item MUST match category restriction
  if (hasCatRestriction && (!item.categoryId || !catList.includes(item.categoryId))) {
    return false;
  }

  // If brand restriction exists, item MUST match brand restriction
  if (hasBrandRestriction && (!item.brandId || !brandList.includes(item.brandId))) {
    return false;
  }

  return true;
}

export function calculateCouponDiscount(params: CalculateCouponParams): CouponCalculationResult {
  const { coupon, items, customerId, customerOrderCountWithCoupon, now = new Date() } = params;

  const couponId = coupon.id;
  const code = coupon.code;
  const discountType = coupon.discountType;
  const discountValue = new Prisma.Decimal(coupon.discountValue || 0).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const isFreeShipping = discountType === "free_shipping";

  // Base invalid template
  const createInvalidResult = (errorCode: string, errorMessage: string): CouponCalculationResult => ({
    isValid: false,
    errorCode,
    errorMessage,
    couponId,
    code,
    discountType,
    discountValue,
    totalCartSubtotal: new Prisma.Decimal(0).toDecimalPlaces(2),
    eligibleSubtotal: new Prisma.Decimal(0).toDecimalPlaces(2),
    discountAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
    isFreeShipping,
    eligibleItemCount: 0,
  });

  // 1. Active & Deleted Check
  if (!coupon.isActive || coupon.deletedAt) {
    return createInvalidResult("INVALID_COUPON", "Coupon is invalid or inactive");
  }

  // 2. Date window check
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);
  if (now < validFrom || now > validUntil) {
    return createInvalidResult("EXPIRED_COUPON", "Coupon code is expired or not yet active");
  }

  // 3. Overall Usage limit check
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return createInvalidResult("LIMIT_REACHED", "Coupon usage limit has been reached");
  }

  // 4. Per-customer usage limit check (for authenticated customers and email-identified guests)
  if (coupon.usagePerCustomer !== null && coupon.usagePerCustomer !== undefined) {
    if (customerId || (customerOrderCountWithCoupon !== undefined && customerOrderCountWithCoupon > 0)) {
      const usageCount = customerOrderCountWithCoupon ?? 0;
      if (usageCount >= coupon.usagePerCustomer) {
        return createInvalidResult("CUSTOMER_LIMIT_REACHED", "You have reached the maximum usage limit for this coupon");
      }
    }
  }

  // 5. Compute total subtotal and eligible subtotal
  let totalCartSubtotal = new Prisma.Decimal(0);
  let eligibleSubtotal = new Prisma.Decimal(0);
  let eligibleItemCount = 0;

  for (const item of items) {
    const unitPrice = new Prisma.Decimal(item.unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const itemSubtotal = item.subtotal
      ? new Prisma.Decimal(item.subtotal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : unitPrice.mul(item.quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    totalCartSubtotal = totalCartSubtotal.add(itemSubtotal);

    if (isItemEligibleForCoupon(item, coupon)) {
      eligibleSubtotal = eligibleSubtotal.add(itemSubtotal);
      eligibleItemCount++;
    }
  }

  totalCartSubtotal = totalCartSubtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  eligibleSubtotal = eligibleSubtotal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  if (eligibleItemCount === 0 || eligibleSubtotal.lte(0)) {
    return createInvalidResult("NO_ELIGIBLE_ITEMS", "No eligible items in cart for this coupon");
  }

  // 6. Minimum order amount check
  if (coupon.minOrderAmount !== null && coupon.minOrderAmount !== undefined) {
    const minAmount = new Prisma.Decimal(coupon.minOrderAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (totalCartSubtotal.lt(minAmount)) {
      return createInvalidResult(
        "MIN_AMOUNT_NOT_MET",
        `Minimum order amount of BDT ${minAmount} is required to apply this coupon`
      );
    }
  }

  // 7. Calculate Discount Amount
  let discountAmount = new Prisma.Decimal(0);

  if (discountType === "percentage") {
    let calcDiscount = eligibleSubtotal.mul(discountValue).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
      const maxDiscount = new Prisma.Decimal(coupon.maxDiscountAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      calcDiscount = Prisma.Decimal.min(calcDiscount, maxDiscount);
    }
    discountAmount = Prisma.Decimal.min(calcDiscount, eligibleSubtotal);
  } else if (discountType === "fixed") {
    const fixedVal = discountValue.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    discountAmount = Prisma.Decimal.min(fixedVal, eligibleSubtotal);
  } else if (discountType === "free_shipping") {
    discountAmount = new Prisma.Decimal(0);
  }

  discountAmount = discountAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    isValid: true,
    couponId,
    code,
    discountType,
    discountValue,
    totalCartSubtotal,
    eligibleSubtotal,
    discountAmount,
    isFreeShipping,
    eligibleItemCount,
  };
}
