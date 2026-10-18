import assert from "node:assert/strict";
import test from "node:test";
import {
  canRegisterClient360InvoicePayment,
  getClient360FinancialInvoices,
} from "../src/lib/client360-invoice-financials.ts";

test("draft invoices remain visible but are excluded from Client 360 financial movements", () => {
  const invoices = [
    { id: "draft", status: "Draft", total: 1200 },
    { id: "sent", status: "Sent", total: 800 },
    { id: "paid", status: "Paid", total: 400 },
    { id: "cancelled", status: "Cancelled", total: 300 },
  ];

  const financialInvoices = getClient360FinancialInvoices(invoices);

  // The source collection is still the invoice list rendered in Client 360.
  assert.deepEqual(
    invoices.map(({ id, total }) => [id, total]),
    [
      ["draft", 1200],
      ["sent", 800],
      ["paid", 400],
      ["cancelled", 300],
    ],
  );
  // Both invoiced totals and statement debits consume this filtered collection.
  assert.deepEqual(
    financialInvoices.map(({ id }) => id),
    ["sent", "paid"],
  );
  assert.equal(
    financialInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    1200,
  );
  assert.equal(
    financialInvoices.some((invoice) => invoice.status.toLowerCase() === "draft"),
    false,
  );
});

test("status matching is case- and whitespace-insensitive", () => {
  const invoices = [
    { id: "draft-lowercase", status: " draft " },
    { id: "cancelled-lowercase", status: "cancelled" },
    { id: "overdue", status: "Overdue" },
  ];

  assert.deepEqual(
    getClient360FinancialInvoices(invoices).map(({ id }) => id),
    ["overdue"],
  );
});

test("Client 360 hides payment registration for draft and cancelled invoices", () => {
  assert.equal(canRegisterClient360InvoicePayment("Draft"), false);
  assert.equal(canRegisterClient360InvoicePayment(" draft "), false);
  assert.equal(canRegisterClient360InvoicePayment("Cancelled"), false);
  assert.equal(canRegisterClient360InvoicePayment("Sent"), true);
  assert.equal(canRegisterClient360InvoicePayment("Overdue"), true);
});
