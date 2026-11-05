export const CURRENCY_CODE = "BDT";
export const CURRENCY_SYMBOL = "৳";

export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") return `${CURRENCY_SYMBOL}0.00`;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${CURRENCY_SYMBOL}0.00`;
  // Using toLocaleString with en-US ensures consistent formatting like ৳1,250.00
  // but we can just use toFixed(2) to match existing behavior which was .toFixed(2)
  return `${CURRENCY_SYMBOL}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
