export const normalizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;

  // Strip all non-digit characters (including spaces, dashes, plus signs)
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;

  // Normalize BD numbers: 
  // If user enters 01XXXXXXXXX, prepend 88
  if (digits.length === 11 && digits.startsWith("01")) {
    digits = "88" + digits;
  }
  
  // If user enters 8801XXXXXXXXX, keep it
  if (digits.length === 13 && digits.startsWith("8801")) {
    // Validate BD mobile operator prefixes (013, 014, 015, 016, 017, 018, 019)
    const operator = digits.substring(4, 5);
    if (["3", "4", "5", "6", "7", "8", "9"].includes(operator)) {
      return "+" + digits;
    }
  }

  // Return null for invalid/unsupported numbers
  return null;
};
