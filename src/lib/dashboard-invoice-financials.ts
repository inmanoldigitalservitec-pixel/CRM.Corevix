import { isClient360FinancialInvoiceStatus } from "./client360-invoice-financials.ts";

export type DashboardInvoiceRow = {
  id: string;
  status: string;
  total_base?: number | string | null;
};

export type DashboardInvoiceFinancialRow = {
  invoice_id: string;
  status: string;
  finance_status?: string | null;
  balance_due: number | string | null;
  paid_amount_base: number | string | null;
  balance_due_base: number | string | null;
};

function amount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Dashboard collection metrics must follow issued invoice balances and net payments. */
export function buildDashboardInvoiceFinancials<Invoice extends DashboardInvoiceRow>(
  invoices: readonly Invoice[],
  financialRows: readonly DashboardInvoiceFinancialRow[],
) {
  const financialByInvoiceId = new Map(financialRows.map((row) => [row.invoice_id, row]));
  const issuedFinancialRows = financialRows.filter((row) =>
    isClient360FinancialInvoiceStatus(row.status),
  );
  const issuedInvoices = invoices.flatMap((invoice) => {
    const financial = financialByInvoiceId.get(invoice.id);
    if (!financial || !isClient360FinancialInvoiceStatus(financial.status)) return [];
    return [{ invoice, financial }];
  });

  const pendingInvoices = issuedInvoices.flatMap(({ invoice, financial }) => {
    const balanceDue = amount(financial.balance_due_base);
    if (balanceDue <= 0) return [];
    return [
      {
        ...invoice,
        status: financial.finance_status || financial.status,
        total: amount(financial.balance_due),
        total_base: balanceDue,
        finance_status: financial.finance_status || financial.status,
      },
    ];
  });

  return {
    pendingInvoices,
    issuedCount: issuedFinancialRows.length,
    pendingCount: issuedFinancialRows.filter((row) => amount(row.balance_due_base) > 0).length,
    partiallyPaidCount: issuedFinancialRows.filter(
      (row) => amount(row.paid_amount_base) > 0 && amount(row.balance_due_base) > 0,
    ).length,
    paidCount: issuedFinancialRows.filter(
      (row) => String(row.finance_status || row.status).toLowerCase() === "paid",
    ).length,
    receivableTotalBase: issuedFinancialRows.reduce(
      (sum, row) => sum + amount(row.balance_due_base),
      0,
    ),
    collectedTotalBase: issuedFinancialRows.reduce(
      (sum, row) => sum + amount(row.paid_amount_base),
      0,
    ),
  };
}
