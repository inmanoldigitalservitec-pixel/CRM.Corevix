import assert from "node:assert/strict";
import test from "node:test";
import { isInvoiceEligibleForOnlinePayment } from "../src/lib/payments/invoice-payment-eligibility.ts";

test("only issued, unpaid invoices can accept online payments", () => {
  for (const status of ["Sent", "Overdue", " sent ", " OVERDUE "]) {
    assert.equal(isInvoiceEligibleForOnlinePayment(status), true, `${status} should be eligible`);
  }

  for (const status of ["Draft", "Paid", "Cancelled", "Canceled", "Void", "Partial", null, ""]) {
    assert.equal(isInvoiceEligibleForOnlinePayment(status), false, `${status} should be blocked`);
  }
});
