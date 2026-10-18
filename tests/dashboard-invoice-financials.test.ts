import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardInvoiceFinancials } from "../src/lib/dashboard-invoice-financials.ts";

test("dashboard metrics exclude drafts and use balances after payments and refunds", () => {
  const metrics = buildDashboardInvoiceFinancials(
    [
      { id: "sent-invoice", status: "Sent", total_base: 1000 },
      { id: "proposal-draft", status: "Draft", total_base: 0 },
      { id: "quote-draft", status: "Draft", total_base: 10 },
      { id: "cancelled-invoice", status: "Cancelled", total_base: 50 },
    ],
    [
      {
        invoice_id: "sent-invoice",
        status: "Sent",
        finance_status: "Partial",
        balance_due: 870,
        paid_amount_base: 130,
        balance_due_base: 870,
      },
      {
        invoice_id: "proposal-draft",
        status: "Draft",
        finance_status: "Draft",
        balance_due: 0,
        paid_amount_base: 0,
        balance_due_base: 0,
      },
      {
        invoice_id: "quote-draft",
        status: "Draft",
        finance_status: "Draft",
        balance_due: 10,
        paid_amount_base: 0,
        balance_due_base: 10,
      },
      {
        invoice_id: "cancelled-invoice",
        status: "Cancelled",
        finance_status: "Cancelled",
        balance_due: 50,
        paid_amount_base: 0,
        balance_due_base: 50,
      },
    ],
  );

  assert.equal(metrics.receivableTotalBase, 870);
  assert.equal(metrics.collectedTotalBase, 130);
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.issuedCount, 1);
  assert.equal(metrics.partiallyPaidCount, 1);
  assert.equal(metrics.paidCount, 0);
  assert.deepEqual(
    metrics.pendingInvoices.map((invoice) => [invoice.id, invoice.total, invoice.total_base]),
    [["sent-invoice", 870, 870]],
  );
});
