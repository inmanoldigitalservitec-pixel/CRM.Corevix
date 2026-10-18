/** Invoice statuses that represent an issued document and can affect Client 360 balances. */
export function isClient360FinancialInvoiceStatus(status: unknown): boolean {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return normalized !== "draft" && normalized !== "cancelled";
}

/** Draft and cancelled documents cannot accept payments in Client 360. */
export function canRegisterClient360InvoicePayment(status: unknown): boolean {
  return isClient360FinancialInvoiceStatus(status);
}

/** Keep drafts available for display while selecting only issued invoices for calculations. */
export function getClient360FinancialInvoices<T extends { status?: unknown }>(
  invoices: readonly T[],
): T[] {
  return invoices.filter((invoice) => isClient360FinancialInvoiceStatus(invoice.status));
}
