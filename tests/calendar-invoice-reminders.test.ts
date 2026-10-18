import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendarItems } from "../src/lib/crm/calendar-items.ts";
import { isOpenInvoiceStatus } from "../src/lib/crm/status.ts";

test("calendar reminders include issued invoices and exclude draft or cancelled invoices", () => {
  const items = buildCalendarItems({
    invoices: [
      { id: "sent", number: "INV-SENT", status: "Sent", due_date: "2026-10-20" },
      { id: "overdue", number: "INV-OVERDUE", status: "Overdue", due_date: "2026-10-15" },
      { id: "draft", number: "INV-DRAFT", status: "Draft", due_date: "2026-10-20" },
      { id: "cancelled", number: "INV-CANCELLED", status: "Cancelled", due_date: "2026-10-20" },
    ],
  });

  assert.deepEqual(
    items.filter((item) => item.source === "invoice").map((item) => item.relatedId),
    ["sent", "overdue"],
  );
});

test("Dashboard invoice reminder eligibility excludes Draft and closed invoices", () => {
  assert.equal(isOpenInvoiceStatus("Sent"), true);
  assert.equal(isOpenInvoiceStatus("Overdue"), true);
  assert.equal(isOpenInvoiceStatus("Partially Paid"), true);
  assert.equal(isOpenInvoiceStatus("Draft"), false);
  assert.equal(isOpenInvoiceStatus("Paid"), false);
  assert.equal(isOpenInvoiceStatus("Cancelled"), false);
  assert.equal(isOpenInvoiceStatus("Void"), false);
});
