/** A blank rate is unpriced; a numeric zero is free only when a price was entered. */
export function hasExplicitPrice(value: unknown, priceSpecified?: boolean): boolean {
  if (priceSpecified !== undefined) return priceSpecified;
  if (value === null || value === undefined || String(value).trim() === "") return false;
  return Number.isFinite(Number(value));
}

export function isExplicitZeroPrice(value: unknown, priceSpecified?: boolean): boolean {
  if (!hasExplicitPrice(value, priceSpecified)) return false;
  const amount = Number(value);
  return amount === 0;
}

export function resolveProposalItemPricing(
  item: Record<string, unknown>,
  serializedItem?: Record<string, unknown> | null,
) {
  const serializedHasRate = serializedItem?.rate !== undefined;
  const rate = serializedHasRate
    ? serializedItem?.rate
    : (item.rate ?? item.converted_rate);
  const explicitFlag = serializedItem?.priceSpecified;
  const hasPrice =
    typeof explicitFlag === "boolean"
      ? explicitFlag
      : hasExplicitPrice(rate) && Number(rate) !== 0;

  return {
    rate,
    hasPrice,
    isFree: isExplicitZeroPrice(rate, hasPrice),
    label: isExplicitZeroPrice(rate, hasPrice)
      ? "Sin costo"
      : hasPrice
        ? null
        : "Tarifa pendiente",
  };
}
