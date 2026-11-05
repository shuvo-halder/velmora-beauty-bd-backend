import { Prisma } from "@prisma/client";

export interface TaxSettingInput {
  defaultTaxRate?: number | Prisma.Decimal | null;
  taxRate?: number | Prisma.Decimal | null;
  pricesIncludeTax?: boolean | null;
  taxEnabled?: boolean | null;
  enableTax?: boolean | null;
}

export interface TaxCalculationParams {
  netSubtotal: Prisma.Decimal | number;
  taxSetting?: TaxSettingInput | null;
}

export interface TaxCalculationResult {
  taxAmount: Prisma.Decimal;
  taxRate: number;
  taxRateDecimal: Prisma.Decimal;
  pricesIncludeTax: boolean;
  taxEnabled: boolean;
  effectiveTaxableAmount: Prisma.Decimal;
}

/**
 * Server-authoritative tax calculation engine.
 *
 * Rules:
 * - If tax is disabled (`taxEnabled === false`) or defaultTaxRate <= 0, taxAmount = 0.
 * - If prices EXCLUDE tax (`pricesIncludeTax === false`):
 *   taxAmount = netSubtotal * (taxRate / 100), rounded to 2 decimal places.
 *   grandTotal = netSubtotal + shipping + taxAmount.
 * - If prices INCLUDE tax (`pricesIncludeTax === true`):
 *   embedded tax = netSubtotal * (taxRate / (100 + taxRate)), rounded to 2 decimal places.
 *   grandTotal = netSubtotal + shipping (tax is already included in netSubtotal).
 *
 * All calculations use Decimal and normalize outputs to 2 decimal places.
 */
export function calculateTax(params: TaxCalculationParams): TaxCalculationResult {
  const { netSubtotal, taxSetting } = params;

  const rawSubtotal = netSubtotal instanceof Prisma.Decimal
    ? netSubtotal
    : new Prisma.Decimal(netSubtotal || 0);

  const normalizedSubtotal = Prisma.Decimal.max(0, rawSubtotal);

  const taxEnabled = Boolean(taxSetting?.taxEnabled ?? taxSetting?.enableTax ?? true);
  const pricesIncludeTax = Boolean(taxSetting?.pricesIncludeTax ?? false);

  const rawTaxRate = taxSetting?.defaultTaxRate ?? taxSetting?.taxRate ?? 0;
  const taxRateVal = typeof rawTaxRate === "number"
    ? rawTaxRate
    : Number(rawTaxRate || 0);

  const taxRate = Math.max(0, taxRateVal);

  if (!taxEnabled || taxRate === 0) {
    return {
      taxAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
      taxRate: 0,
      taxRateDecimal: new Prisma.Decimal(0),
      pricesIncludeTax,
      taxEnabled,
      effectiveTaxableAmount: normalizedSubtotal.toDecimalPlaces(2),
    };
  }

  const taxRateDecimal = new Prisma.Decimal(taxRate).div(100);

  if (pricesIncludeTax) {
    // Formula for price-inclusive tax:
    // Tax = Subtotal * (taxRate / (100 + taxRate))
    const rateFactor = new Prisma.Decimal(100).add(new Prisma.Decimal(taxRate));
    const taxAmount = normalizedSubtotal
      .mul(new Prisma.Decimal(taxRate))
      .div(rateFactor)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const effectiveTaxableAmount = normalizedSubtotal.sub(taxAmount).toDecimalPlaces(2);

    return {
      taxAmount,
      taxRate,
      taxRateDecimal,
      pricesIncludeTax: true,
      taxEnabled: true,
      effectiveTaxableAmount,
    };
  } else {
    // Formula for price-exclusive tax:
    // Tax = Subtotal * (taxRate / 100)
    const taxAmount = normalizedSubtotal
      .mul(taxRateDecimal)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
      taxAmount,
      taxRate,
      taxRateDecimal,
      pricesIncludeTax: false,
      taxEnabled: true,
      effectiveTaxableAmount: normalizedSubtotal.toDecimalPlaces(2),
    };
  }
}
