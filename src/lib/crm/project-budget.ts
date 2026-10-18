import { convertCurrencyAmount, normalizeCurrency, type CurrencyCode } from "../currency.ts";

export type SaleBudgetSource = {
  value: number | null | undefined;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | string | null;
  value_base?: number | string | null;
};

export type ProjectBudgetFields = {
  budget: number;
  budget_currency: CurrencyCode;
  base_currency: CurrencyCode;
  exchange_rate: number;
  budget_base: number;
};

export function projectBudgetFromSale(
  sale: SaleBudgetSource,
  companyBaseCurrency: CurrencyCode,
  companyExchangeRate: number,
  productCurrency?: string | null,
): ProjectBudgetFields {
  const budgetCurrency = normalizeCurrency(sale.currency || productCurrency || companyBaseCurrency);
  const baseCurrency = normalizeCurrency(sale.base_currency || companyBaseCurrency);
  const recordedRate = Number(sale.exchange_rate);
  const exchangeRate =
    Number.isFinite(recordedRate) && recordedRate > 0 ? recordedRate : companyExchangeRate;
  const budget = Number(sale.value || 0);
  const storedBase = sale.value_base == null ? Number.NaN : Number(sale.value_base);

  return {
    budget,
    budget_currency: budgetCurrency,
    base_currency: baseCurrency,
    exchange_rate: exchangeRate,
    budget_base: Number.isFinite(storedBase)
      ? storedBase
      : convertCurrencyAmount(budget, budgetCurrency, baseCurrency, exchangeRate),
  };
}
