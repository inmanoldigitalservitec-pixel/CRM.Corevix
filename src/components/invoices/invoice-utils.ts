import { isPaidInvoiceStatus, normalizeStatus } from "@/lib/crm/status";

export type InvoiceOperationalFilter = "all" | "pending" | "overdue" | "paid" | "draft";
export type InvoiceDueFilter = "all" | "today" | "week" | "month" | "overdue";
export type InvoiceAmountFilter = "all" | "lt1000" | "1000_5000" | "5000_10000" | "gte10000";

type InvoiceLike = {
  status: string;
  due_date?: string | null;
  total?: number | null;
  invoice_data?: Record<string, unknown> | null;
};

type CurrencyContext = {
  productCurrency?: string | null;
  proposalCurrency?: string | null;
};

export function normalizeInvoiceStatus(status?: string | null) {
  return normalizeStatus(status);
}

export function isInvoicePaid(invoice: InvoiceLike) {
  return isPaidInvoiceStatus(invoice.status);
}

export function isInvoiceDraft(invoice: InvoiceLike) {
  return normalizeInvoiceStatus(invoice.status) === "draft";
}

export function isInvoiceCancelled(invoice: InvoiceLike) {
  const status = normalizeInvoiceStatus(invoice.status);
  return status === "cancelled" || status === "canceled";
}

export function isInvoicePending(invoice: InvoiceLike) {
  const status = normalizeInvoiceStatus(invoice.status);
  return ["sent", "pending", "open", "overdue"].includes(status) && !isInvoicePaid(invoice);
}

export function isInvoiceOverdue(invoice: InvoiceLike, todayIso = isoToday()) {
  return Boolean(invoice.due_date && invoice.due_date < todayIso && !isInvoicePaid(invoice));
}

export function getInvoiceOperationalStatus(invoice: InvoiceLike, todayIso = isoToday()) {
  if (isInvoicePaid(invoice)) return "paid";
  if (isInvoiceDraft(invoice)) return "draft";
  if (isInvoiceOverdue(invoice, todayIso)) return "overdue";
  if (isInvoicePending(invoice)) return "pending";
  if (isInvoiceCancelled(invoice)) return "cancelled";
  return "other";
}

export function getInvoiceCurrency(invoice: InvoiceLike, context: CurrencyContext = {}) {
  const invoiceCurrency =
    invoice.invoice_data && typeof invoice.invoice_data === "object"
      ? String(invoice.invoice_data.currency || "").trim()
      : "";
  return invoiceCurrency || context.productCurrency || context.proposalCurrency || "USD";
}

export function formatInvoiceMoney(
  amount: number | null | undefined,
  currency = "USD",
  locale = "es-DO",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function formatInvoiceDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function formatInvoiceDueDate(value?: string | null, todayIso = isoToday()) {
  if (!value) return "Sin vencimiento";
  const date = parseLocalDate(value);
  const today = parseLocalDate(todayIso);
  if (!date || !today) return value;
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Vence mañana";
  if (diffDays > 1 && diffDays <= 7) return `Vence en ${diffDays} días`;
  if (diffDays === -1) return "Venció ayer";
  if (diffDays < -1 && diffDays >= -7) return `Venció hace ${Math.abs(diffDays)} días`;
  return formatInvoiceDate(value);
}

export function getInvoicePrimaryAction(invoice: InvoiceLike, hasKnownProject = false) {
  const status = getInvoiceOperationalStatus(invoice);
  if (status === "paid" && hasKnownProject) return "Ver proyecto";
  if (status === "draft") return "Revisar";
  if (status === "pending") return "Ver detalle";
  if (status === "overdue") return "Ver detalle";
  return "Ver detalle";
}

export function getInvoiceBalance(invoice: InvoiceLike) {
  return isInvoicePaid(invoice) ? 0 : Number(invoice.total || 0);
}

export function matchesOperationalFilter(
  invoice: InvoiceLike,
  filter: InvoiceOperationalFilter,
  todayIso = isoToday(),
) {
  if (filter === "all") return true;
  if (filter === "pending") return isInvoicePending(invoice);
  if (filter === "overdue") return isInvoiceOverdue(invoice, todayIso);
  if (filter === "paid") return isInvoicePaid(invoice);
  if (filter === "draft") return isInvoiceDraft(invoice);
  return true;
}

export function matchesDueFilter(
  invoice: InvoiceLike,
  filter: InvoiceDueFilter,
  todayIso = isoToday(),
) {
  if (filter === "all") return true;
  if (!invoice.due_date) return false;
  if (filter === "overdue") return isInvoiceOverdue(invoice, todayIso);
  const due = parseLocalDate(invoice.due_date);
  const today = parseLocalDate(todayIso);
  if (!due || !today) return false;
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (filter === "today") return diffDays === 0;
  if (filter === "week") return diffDays >= 0 && diffDays <= 7;
  if (filter === "month") return diffDays >= 0 && diffDays <= 31;
  return true;
}

export function matchesAmountFilter(invoice: InvoiceLike, filter: InvoiceAmountFilter) {
  const total = Number(invoice.total || 0);
  if (filter === "all") return true;
  if (filter === "lt1000") return total < 1000;
  if (filter === "1000_5000") return total >= 1000 && total < 5000;
  if (filter === "5000_10000") return total >= 5000 && total < 10000;
  if (filter === "gte10000") return total >= 10000;
  return true;
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
