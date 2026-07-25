export type CurrencyCode = "USD" | "DOP";

export type CompanyCurrencySettings = {
  baseCurrency: CurrencyCode;
  usdToDopRate: number;
  rateSource: "manual";
  rateUpdatedAt: string | null;
};

export const DEFAULT_COMPANY_CURRENCY_SETTINGS: CompanyCurrencySettings = {
  baseCurrency: "USD",
  usdToDopRate: 60,
  rateSource: "manual",
  rateUpdatedAt: null,
};

export const CURRENCY_OPTIONS: Array<{
  value: CurrencyCode;
  symbol: string;
  label: string;
  decimals: number;
  step: string;
}> = [
  { value: "DOP", symbol: "RD$", label: "Peso dominicano", decimals: 0, step: "1" },
  { value: "USD", symbol: "US$", label: "Dólares", decimals: 2, step: "0.01" },
];

export function normalizeCurrency(currency: string | null | undefined): CurrencyCode {
  return String(currency || "USD").toUpperCase() === "DOP" ? "DOP" : "USD";
}

export function getCurrencyMeta(currency: string | null | undefined) {
  const normalized = normalizeCurrency(currency);
  return CURRENCY_OPTIONS.find((option) => option.value === normalized) || CURRENCY_OPTIONS[1];
}

export function getCurrencyDecimals(currency: string | null | undefined) {
  return getCurrencyMeta(currency).decimals;
}

export function getCurrencyStep(currency: string | null | undefined) {
  return getCurrencyMeta(currency).step;
}

export function getCurrencyInputMode(currency: string | null | undefined): "numeric" | "decimal" {
  return normalizeCurrency(currency) === "DOP" ? "numeric" : "decimal";
}

export function normalizeCurrencyAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined,
) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return normalizeCurrency(currency) === "DOP"
    ? Math.round(number)
    : Math.round(number * 100) / 100;
}

export function normalizeCurrencyInput(value: string, currency: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const normalized = normalizeCurrencyAmount(trimmed, currency);
  return normalizeCurrency(currency) === "DOP"
    ? String(Math.round(normalized))
    : String(normalized);
}

export function formatCurrencyAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  locale = "es-DO",
) {
  const meta = getCurrencyMeta(currency);
  const number = Number(value || 0);
  const safeNumber = Number.isFinite(number) ? number : 0;
  return `${meta.symbol} ${safeNumber.toLocaleString(locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })}`;
}

export function convertCurrencyAmount(
  value: number | string | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  usdToDopRate: number | string | null | undefined,
) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;

  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return normalizeCurrencyAmount(amount, to);

  const rate = Number(usdToDopRate || DEFAULT_COMPANY_CURRENCY_SETTINGS.usdToDopRate);
  const safeRate =
    Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_COMPANY_CURRENCY_SETTINGS.usdToDopRate;

  const converted = from === "USD" && to === "DOP" ? amount * safeRate : amount / safeRate;
  return normalizeCurrencyAmount(converted, to);
}

export function convertToBaseCurrency(
  value: number | string | null | undefined,
  fromCurrency: string | null | undefined,
  settings: CompanyCurrencySettings = DEFAULT_COMPANY_CURRENCY_SETTINGS,
) {
  return convertCurrencyAmount(value, fromCurrency, settings.baseCurrency, settings.usdToDopRate);
}
