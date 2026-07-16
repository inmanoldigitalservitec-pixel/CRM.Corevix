import {
  isCancelledInvoiceStatus,
  isPaidInvoiceStatus,
  normalizeStatus,
} from "@/lib/crm/status";
export { compactIds, dedupeById } from "@/lib/projects/project-relations";

export type ProjectSalesProject = {
  id: string;
  company_id: string;
  client_id: string | null;
  product_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  budget: number | null;
  status: string;
  name: string;
};

export type ProjectContractRow = {
  id: string;
  contract_number: number | string | null;
  subject: string;
  status: string;
  contract_type: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  project_id: string | null;
  proposal_id: string | null;
  deal_id: string | null;
  signed_at: string | null;
  signature_status: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectProposalRow = {
  id: string;
  number: number | string | null;
  title: string;
  product_id: string | null;
  client_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  valid_until: string | null;
  description: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  public_token: string | null;
  viewed_at: string | null;
  approved_at: string | null;
};

export type ProjectInvoiceRow = {
  id: string;
  number: number | string | null;
  client_id: string | null;
  proposal_id: string | null;
  product_id: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  status: string;
  notes: string | null;
  date_issued: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  public_token: string | null;
  payment_link: string | null;
  paid_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
};

export type ProjectPaymentRow = {
  id: string;
  payment_number: number | string | null;
  reference: string | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number | null;
  payment_date: string | null;
  method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectExpenseRow = {
  id: string;
  title: string;
  vendor: string | null;
  category: string | null;
  amount: number | null;
  status: string;
  expense_date: string | null;
  project_id: string | null;
  client_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTimeEntryRow = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  entry_date: string;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectSalesData = {
  contracts: ProjectContractRow[];
  proposals: ProjectProposalRow[];
  invoices: ProjectInvoiceRow[];
  payments: ProjectPaymentRow[];
  expenses: ProjectExpenseRow[];
  timeEntries: ProjectTimeEntryRow[];
};

export type ProjectSalesDocumentType =
  | "all"
  | "invoice"
  | "payment"
  | "proposal"
  | "contract"
  | "expense";

export type ProjectSalesDocument = {
  id: string;
  type: Exclude<ProjectSalesDocumentType, "all">;
  title: string;
  subtitle: string;
  amount: number | null;
  status: string;
  date: string | null;
  secondaryDate: string | null;
  link: "/contracts" | "/proposals" | "/invoices" | "/payments" | "/expenses";
  isOverdue: boolean;
};

export type ProjectSalesSummary = {
  proposedTotal: number;
  contractedTotal: number;
  invoicedTotal: number;
  collectedTotal: number;
  pendingCollectionTotal: number;
  confirmedExpensesTotal: number;
  pendingExpensesTotal: number;
  registeredBalance: number;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  timeEntryCount: number;
  overdueInvoiceCount: number;
  activeContractCount: number;
  proposalCount: number;
  latestProposal: ProjectProposalRow | null;
  latestSignatureStatus: string | null;
  contextualCurrency: string | undefined;
  hasMultipleCurrencies: boolean;
};

export function formatMoney(amount: number | null | undefined, currency?: string) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function formatDate(value: string | null | undefined) {
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

export function formatHours(minutes: number) {
  const safeMinutes = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

export function displayStatus(value: string | null | undefined) {
  const normalized = normalizeStatus(value);
  const labels: Record<string, string> = {
    approved: "Aprobado",
    active: "Activo",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    completed: "Completado",
    draft: "Borrador",
    issued: "Emitida",
    paid: "Pagado",
    pending: "Pendiente",
    rejected: "Rechazado",
    sent: "Enviado",
    signed: "Firmado",
    viewed: "Visto",
    overdue: "Vencido",
  };
  return labels[normalized] ?? value ?? "—";
}

function amountSum<T>(rows: T[], getter: (row: T) => number | null | undefined) {
  return rows.reduce((sum, row) => sum + Number(getter(row) || 0), 0);
}

function documentDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isCancelledStatus(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  return normalized === "cancelled" || normalized === "canceled";
}

function isConfirmedExpense(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  return normalized === "approved" || normalized === "paid";
}

function isPendingExpense(status: string | null | undefined) {
  return normalizeStatus(status) === "pending";
}

function isCompletedPayment(status: string | null | undefined) {
  return normalizeStatus(status) === "completed";
}

function isOverdueInvoice(invoice: ProjectInvoiceRow, todayIso: string) {
  if (!invoice.due_date) return false;
  if (isPaidInvoiceStatus(invoice.status) || isCancelledInvoiceStatus(invoice.status)) return false;
  return invoice.due_date < todayIso;
}

export function buildSalesSummary(data: ProjectSalesData, todayIso: string): ProjectSalesSummary {
  const currencies = Array.from(
    new Set(data.proposals.map((proposal) => proposal.currency).filter(Boolean) as string[]),
  );
  const confirmedExpenses = data.expenses.filter((expense) => isConfirmedExpense(expense.status));
  const pendingExpenses = data.expenses.filter((expense) => isPendingExpense(expense.status));
  const contractedTotal = amountSum(
    data.contracts.filter((contract) => !isCancelledStatus(contract.status)),
    (contract) => contract.contract_value,
  );
  const invoicedTotal = amountSum(
    data.invoices.filter((invoice) => !isCancelledInvoiceStatus(invoice.status)),
    (invoice) => invoice.total,
  );
  const collectedTotal = amountSum(
    data.payments.filter((payment) => isCompletedPayment(payment.status)),
    (payment) => payment.amount,
  );
  const totalMinutes = data.timeEntries.reduce(
    (sum, entry) => sum + Number(entry.duration_minutes || 0),
    0,
  );
  const billableMinutes = data.timeEntries
    .filter((entry) => entry.is_billable)
    .reduce((sum, entry) => sum + Number(entry.duration_minutes || 0), 0);
  const latestProposal =
    [...data.proposals].sort(
      (a, b) =>
        documentDateValue(b.updated_at || b.sent_at || b.created_at) -
        documentDateValue(a.updated_at || a.sent_at || a.created_at),
    )[0] || null;
  const latestSignatureStatus =
    [...data.contracts].find((contract) => contract.signature_status)?.signature_status || null;

  return {
    proposedTotal: amountSum(data.proposals, (proposal) => proposal.amount),
    contractedTotal,
    invoicedTotal,
    collectedTotal,
    pendingCollectionTotal: Math.max(0, invoicedTotal - collectedTotal),
    confirmedExpensesTotal: amountSum(confirmedExpenses, (expense) => expense.amount),
    pendingExpensesTotal: amountSum(pendingExpenses, (expense) => expense.amount),
    registeredBalance: collectedTotal - amountSum(confirmedExpenses, (expense) => expense.amount),
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
    timeEntryCount: data.timeEntries.length,
    overdueInvoiceCount: data.invoices.filter((invoice) => isOverdueInvoice(invoice, todayIso)).length,
    activeContractCount: data.contracts.filter((contract) => !isCancelledStatus(contract.status))
      .length,
    proposalCount: data.proposals.length,
    latestProposal,
    latestSignatureStatus,
    contextualCurrency: currencies.length === 1 ? currencies[0] : undefined,
    hasMultipleCurrencies: currencies.length > 1,
  };
}

export function buildSalesDocuments(data: ProjectSalesData, todayIso: string) {
  const documents: ProjectSalesDocument[] = [
    ...data.contracts.map((contract) => ({
      id: contract.id,
      type: "contract" as const,
      title: contract.subject || `Contrato ${contract.contract_number || ""}`.trim(),
      subtitle: `Contrato ${contract.contract_number || "sin número"}`,
      amount: contract.contract_value,
      status: contract.status,
      date: contract.updated_at || contract.signed_at || contract.created_at,
      secondaryDate: contract.signed_at,
      link: "/contracts" as const,
      isOverdue: false,
    })),
    ...data.proposals.map((proposal) => ({
      id: proposal.id,
      type: "proposal" as const,
      title: proposal.title || `Propuesta ${proposal.number || ""}`.trim(),
      subtitle: `Propuesta ${proposal.number || "sin número"}`,
      amount: proposal.amount,
      status: proposal.status,
      date: proposal.updated_at || proposal.sent_at || proposal.created_at,
      secondaryDate: proposal.valid_until,
      link: "/proposals" as const,
      isOverdue:
        Boolean(proposal.valid_until && proposal.valid_until < todayIso) &&
        !["accepted", "approved", "declined", "cancelled", "canceled"].includes(
          normalizeStatus(proposal.status),
        ),
    })),
    ...data.invoices.map((invoice) => ({
      id: invoice.id,
      type: "invoice" as const,
      title: `Factura ${invoice.number || "sin número"}`,
      subtitle: invoice.notes || "Documento de facturación",
      amount: invoice.total,
      status: invoice.status,
      date: invoice.date_issued || invoice.created_at,
      secondaryDate: invoice.due_date,
      link: "/invoices" as const,
      isOverdue: isOverdueInvoice(invoice, todayIso),
    })),
    ...data.payments.map((payment) => ({
      id: payment.id,
      type: "payment" as const,
      title: `Pago ${payment.payment_number || payment.reference || "sin referencia"}`,
      subtitle: payment.method || "Pago registrado",
      amount: payment.amount,
      status: payment.status,
      date: payment.payment_date || payment.created_at,
      secondaryDate: null,
      link: "/payments" as const,
      isOverdue: false,
    })),
    ...data.expenses.map((expense) => ({
      id: expense.id,
      type: "expense" as const,
      title: expense.title || "Gasto sin título",
      subtitle: [expense.vendor, expense.category].filter(Boolean).join(" · ") || "Gasto",
      amount: expense.amount,
      status: expense.status,
      date: expense.expense_date || expense.created_at,
      secondaryDate: null,
      link: "/expenses" as const,
      isOverdue: false,
    })),
  ];

  return documents.sort((a, b) => documentDateValue(b.date) - documentDateValue(a.date));
}
