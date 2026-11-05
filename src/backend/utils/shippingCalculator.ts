import { Prisma } from "@prisma/client";

export interface AddressInput {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  division?: string | null;
  postalCode?: string | null;
  country?: string | null;
  [key: string]: any;
}

export interface ShippingSettingInput {
  insideDhakaCharge?: number | Prisma.Decimal | null;
  outsideDhakaCharge?: number | Prisma.Decimal | null;
  freeShippingThreshold?: number | Prisma.Decimal | null;
  freeShippingEnabled?: boolean | null;
  enableFreeShipping?: boolean | null;
}

export interface CouponInput {
  discountType?: string | null;
  isFreeShipping?: boolean | null;
}

export interface ShippingCalculationParams {
  subtotal: Prisma.Decimal | number;
  shippingAddress?: AddressInput | null;
  appliedCoupon?: CouponInput | null;
  shippingSetting?: ShippingSettingInput | null;
}

export interface ShippingCalculationResult {
  shippingFee: Prisma.Decimal;
  baseShippingRate: Prisma.Decimal;
  deliveryZone: "INSIDE_DHAKA" | "OUTSIDE_DHAKA" | "UNKNOWN";
  isFreeShipping: boolean;
  freeShippingReason: "COUPON" | "THRESHOLD" | null;
  isAddressComplete: boolean;
}

const NON_DHAKA_DISTRICTS = new Set([
  "gazipur", "narayanganj", "savar", "dhamrai", "keraniganj",
  "chittagong", "chattogram", "sylhet", "rajshahi", "khulna",
  "barisal", "barishal", "rangpur", "comilla", "cumilla",
  "bogra", "bogura", "noakhali", "feni", "coxs bazar", "cox s bazar",
  "jessore", "jhashore", "mymensingh", "tangail", "manikganj",
  "narsingdi", "munshiganj", "faridpur", "gopalganj", "madaripur",
  "rajbari", "shariatpur", "kishorganj", "kishoreganj", "dinajpur",
  "rangamati", "bandarban", "khagrachhari", "kushtia", "pabna",
  "sirajganj", "naogaon", "nator", "natore", "chapainawabganj",
  "joypurhat", "gaibandha", "kurigram", "lalmonirhat", "nilphamari",
  "panchagarh", "thakurgaon", "habiganj", "moulvibazar", "sunamganj",
  "bagerhat", "chuadanga", "jhenaidah", "magura", "meherpur",
  "narail", "satkhira", "barguna", "bhola", "jhalokati",
  "patuakhali", "pirojpur", "brahmanbaria", "chandpur", "lakshmipur"
]);

const DHAKA_CANONICAL_TOKENS = new Set([
  "dhaka",
  "dhaka city",
  "dhaka north",
  "dhaka south",
  "dhaka district",
  "dhaka metro",
  "dhaka metropolitan",
  "dhaka sadar",
  "north dhaka",
  "south dhaka"
]);

function normalizeString(val?: string | null): string {
  if (!val) return "";
  return val
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Determines whether an address is Inside Dhaka, Outside Dhaka, or Incomplete/Unknown.
 * Strictly checks dedicated location fields (district, city, state, division)
 * to prevent false positives on street address lines (e.g. "Dhaka Road, Chittagong").
 */
export function determineDeliveryZone(address?: AddressInput | null): {
  zone: "INSIDE_DHAKA" | "OUTSIDE_DHAKA" | "UNKNOWN";
  isAddressComplete: boolean;
} {
  if (!address) {
    return { zone: "UNKNOWN", isAddressComplete: false };
  }

  const district = normalizeString(address.district);
  const city = normalizeString(address.city);
  const state = normalizeString(address.state || address.division);
  const address1 = normalizeString(address.address1 || address.address);

  // Check if address is incomplete (lacks both city/district and address line)
  const hasLocationInfo = Boolean(district || city || state);
  const hasStreetAddress = Boolean(address1);

  if (!hasLocationInfo && !hasStreetAddress) {
    return { zone: "UNKNOWN", isAddressComplete: false };
  }

  // 1. Check if district or city is an explicit non-Dhaka district/city
  if (NON_DHAKA_DISTRICTS.has(district) || NON_DHAKA_DISTRICTS.has(city)) {
    return { zone: "OUTSIDE_DHAKA", isAddressComplete: Boolean(hasLocationInfo && hasStreetAddress) };
  }

  // 2. Check if district or city equals canonical Dhaka district tokens
  if (DHAKA_CANONICAL_TOKENS.has(district) || DHAKA_CANONICAL_TOKENS.has(city)) {
    return { zone: "INSIDE_DHAKA", isAddressComplete: Boolean(hasLocationInfo && hasStreetAddress) };
  }

  // 3. If city/district is missing but state is "dhaka"
  // Since "dhaka division" includes non-Dhaka cities (e.g. Gazipur, Faridpur),
  // we do NOT default to cheaper inside-Dhaka rate without explicit city/district!
  if (state === "dhaka" && !city && !district) {
    return { zone: "OUTSIDE_DHAKA", isAddressComplete: false };
  }

  // 4. Default to OUTSIDE_DHAKA for any unknown/unrecognized outer district
  if (hasLocationInfo) {
    return { zone: "OUTSIDE_DHAKA", isAddressComplete: Boolean(hasLocationInfo && hasStreetAddress) };
  }

  return { zone: "UNKNOWN", isAddressComplete: false };
}

/**
 * Server-authoritative shipping fee calculation engine.
 * Rule:
 * - Free shipping threshold is evaluated against the gross cart item subtotal (`subtotal`).
 * - Coupon with `free_shipping` type or `isFreeShipping: true` waives shipping.
 * - Incomplete or unknown zone addresses default safely to `outsideDhakaCharge` to prevent undercharging.
 * - All monetary values return as 2-decimal normalized `Prisma.Decimal`.
 */
export function calculateShippingFee(params: ShippingCalculationParams): ShippingCalculationResult {
  const { subtotal, shippingAddress, appliedCoupon, shippingSetting } = params;

  const normalizedSubtotal = subtotal instanceof Prisma.Decimal 
    ? subtotal 
    : new Prisma.Decimal(subtotal || 0);

  // Default rates if settings not provided
  const insideDhakaCharge = new Prisma.Decimal(shippingSetting?.insideDhakaCharge ?? 60).toDecimalPlaces(2);
  const outsideDhakaCharge = new Prisma.Decimal(shippingSetting?.outsideDhakaCharge ?? 120).toDecimalPlaces(2);
  
  const freeShippingThresholdVal = shippingSetting?.freeShippingThreshold !== null && shippingSetting?.freeShippingThreshold !== undefined
    ? new Prisma.Decimal(shippingSetting.freeShippingThreshold)
    : new Prisma.Decimal(2000);

  const freeShippingEnabled = Boolean(
    shippingSetting?.freeShippingEnabled ?? shippingSetting?.enableFreeShipping ?? true
  );

  const { zone, isAddressComplete } = determineDeliveryZone(shippingAddress);

  // Determine base shipping rate based on delivery zone
  // Unknown zone / incomplete address defaults to outsideDhakaCharge (never silently undercharges)
  let baseShippingRate = zone === "INSIDE_DHAKA" ? insideDhakaCharge : outsideDhakaCharge;

  // Check 1: Free Shipping via Coupon
  const isFreeShippingCoupon = Boolean(
    appliedCoupon && (appliedCoupon.discountType === "free_shipping" || appliedCoupon.isFreeShipping === true)
  );

  // Check 2: Free Shipping via Order Subtotal Threshold
  const qualifiesForThreshold = freeShippingEnabled && 
    freeShippingThresholdVal !== null && 
    normalizedSubtotal.gte(freeShippingThresholdVal);

  if (isFreeShippingCoupon) {
    return {
      shippingFee: new Prisma.Decimal(0).toDecimalPlaces(2),
      baseShippingRate,
      deliveryZone: zone,
      isFreeShipping: true,
      freeShippingReason: "COUPON",
      isAddressComplete,
    };
  }

  if (qualifiesForThreshold) {
    return {
      shippingFee: new Prisma.Decimal(0).toDecimalPlaces(2),
      baseShippingRate,
      deliveryZone: zone,
      isFreeShipping: true,
      freeShippingReason: "THRESHOLD",
      isAddressComplete,
    };
  }

  return {
    shippingFee: baseShippingRate,
    baseShippingRate,
    deliveryZone: zone,
    isFreeShipping: false,
    freeShippingReason: null,
    isAddressComplete,
  };
}
