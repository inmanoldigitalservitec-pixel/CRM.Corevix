import { isClient360FinancialInvoiceStatus } from "../client360-invoice-financials.ts";

export type InvoiceReportRow = {
  status?: unknown;
  finance_status?: unknown;
};

/** Draft and cancelled invoices are not issued revenue and stay out of report data. */
export function filterIssuedInvoiceReportRows<Row extends InvoiceReportRow>(
  rows: readonly Row[],
): Row[] {
  return rows.filter((row) => isClient360FinancialInvoiceStatus(row.status ?? row.finance_status));
}
