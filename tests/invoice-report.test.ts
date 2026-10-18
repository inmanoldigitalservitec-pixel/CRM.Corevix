import test from "node:test";
import assert from "node:assert/strict";
import { filterIssuedInvoiceReportRows } from "../src/lib/reports/invoice-report.ts";

test("invoice report rows exclude drafts and cancelled invoices from metrics and export", () => {
  const rows = [
    { id: "sent", number: "INV-SENT", status: "Sent", total_base: 1000 },
    { id: "overdue", number: "INV-OVERDUE", status: "Overdue", total_base: 500 },
    { id: "draft", number: "INV-DRAFT", status: "Draft", total_base: 10 },
    { id: "summary-draft", number: "INV-SUMMARY-DRAFT", finance_status: "Draft", total_base: 5 },
    { id: "cancelled", number: "INV-CANCELLED", status: "Cancelled", total_base: 50 },
  ];

  const reportRows = filterIssuedInvoiceReportRows(rows);

  assert.deepEqual(
    reportRows.map((row) => row.id),
    ["sent", "overdue"],
  );
  assert.equal(
    reportRows.reduce((total, row) => total + row.total_base, 0),
    1500,
  );
});
