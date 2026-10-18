/** Only invoices issued to a client can be paid through the public invoice page. */
export function isInvoiceEligibleForOnlinePayment(status?: string | null) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return normalized === "sent" || normalized === "overdue";
}
