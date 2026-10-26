export type EstimateDiscountType = "none" | "fixed" | "percent";

function finiteNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeAmount(value: number, currency: string) {
  const decimals = estimateCurrencyScale(currency);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Returns the effective discount in document currency. Fixed discounts are
 * capped at the gross amount so the UI and estimate-to-invoice RPC agree.
 */
export function calculateEstimateDiscountAmount(
  subtotal: number,
  taxTotal: number,
  discountType: string,
  discountValue: unknown,
  currency: string,
) {
  const safeSubtotal = Math.max(0, finiteNumber(subtotal));
  const safeTax = Math.max(0, finiteNumber(taxTotal));
  const rawValue = Math.max(0, finiteNumber(discountValue));
  const gross = safeSubtotal + safeTax;
  const amount =
    discountType === "percent"
      ? safeSubtotal * (Math.min(rawValue, 100) / 100)
      : discountType === "fixed"
        ? Math.min(rawValue, gross)
        : 0;

  return normalizeAmount(amount, currency);
}

/** Clamp and normalize the value stored in estimates.discount_value. */
export function normalizeEstimateDiscountValue(
  subtotal: number,
  taxTotal: number,
  discountType: string,
  discountValue: unknown,
  currency: string,
) {
  if (discountType === "percent") return Math.min(100, Math.max(0, finiteNumber(discountValue)));
  if (discountType === "fixed") {
    return calculateEstimateDiscountAmount(subtotal, taxTotal, "fixed", discountValue, currency);
  }
  return 0;
}

export function estimateCurrencyScale(currency: string | null | undefined) {
  return String(currency || "USD").toUpperCase() === "DOP" ? 0 : 2;
}
