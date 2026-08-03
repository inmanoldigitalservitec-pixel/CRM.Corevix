import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Clock3,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  KeyRound,
  Mail,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { logActivityEvent } from "@/lib/activity-log";
import { openGlobalTaskCreate } from "@/components/tasks/global-task-create-host";
import { LoadingMetrics, LoadingTable } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { CrmDetailLineButton, CrmDetailSummaryGrid } from "@/components/crm/crm-detail-layout";
import {
  normalizeProfilePickerIds,
  ProfileMultiPicker,
} from "@/components/crm/profile-multi-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isActiveProjectStatus,
  isClosedDealStageValue,
  isCompletedTaskStatusValue,
  isOverdueInvoiceStatus,
  isSentOrOverdueInvoiceStatus,
  isSentOrViewedProposalStatus,
  normalizeStatus,
} from "@/lib/crm/status";
import { QuickCreateDialog } from "@/components/crm/quick-create-dialog";
import { ClientFilesPanel } from "@/components/clients/client-files-panel";
import { ClientNotesPanel } from "@/components/clients/client-notes-panel";
import {
  InvoiceEditor,
  type InvoiceEditorDraft,
  type InvoiceEditorItem,
} from "@/components/invoices/invoice-editor";
import {
  PaymentFormDialog,
  type PaymentFormCreatedResult,
  type PaymentFormInitialValues,
} from "@/components/payments/payment-form-dialog";
import { ContractEditorDialog } from "@/components/contracts/contract-editor-dialog";
import {
  convertCurrencyAmount,
  convertToBaseCurrency,
  formatCurrencyAmount,
  normalizeCurrency,
  type CompanyCurrencySettings,
} from "@/lib/currency";

export const Route = createFileRoute("/clients")({
  validateSearch: (search: Record<string, unknown>): { clientId?: string } => ({
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
  }),
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: "Clientes — Corevix CRM" },
      {
        name: "description",
        content: "Gestiona clientes activos, contactos, proyectos y finanzas",
      },
    ],
  }),
});

type Client360QuickDetailGroup =
  | "tasks"
  | "projects"
  | "tickets"
  | "invoices"
  | "proposals"
  | "payments"
  | "credit_notes"
  | "expenses"
  | "subscriptions"
  | "calendar";

const CLIENT_STATUSES = ["Active", "VIP", "Pending", "Inactive", "Past Client"] as const;
const CLIENT_HEALTH_FILTERS = ["all", "active", "attention", "risk", "inactive"] as const;
const CONTACT_PRESENCE_FILTERS = ["all", "with", "without", "primary"] as const;
const FINANCE_FILTERS = ["all", "pending", "overdue", "clear"] as const;
const ACTIVITY_FILTERS = ["all", "recent7", "stale30", "stale60"] as const;
const PROJECT_STATUSES = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const PROJECT_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];
const CREDIT_NOTE_STATUSES = ["Draft", "Issued", "Applied", "Cancelled"];
const SUBSCRIPTION_STATUSES = ["Trial", "Active", "Paused", "Cancelled", "Expired"];
const SUBSCRIPTION_CYCLES = ["Weekly", "Monthly", "Quarterly", "Yearly"];
const EXPENSE_STATUSES = ["Pending", "Approved", "Paid", "Rejected"];
const TICKET_STATUSES = ["Open", "In Progress", "Answered", "On Hold", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CLIENT_REMINDER_TYPES = ["reminder", "call", "meeting", "demo"] as const;
const VAULT_CATEGORIES = [
  { value: "login", label: "Login" },
  { value: "api_key", label: "API key" },
  { value: "server", label: "Servidor" },
  { value: "domain_dns", label: "Dominio / DNS" },
  { value: "bank_account", label: "Cuenta bancaria" },
  { value: "document", label: "Documento" },
  { value: "license", label: "Licencia" },
  { value: "recovery_code", label: "Código de recuperación" },
  { value: "secure_note", label: "Nota segura" },
  { value: "other", label: "Otro" },
];
const VAULT_STATUSES = [
  { value: "active", label: "Activo" },
  { value: "needs_review", label: "Revisar" },
  { value: "expired", label: "Expirado" },
  { value: "archived", label: "Archivado" },
];
const VAULT_SENSITIVITY = [
  { value: "internal", label: "Interno" },
  { value: "restricted", label: "Restringido" },
  { value: "critical", label: "Crítico" },
];

const PROJECT_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
};

function projectLabel(value: string | null | undefined) {
  const text = String(value || "").trim();
  return PROJECT_LABELS[text] || text || "—";
}

const PAYMENT_LABELS: Record<string, string> = {
  Completed: "Completado",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

const CREDIT_NOTE_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Issued: "Emitida",
  Applied: "Aplicada",
  Cancelled: "Cancelada",
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  Trial: "Prueba",
  Active: "Activa",
  Paused: "Pausada",
  Cancelled: "Cancelada",
  Expired: "Expirada",
  Weekly: "Semanal",
  Monthly: "Mensual",
  Quarterly: "Trimestral",
  Yearly: "Anual",
};

const EXPENSE_LABELS: Record<string, string> = {
  Pending: "Pendiente",
  Approved: "Aprobado",
  Paid: "Pagado",
  Rejected: "Rechazado",
};

const TICKET_LABELS: Record<string, string> = {
  Open: "Abierto",
  "In Progress": "En progreso",
  Answered: "Respondido",
  "On Hold": "En espera",
  Closed: "Cerrado",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
};

const CLIENT_REMINDER_LABELS: Record<string, string> = {
  reminder: "Recordatorio",
  call: "Llamada",
  meeting: "Reunión",
  demo: "Demo",
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
};

type ClientStatus = (typeof CLIENT_STATUSES)[number];
type ClientHealth = "active" | "attention" | "risk" | "inactive";
type AccountManagerFilter = "all" | "mine" | "unassigned" | string;

interface ClientRow {
  id: string;
  company_id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  website: string | null;
  industry: string | null;
  status: ClientStatus;
  account_manager: string | null;
  tags: string[] | null;
  notes: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  company_id: string;
  client_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  department: string | null;
  position: string | null;
  tags: string[] | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  company_id: string;
  client_id: string | null;
  name: string;
  description?: string | null;
  status: string;
  progress: number | null;
  start_date?: string | null;
  due_date: string | null;
  priority?: string | null;
  budget?: number | null;
  product_id?: string | null;
  manager?: string | null;
  updated_at: string;
}

interface TaskRow {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  updated_at: string;
  related_client_id: string | null;
  related_project_id?: string | null;
}

interface ClientProductRow {
  id: string;
  company_id: string;
  client_id: string;
  product_id: string;
  deal_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  billing_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductRow {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  type: string | null;
  base_price: number;
  currency: string | null;
  billing_type: string | null;
  description?: string | null;
  is_active: boolean;
}

interface InvoiceRow {
  id: string;
  company_id: string;
  client_id: string | null;
  product_id?: string | null;
  number: string;
  status: string;
  total: number;
  currency?: string | null;
  base_currency?: string | null;
  total_base?: number | null;
  invoice_data?: Record<string, unknown> | null;
  date_issued: string | null;
  due_date: string | null;
  updated_at: string;
}

interface InvoiceItemRow {
  id: string;
  company_id: string;
  invoice_id: string;
  product_id: string | null;
  item_name: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  company_id: string;
  payment_number: string | null;
  reference: string | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  currency?: string | null;
  base_currency?: string | null;
  amount_base?: number | null;
  payment_date: string;
  method: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreditNoteRow {
  id: string;
  company_id: string;
  credit_note_number: number | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  currency?: string | null;
  base_currency?: string | null;
  amount_base?: number | null;
  status: string;
  date_issued: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionRow {
  id: string;
  company_id: string;
  name: string;
  client_id: string | null;
  product_id: string | null;
  amount: number;
  currency?: string | null;
  base_currency?: string | null;
  amount_base?: number | null;
  billing_cycle: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseRow {
  id: string;
  company_id: string;
  title: string;
  vendor: string | null;
  category: string;
  amount: number;
  currency?: string | null;
  base_currency?: string | null;
  amount_base?: number | null;
  status: string;
  expense_date: string;
  project_id: string | null;
  client_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientNoteSummaryRow {
  id: string;
  company_id: string;
  client_id: string;
  author_profile_id: string | null;
  content: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ContractRow {
  id: string;
  company_id: string;
  contract_number: number | null;
  subject: string;
  description: string | null;
  status: string;
  contract_type: string;
  contract_value: number | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  contract_value_base?: number | null;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  project_id: string | null;
  proposal_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  signed_at: string | null;
  signature_status: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketRow {
  id: string;
  ticket_number: number | null;
  company_id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  department: string;
  service: string | null;
  source: string;
  tags: string[] | null;
  client_id: string | null;
  contact_id: string | null;
  project_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  last_reply_at: string | null;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarEventRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  related_task_id: string | null;
  related_lead_id: string | null;
  related_client_id: string | null;
  related_deal_id: string | null;
  related_project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface VaultItemRow {
  id: string;
  company_id: string;
  title: string;
  category: string;
  status: string;
  sensitivity: string;
  client_id: string | null;
  project_id: string | null;
  owner_id: string | null;
  url: string | null;
  username: string | null;
  email: string | null;
  secret_value: string | null;
  notes: string | null;
  tags: string[] | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: string;
  company_id: string;
  client_id: string | null;
  number: string;
  title: string;
  amount: number;
  status: string;
  product_id?: string | null;
  currency?: string | null;
  description?: string | null;
  notes?: string | null;
  valid_until: string | null;
  updated_at: string;
}

interface DealRow {
  id: string;
  company_id: string;
  lead_id?: string | null;
  name: string;
  stage: string;
  value: number;
  probability: number | null;
  expected_close: string | null;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  company_id: string | null;
  full_name: string;
  user_id: string;
  email?: string | null;
  avatar_url?: string | null;
  department: string | null;
  is_active: boolean;
}

interface ClientSnapshot extends ClientRow {
  contacts: ContactRow[];
  internalNotes: ClientNoteSummaryRow[];
  primaryContact: ContactRow | null;
  purchasedProducts: Array<{ clientProduct: ClientProductRow; product: ProductRow | null }>;
  purchasedProductNames: string[];
  projects: ProjectRow[];
  activeProjects: ProjectRow[];
  tasks: TaskRow[];
  openTasks: TaskRow[];
  overdueTasks: TaskRow[];
  nextOpenTask: TaskRow | null;
  invoices: InvoiceRow[];
  pendingInvoices: InvoiceRow[];
  overdueInvoices: InvoiceRow[];
  payments: PaymentRow[];
  completedPayments: PaymentRow[];
  totalPaidAmount: number;
  creditNotes: CreditNoteRow[];
  appliedCreditNotes: CreditNoteRow[];
  totalCreditAmount: number;
  financialBalance: number;
  subscriptions: SubscriptionRow[];
  activeSubscriptions: SubscriptionRow[];
  recurringAmount: number;
  expenses: ExpenseRow[];
  paidExpenses: ExpenseRow[];
  totalExpenseAmount: number;
  contracts: ContractRow[];
  activeContracts: ContractRow[];
  expiringContracts: ContractRow[];
  totalContractValue: number;
  tickets: TicketRow[];
  openTickets: TicketRow[];
  urgentTickets: TicketRow[];
  overdueTickets: TicketRow[];
  reminders: CalendarEventRow[];
  openReminders: CalendarEventRow[];
  overdueReminders: CalendarEventRow[];
  upcomingReminders: CalendarEventRow[];
  vaultItems: VaultItemRow[];
  criticalVaultItems: VaultItemRow[];
  vaultItemsToReview: VaultItemRow[];
  proposals: ProposalRow[];
  pendingProposals: ProposalRow[];
  deals: DealRow[];
  openDeals: DealRow[];
  accountManagerName: string;
  health: ClientHealth;
  healthReason: string;
  healthTone: string;
  pendingInvoiceAmount: number;
  openPipelineValue: number;
  latestActivityAt: string | null;
}

type AccountStatementMovement = {
  id: string;
  date: string;
  type: "invoice" | "payment" | "credit_note";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  status: string;
};

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  at: string | null;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}

interface ActivityLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  Active: "Activo",
  VIP: "VIP",
  Pending: "Pendiente",
  Inactive: "Inactivo",
  "Past Client": "Cliente anterior",
};

const HEALTH_LABELS: Record<ClientHealth, string> = {
  active: "Activo",
  attention: "Atención",
  risk: "En riesgo",
  inactive: "Inactivo",
};

const HEALTH_STYLES: Record<ClientHealth, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  attention: "bg-amber-50 text-amber-700 border-amber-200",
  risk: "bg-rose-50 text-rose-700 border-rose-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

const FINANCE_LABELS: Record<(typeof FINANCE_FILTERS)[number], string> = {
  all: "Todos",
  pending: "Pendientes",
  overdue: "Vencidas",
  clear: "Al día",
};

function cnJoin(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function money(value: number | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, currency || "USD");
}

function rowCurrency(row: {
  currency?: string | null;
  invoice_data?: Record<string, unknown> | null;
}) {
  return normalizeCurrency(row.currency || String(row.invoice_data?.currency || ""));
}

function rowBaseMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  settings: CompanyCurrencySettings,
) {
  return convertToBaseCurrency(value, currency, settings);
}

function storedOrConvertedBaseMoney(
  storedBaseValue: number | string | null | undefined,
  storedBaseCurrency: string | null | undefined,
  fallbackValue: number | string | null | undefined,
  fallbackCurrency: string | null | undefined,
  settings: CompanyCurrencySettings,
) {
  if (storedBaseValue != null) {
    return convertCurrencyAmount(
      storedBaseValue,
      storedBaseCurrency || settings.baseCurrency,
      settings.baseCurrency,
      settings.usdToDopRate,
    );
  }

  return rowBaseMoney(fallbackValue, fallbackCurrency, settings);
}

function isoDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().split("T")[0];
}

function dateKey(value: string | null | undefined) {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function cleanInvoiceText(value: unknown) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function isOpenTaskStatus(status: string) {
  return !isCompletedTaskStatusValue(status);
}

function compareDueDateAsc(a: TaskRow, b: TaskRow) {
  const da = a.due_date ? String(a.due_date) : "";
  const db = b.due_date ? String(b.due_date) : "";
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
}

function projectProgressFromTasks(project: ProjectRow, tasks: TaskRow[]) {
  const projectTasks = tasks.filter((task) => task.related_project_id === project.id);
  if (!projectTasks.length) return Math.max(0, Math.min(Number(project.progress || 0), 100));
  const completed = projectTasks.filter((task) => isCompletedTaskStatusValue(task.status)).length;
  return Math.round((completed / projectTasks.length) * 100);
}

function splitTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const key = dateKey(value);
  if (key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function vaultOptionLabel(options: Array<{ value: string; label: string }>, value: string | null) {
  return options.find((option) => option.value === value)?.label || "—";
}

function vaultStatusClass(status: string) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "expired") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function vaultSensitivityClass(sensitivity: string) {
  if (sensitivity === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (sensitivity === "restricted") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function toDateTimeLocalInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function dateTimeLocalInputToIso(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function reminderLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return CLIENT_REMINDER_LABELS[key] || key || "Recordatorio";
}

function relativeLabel(value: string | null | undefined) {
  if (!value) return "Sin actividad";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (Number.isNaN(days)) return "Sin actividad";
  if (days <= 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Hace 1 mes";
  return `Hace ${months} meses`;
}

function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  const today = new Date();
  const target = new Date(value);
  return target.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
}

function maxDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter((value) => !Number.isNaN(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function groupBy<T>(items: T[], selector: (item: T) => string | null | undefined) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = selector(item) || "";
    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
  }
  return map;
}

function getClientName(client: ClientRow) {
  return client.company_name;
}

function getContactName(contact: ContactRow) {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

function clientStatusLabel(status: ClientStatus) {
  return CLIENT_STATUS_LABELS[status] || status;
}

function healthTone(health: ClientHealth) {
  return HEALTH_STYLES[health];
}

function healthLabel(health: ClientHealth) {
  return HEALTH_LABELS[health];
}

function paymentLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return PAYMENT_LABELS[key] || key || "—";
}

function creditNoteLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return CREDIT_NOTE_LABELS[key] || key || "—";
}

function subscriptionLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return SUBSCRIPTION_LABELS[key] || key || "—";
}

function expenseLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return EXPENSE_LABELS[key] || key || "—";
}

function ticketLabel(value: string | null | undefined) {
  const key = String(value || "").trim();
  return TICKET_LABELS[key] || key || "—";
}

function getClientHealth(args: {
  status: ClientStatus;
  overdueInvoices: number;
  overdueTasks: number;
  pendingInvoices: number;
  openTasks: number;
  contacts: number;
  primaryContact: boolean;
  latestActivityAt: string | null;
}) {
  if (
    normalizeStatus(args.status) === "inactive" ||
    normalizeStatus(args.status) === "past_client"
  ) {
    return {
      health: "inactive" as ClientHealth,
      reason: "Cuenta histórica o inactiva.",
    };
  }

  if (args.overdueInvoices > 0 || args.overdueTasks > 0) {
    return {
      health: "risk" as ClientHealth,
      reason:
        args.overdueInvoices > 0
          ? "Tiene facturas vencidas que necesitan revisión."
          : "Tiene tareas atrasadas que requieren seguimiento.",
    };
  }

  if (!args.primaryContact || (args.contacts === 0 && !args.primaryContact)) {
    return {
      health: "attention" as ClientHealth,
      reason: "Aún no tiene un contacto primario definido.",
    };
  }

  if (args.pendingInvoices > 0 || args.openTasks > 0) {
    return {
      health: "attention" as ClientHealth,
      reason:
        args.pendingInvoices > 0
          ? "Hay facturas enviadas o pendientes por cobrar."
          : "Hay tareas abiertas que conviene revisar.",
    };
  }

  if (daysSince(args.latestActivityAt) > 30) {
    return {
      health: "attention" as ClientHealth,
      reason: "Hace tiempo que no se actualiza esta cuenta.",
    };
  }

  return {
    health: "active" as ClientHealth,
    reason: "Cuenta saludable y al día.",
  };
}

function clientFinanceLabel(client: ClientSnapshot, baseCurrency = "USD") {
  if (Math.abs(client.financialBalance) > 0.005) {
    return money(client.financialBalance, baseCurrency);
  }
  if (client.overdueInvoices.length > 0) {
    return `${client.overdueInvoices.length} vencida${client.overdueInvoices.length > 1 ? "s" : ""}`;
  }
  if (client.pendingInvoices.length > 0) {
    return `${client.pendingInvoices.length} pendiente${client.pendingInvoices.length > 1 ? "s" : ""}`;
  }
  return "Al día";
}

function buildClientCsv(clients: ClientSnapshot[], baseCurrency = "USD") {
  const headers = [
    "Empresa",
    "Contacto principal",
    "Estado",
    "Salud",
    "Responsable",
    "Industria",
    "Proyectos activos",
    "Facturas pendientes",
    "Tareas atrasadas",
    "Valor de embudo",
    "Notas",
  ];

  const rows = clients.map((client) => [
    getClientName(client),
    client.primaryContact ? getContactName(client.primaryContact) : client.contact_person || "",
    clientStatusLabel(client.status),
    healthLabel(client.health),
    client.accountManagerName,
    client.industry || "",
    String(client.activeProjects.length),
    money(client.pendingInvoiceAmount, baseCurrency),
    String(client.overdueTasks.length),
    money(client.openPipelineValue, baseCurrency),
    client.notes || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

type ClientKpiTone = "neutral" | "success" | "warning" | "danger";

function clientRiskTone(value: number, warningAt: number, dangerAt: number): ClientKpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function ClientKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: ClientKpiTone;
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : "text-slate-950";

  return (
    <div className="border-b border-slate-100 bg-white pb-4">
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-normal ${valueClass}`}>{value}</div>
    </div>
  );
}

function HealthBadge({ health }: { health: ClientHealth }) {
  return (
    <span
      className={cnJoin(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        healthTone(health),
      )}
    >
      {healthLabel(health)}
    </span>
  );
}

function ClientsPage() {
  const navigate = useNavigate();
  const routeSearch = Route.useSearch();
  const openedClientSearchRef = useRef<string | null>(null);
  const { profile, user } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { can, role } = usePermissions();
  const canManageVault = ["super_admin", "admin", "manager"].includes(String(role || ""));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<AccountManagerFilter>("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [contactFilter, setContactFilter] =
    useState<(typeof CONTACT_PRESENCE_FILTERS)[number]>("all");
  const [healthFilter, setHealthFilter] = useState<(typeof CLIENT_HEALTH_FILTERS)[number]>("all");
  const [financeFilter, setFinanceFilter] = useState<(typeof FINANCE_FILTERS)[number]>("all");
  const [activityFilter, setActivityFilter] = useState<(typeof ACTIVITY_FILTERS)[number]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactRow | null>(null);
  const [contactClientId, setContactClientId] = useState<string | null>(null);
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [projectAssigneeIds, setProjectAssigneeIds] = useState<string[]>([]);
  const [quickProposalOpen, setQuickProposalOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceClientId, setInvoiceClientId] = useState<string | null>(null);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInitialValues, setPaymentInitialValues] = useState<
    PaymentFormInitialValues | undefined
  >();
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const [creditNoteClientId, setCreditNoteClientId] = useState<string | null>(null);
  const [creditNoteSaving, setCreditNoteSaving] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionClientId, setSubscriptionClientId] = useState<string | null>(null);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseClientId, setExpenseClientId] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractClientId, setContractClientId] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketClientId, setTicketClientId] = useState<string | null>(null);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderClientId, setReminderClientId] = useState<string | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [vaultClientId, setVaultClientId] = useState<string | null>(null);
  const [vaultSaving, setVaultSaving] = useState(false);
  const [revealedVaultItemIds, setRevealedVaultItemIds] = useState<Set<string>>(() => new Set());
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [statementFrom, setStatementFrom] = useState(() => isoDate(-90));
  const [statementTo, setStatementTo] = useState(() => isoDate());
  const [statementCurrency, setStatementCurrency] = useState("all");
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
    create: createClient,
    update: updateClient,
    remove: removeClient,
  } = useCrud<ClientRow>({
    table: "clients",
    select:
      "id,company_id,company_name,contact_person,email,phone,whatsapp,address,city,country,tax_id,website,industry,status,account_manager,tags,notes,drive_folder_id,drive_folder_url,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: contacts,
    loading: contactsLoading,
    error: contactsError,
    create: createContact,
    update: updateContact,
    remove: removeContact,
    fetch: fetchContacts,
  } = useCrud<ContactRow>({
    table: "contacts",
    select:
      "id,company_id,client_id,first_name,last_name,email,phone,whatsapp,department,position,tags,notes,is_primary,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const { data: clientNotes, fetch: fetchClientNotes } = useCrud<ClientNoteSummaryRow>({
    table: "client_notes",
    select: "id,company_id,client_id,author_profile_id,content,archived_at,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });

  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    create: createProject,
    fetch: fetchProjects,
  } = useCrud<ProjectRow>({
    table: "projects",
    select:
      "id,company_id,client_id,name,description,status,progress,start_date,due_date,priority,budget,product_id,manager,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    fetch: fetchTasks,
  } = useCrud<TaskRow>({
    table: "tasks",
    select:
      "id,company_id,title,description,status,priority,due_date,updated_at,related_client_id,related_project_id",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: clientProducts,
    loading: clientProductsLoading,
    error: clientProductsError,
  } = useCrud<ClientProductRow>({
    table: "client_products",
    select:
      "id,company_id,client_id,product_id,deal_id,status,start_date,end_date,price,billing_type,notes,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });

  const {
    data: products,
    loading: productsLoading,
    error: productsError,
  } = useCrud<ProductRow>({
    table: "products",
    select:
      "id,company_id,name,category,type,base_price,currency,billing_type,description,is_active",
    orderBy: "name",
    ascending: true,
    limit: 2000,
  });

  const {
    data: invoices,
    loading: invoicesLoading,
    error: invoicesError,
    fetch: fetchInvoices,
  } = useCrud<InvoiceRow>({
    table: "invoices",
    select:
      "id,company_id,client_id,product_id,number,status,total,currency,base_currency,total_base,invoice_data,date_issued,due_date,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const { data: invoiceItems } = useCrud<InvoiceItemRow>({
    table: "invoice_items",
    select: "id,company_id,invoice_id,product_id,item_name,created_at",
    orderBy: "created_at",
    ascending: false,
    limit: 5000,
  });

  const {
    data: payments,
    loading: paymentsLoading,
    error: paymentsError,
    fetch: fetchPayments,
  } = useCrud<PaymentRow>({
    table: "payments",
    select:
      "id,company_id,payment_number,reference,invoice_id,client_id,amount,currency,base_currency,amount_base,payment_date,method,status,notes,created_at,updated_at",
    orderBy: "payment_date",
    ascending: false,
    limit: 2000,
  });

  const {
    data: creditNotes,
    loading: creditNotesLoading,
    error: creditNotesError,
    fetch: fetchCreditNotes,
  } = useCrud<CreditNoteRow>({
    table: "credit_notes",
    select:
      "id,company_id,credit_note_number,invoice_id,client_id,amount,currency,base_currency,amount_base,status,date_issued,reason,notes,created_at,updated_at",
    orderBy: "date_issued",
    ascending: false,
    limit: 2000,
  });

  const {
    data: subscriptions,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    create: createSubscription,
    fetch: fetchSubscriptions,
  } = useCrud<SubscriptionRow>({
    table: "subscriptions",
    select:
      "id,company_id,name,client_id,product_id,amount,currency,base_currency,amount_base,billing_cycle,status,start_date,next_billing_date,end_date,notes,created_at,updated_at",
    orderBy: "next_billing_date",
    ascending: true,
    limit: 2000,
  });

  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    create: createExpense,
    fetch: fetchExpenses,
  } = useCrud<ExpenseRow>({
    table: "expenses",
    select:
      "id,company_id,title,vendor,category,amount,currency,base_currency,amount_base,status,expense_date,project_id,client_id,receipt_url,notes,created_at,updated_at",
    orderBy: "expense_date",
    ascending: false,
    limit: 2000,
  });

  const {
    data: contracts,
    loading: contractsLoading,
    error: contractsError,
    fetch: fetchContracts,
  } = useCrud<ContractRow>({
    table: "contracts",
    select:
      "id,company_id,contract_number,subject,description,status,contract_type,contract_value,currency,base_currency,exchange_rate,exchange_rate_source,exchange_rate_updated_at,contract_value_base,start_date,end_date,client_id,project_id,proposal_id,deal_id,assigned_to,created_by,signed_at,signature_status,invoice_id,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });

  const {
    data: tickets,
    loading: ticketsLoading,
    error: ticketsError,
    create: createTicket,
    fetch: fetchTickets,
  } = useCrud<TicketRow>({
    table: "tickets",
    select:
      "id,ticket_number,company_id,subject,description,status,priority,department,service,source,tags,client_id,contact_id,project_id,lead_id,assigned_to,created_by,last_reply_at,first_response_due_at,resolution_due_at,closed_at,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });

  const {
    data: calendarEvents,
    loading: calendarEventsLoading,
    error: calendarEventsError,
    create: createCalendarEvent,
    fetch: fetchCalendarEvents,
  } = useCrud<CalendarEventRow>({
    table: "calendar_events",
    select:
      "id,company_id,user_id,title,description,location,type,status,start_at,end_at,all_day,related_task_id,related_lead_id,related_client_id,related_deal_id,related_project_id,metadata,created_at,updated_at",
    orderBy: "start_at",
    ascending: false,
    limit: 2000,
  });

  const {
    data: vaultItems,
    loading: vaultItemsLoading,
    error: vaultItemsError,
    create: createVaultItem,
    fetch: fetchVaultItems,
  } = useCrud<VaultItemRow>({
    table: "vault_items",
    select:
      "id,company_id,title,category,status,sensitivity,client_id,project_id,owner_id,url,username,email,secret_value,notes,tags,expires_at,last_used_at,created_by,updated_by,created_at,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
    enabled: canManageVault,
  });

  const {
    data: proposals,
    loading: proposalsLoading,
    error: proposalsError,
  } = useCrud<ProposalRow>({
    table: "proposals",
    select:
      "id,company_id,client_id,number,title,amount,status,product_id,currency,description,notes,valid_until,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: deals,
    loading: dealsLoading,
    error: dealsError,
  } = useCrud<DealRow>({
    table: "deals",
    select: "id,company_id,lead_id,name,stage,value,probability,expected_close,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: managers,
    loading: managersLoading,
    error: managersError,
  } = useCrud<ProfileRow>({
    table: "profiles",
    select: "id,company_id,full_name,email,avatar_url,user_id,department,is_active",
    orderBy: "full_name",
    ascending: true,
  });

  const loading =
    clientsLoading ||
    contactsLoading ||
    projectsLoading ||
    tasksLoading ||
    clientProductsLoading ||
    productsLoading ||
    invoicesLoading ||
    paymentsLoading ||
    creditNotesLoading ||
    subscriptionsLoading ||
    expensesLoading ||
    contractsLoading ||
    ticketsLoading ||
    calendarEventsLoading ||
    vaultItemsLoading ||
    proposalsLoading ||
    dealsLoading ||
    managersLoading;

  const errorMessage = useMemo(() => {
    const errors = [
      clientsError,
      contactsError,
      projectsError,
      tasksError,
      clientProductsError,
      productsError,
      invoicesError,
      paymentsError,
      creditNotesError,
      subscriptionsError,
      expensesError,
      contractsError,
      ticketsError,
      calendarEventsError,
      vaultItemsError,
      proposalsError,
      dealsError,
      managersError,
    ].filter(Boolean);
    if (errors.length === 0) return null;
    return "No se pudieron cargar algunas métricas.";
  }, [
    clientsError,
    contactsError,
    projectsError,
    tasksError,
    clientProductsError,
    productsError,
    invoicesError,
    paymentsError,
    creditNotesError,
    subscriptionsError,
    expensesError,
    contractsError,
    ticketsError,
    calendarEventsError,
    vaultItemsError,
    proposalsError,
    dealsError,
    managersError,
  ]);

  const managerNameById = useMemo(() => {
    return new Map(managers.map((manager) => [manager.id, manager.full_name]));
  }, [managers]);

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const managerUserIdByProfileId = useMemo(() => {
    return new Map(
      managers
        .filter((manager) => manager.user_id)
        .map((manager) => [String(manager.id), String(manager.user_id)]),
    );
  }, [managers]);

  const resolveTaskAssigneeUserId = (raw: string | null | undefined) => {
    const value = String(raw || "").trim();
    if (!value || value === "none") return profile?.user_id || user?.id || null;

    const byManagerProfileId = managerUserIdByProfileId.get(value);
    if (byManagerProfileId) return byManagerProfileId;

    if (value === String(profile?.user_id || "") || value === String(user?.id || "")) return value;
    if (value === String(profile?.id || "")) return profile?.user_id || user?.id || null;

    return profile?.user_id || user?.id || null;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.company_id) {
        setActivityLogs([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("activity_logs")
        .select("id,action,entity_type,entity_id,detail,metadata,created_at,user_id")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(250);

      if (cancelled) return;
      if (error) {
        setActivityLogs([]);
        return;
      }
      setActivityLogs((data || []) as ActivityLogRow[]);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, activityRefreshKey]);

  const contactsByClient = useMemo(
    () => groupBy(contacts, (contact) => contact.client_id),
    [contacts],
  );
  const internalNotesByClient = useMemo(
    () =>
      groupBy(
        clientNotes.filter((note) => !note.archived_at),
        (note) => note.client_id,
      ),
    [clientNotes],
  );
  const projectsByClient = useMemo(
    () => groupBy(projects, (project) => project.client_id),
    [projects],
  );
  const tasksByClient = useMemo(() => groupBy(tasks, (task) => task.related_client_id), [tasks]);
  const tasksByProject = useMemo(
    () => groupBy(tasks, (task) => task.related_project_id || null),
    [tasks],
  );
  const invoicesByClient = useMemo(
    () => groupBy(invoices, (invoice) => invoice.client_id),
    [invoices],
  );
  const paymentsByClient = useMemo(
    () => groupBy(payments, (payment) => payment.client_id),
    [payments],
  );
  const paymentsByInvoice = useMemo(
    () => groupBy(payments, (payment) => payment.invoice_id),
    [payments],
  );
  const creditNotesByClient = useMemo(
    () => groupBy(creditNotes, (creditNote) => creditNote.client_id),
    [creditNotes],
  );
  const creditNotesByInvoice = useMemo(
    () => groupBy(creditNotes, (creditNote) => creditNote.invoice_id),
    [creditNotes],
  );
  const subscriptionsByClient = useMemo(
    () => groupBy(subscriptions, (subscription) => subscription.client_id),
    [subscriptions],
  );
  const expensesByClient = useMemo(
    () => groupBy(expenses, (expense) => expense.client_id),
    [expenses],
  );
  const expensesByProject = useMemo(
    () => groupBy(expenses, (expense) => expense.project_id),
    [expenses],
  );
  const contractsByClient = useMemo(
    () => groupBy(contracts, (contract) => contract.client_id),
    [contracts],
  );
  const contractsByProject = useMemo(
    () => groupBy(contracts, (contract) => contract.project_id),
    [contracts],
  );
  const ticketsByClient = useMemo(() => groupBy(tickets, (ticket) => ticket.client_id), [tickets]);
  const ticketsByProject = useMemo(
    () => groupBy(tickets, (ticket) => ticket.project_id),
    [tickets],
  );
  const remindersByClient = useMemo(
    () => groupBy(calendarEvents, (event) => event.related_client_id),
    [calendarEvents],
  );
  const remindersByProject = useMemo(
    () => groupBy(calendarEvents, (event) => event.related_project_id),
    [calendarEvents],
  );
  const vaultItemsByClient = useMemo(
    () => groupBy(vaultItems, (item) => item.client_id),
    [vaultItems],
  );
  const proposalsByClient = useMemo(
    () => groupBy(proposals, (proposal) => proposal.client_id),
    [proposals],
  );
  const dealsByClient = useMemo(() => new Map<string, DealRow[]>(), []);
  const clientProductsByClient = useMemo(
    () => groupBy(clientProducts, (cp) => cp.client_id),
    [clientProducts],
  );
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const invoiceById = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices],
  );
  const invoiceItemsByInvoice = useMemo(
    () => groupBy(invoiceItems, (item) => item.invoice_id),
    [invoiceItems],
  );

  const snapshots = useMemo<ClientSnapshot[]>(() => {
    return clients.map((client) => {
      const clientContacts = contactsByClient.get(client.id) || [];
      const clientInternalNotes = internalNotesByClient.get(client.id) || [];
      const primaryContact =
        clientContacts.find((contact) => contact.is_primary) || clientContacts[0] || null;
      const clientProjects = projectsByClient.get(client.id) || [];
      const directClientTasks = tasksByClient.get(client.id) || [];
      const projectTasks = clientProjects.flatMap(
        (p) => (tasksByProject.get(p.id) || []) as TaskRow[],
      );
      const taskById = new Map<string, TaskRow>();
      for (const t of [...directClientTasks, ...projectTasks]) taskById.set(String(t.id), t);
      const clientTasks = Array.from(taskById.values());
      const clientInvoices = invoicesByClient.get(client.id) || [];
      const clientInvoiceItems = clientInvoices.flatMap(
        (invoice) => invoiceItemsByInvoice.get(invoice.id) || [],
      );
      const paymentById = new Map<string, PaymentRow>();
      for (const payment of paymentsByClient.get(client.id) || []) {
        paymentById.set(payment.id, payment);
      }
      for (const invoice of clientInvoices) {
        for (const payment of paymentsByInvoice.get(invoice.id) || []) {
          paymentById.set(payment.id, payment);
        }
      }
      const clientPayments = Array.from(paymentById.values()).sort((a, b) =>
        String(b.payment_date || b.created_at || "").localeCompare(
          String(a.payment_date || a.created_at || ""),
        ),
      );
      const completedPayments = clientPayments.filter(
        (payment) => normalizeStatus(payment.status) === "completed",
      );
      const creditNoteById = new Map<string, CreditNoteRow>();
      for (const creditNote of creditNotesByClient.get(client.id) || []) {
        creditNoteById.set(creditNote.id, creditNote);
      }
      for (const invoice of clientInvoices) {
        for (const creditNote of creditNotesByInvoice.get(invoice.id) || []) {
          creditNoteById.set(creditNote.id, creditNote);
        }
      }
      const clientCreditNotes = Array.from(creditNoteById.values()).sort((a, b) =>
        String(b.date_issued || b.created_at || "").localeCompare(
          String(a.date_issued || a.created_at || ""),
        ),
      );
      const appliedCreditNotes = clientCreditNotes.filter((creditNote) =>
        ["issued", "applied"].includes(normalizeStatus(creditNote.status)),
      );
      const clientSubscriptions = (subscriptionsByClient.get(client.id) || []).sort((a, b) =>
        String(a.next_billing_date || a.start_date || "").localeCompare(
          String(b.next_billing_date || b.start_date || ""),
        ),
      );
      const activeSubscriptions = clientSubscriptions.filter((subscription) =>
        ["trial", "active"].includes(normalizeStatus(subscription.status)),
      );
      const expenseById = new Map<string, ExpenseRow>();
      for (const expense of expensesByClient.get(client.id) || []) {
        expenseById.set(expense.id, expense);
      }
      for (const project of clientProjects) {
        for (const expense of expensesByProject.get(project.id) || []) {
          expenseById.set(expense.id, expense);
        }
      }
      const clientExpenses = Array.from(expenseById.values()).sort((a, b) =>
        String(b.expense_date || b.created_at || "").localeCompare(
          String(a.expense_date || a.created_at || ""),
        ),
      );
      const paidExpenses = clientExpenses.filter(
        (expense) => normalizeStatus(expense.status) === "paid",
      );
      const contractById = new Map<string, ContractRow>();
      for (const contract of contractsByClient.get(client.id) || []) {
        contractById.set(contract.id, contract);
      }
      for (const project of clientProjects) {
        for (const contract of contractsByProject.get(project.id) || []) {
          contractById.set(contract.id, contract);
        }
      }
      const clientContracts = Array.from(contractById.values()).sort((a, b) =>
        String(b.updated_at || b.created_at || "").localeCompare(
          String(a.updated_at || a.created_at || ""),
        ),
      );
      const today = isoDate();
      const in30Days = isoDate(30);
      const activeContracts = clientContracts.filter(
        (contract) => normalizeStatus(contract.status) === "active",
      );
      const expiringContracts = clientContracts.filter(
        (contract) =>
          contract.end_date &&
          contract.end_date >= today &&
          contract.end_date <= in30Days &&
          normalizeStatus(contract.status) !== "cancelled",
      );
      const ticketById = new Map<string, TicketRow>();
      for (const ticket of ticketsByClient.get(client.id) || []) {
        ticketById.set(ticket.id, ticket);
      }
      for (const project of clientProjects) {
        for (const ticket of ticketsByProject.get(project.id) || []) {
          ticketById.set(ticket.id, ticket);
        }
      }
      const clientTickets = Array.from(ticketById.values()).sort((a, b) =>
        String(b.updated_at || b.created_at || "").localeCompare(
          String(a.updated_at || a.created_at || ""),
        ),
      );
      const openTickets = clientTickets.filter(
        (ticket) => normalizeStatus(ticket.status) !== "closed",
      );
      const urgentTickets = clientTickets.filter((ticket) =>
        ["high", "urgent"].includes(normalizeStatus(ticket.priority)),
      );
      const nowIso = new Date().toISOString();
      const overdueTickets = openTickets.filter((ticket) => {
        const dueAt = ticket.resolution_due_at || ticket.first_response_due_at;
        return Boolean(dueAt && String(dueAt) < nowIso);
      });
      const reminderById = new Map<string, CalendarEventRow>();
      for (const reminder of remindersByClient.get(client.id) || []) {
        reminderById.set(reminder.id, reminder);
      }
      for (const project of clientProjects) {
        for (const reminder of remindersByProject.get(project.id) || []) {
          reminderById.set(reminder.id, reminder);
        }
      }
      const clientReminders = Array.from(reminderById.values()).sort((a, b) =>
        String(a.start_at || "").localeCompare(String(b.start_at || "")),
      );
      const openReminders = clientReminders.filter(
        (reminder) => !["completed", "cancelled"].includes(normalizeStatus(reminder.status)),
      );
      const overdueReminders = openReminders.filter((reminder) =>
        Boolean(reminder.start_at && String(reminder.start_at) < nowIso),
      );
      const upcomingReminders = openReminders.filter((reminder) =>
        Boolean(reminder.start_at && String(reminder.start_at) >= nowIso),
      );
      const clientVaultItems = (vaultItemsByClient.get(client.id) || []).sort((a, b) =>
        String(b.updated_at || b.created_at || "").localeCompare(
          String(a.updated_at || a.created_at || ""),
        ),
      );
      const criticalVaultItems = clientVaultItems.filter(
        (item) => normalizeStatus(item.sensitivity) === "critical",
      );
      const vaultItemsToReview = clientVaultItems.filter((item) =>
        ["needs_review", "expired"].includes(normalizeStatus(item.status)),
      );
      const clientProposals = proposalsByClient.get(client.id) || [];
      const clientDeals = dealsByClient.get(client.id) || [];
      const cps = (clientProductsByClient.get(client.id) || []) as ClientProductRow[];
      const purchasedProductById = new Map<
        string,
        { clientProduct: ClientProductRow; product: ProductRow | null }
      >();
      const addPurchasedProduct = (
        productId: string | null | undefined,
        source: string,
        sourceDate: string | null | undefined,
      ) => {
        if (!productId || purchasedProductById.has(productId)) return;
        purchasedProductById.set(productId, {
          clientProduct: {
            id: `${source}-${productId}`,
            company_id: client.company_id,
            client_id: client.id,
            product_id: productId,
            deal_id: null,
            status: source,
            start_date: sourceDate || null,
            end_date: null,
            price: null,
            billing_type: null,
            notes: null,
            created_at: sourceDate || client.created_at,
            updated_at: sourceDate || client.updated_at,
          },
          product: productById.get(productId) || null,
        });
      };
      cps.forEach((cp) => {
        if (!cp.product_id) return;
        purchasedProductById.set(cp.product_id, {
          clientProduct: cp,
          product: productById.get(cp.product_id) || null,
        });
      });
      clientProjects.forEach((project) =>
        addPurchasedProduct(
          project.product_id,
          "Proyecto",
          project.start_date || project.updated_at,
        ),
      );
      clientSubscriptions.forEach((subscription) =>
        addPurchasedProduct(subscription.product_id, "Suscripción", subscription.start_date),
      );
      clientInvoices.forEach((invoice) =>
        addPurchasedProduct(
          invoice.product_id,
          "Factura",
          invoice.date_issued || invoice.updated_at,
        ),
      );
      clientInvoiceItems.forEach((item) =>
        addPurchasedProduct(item.product_id, "Factura", item.created_at),
      );
      const purchasedProducts = Array.from(purchasedProductById.values());
      const purchasedProductNames = purchasedProducts
        .map((p) => p.product?.name || null)
        .filter(Boolean) as string[];

      const activeProjects = clientProjects.filter((project) =>
        isActiveProjectStatus(project.status),
      );
      const openTasks = clientTasks.filter((task) => isOpenTaskStatus(task.status));
      const overdueTasks = openTasks.filter((task) => isOverdue(task.due_date));
      const nextOpenTask = openTasks.slice().sort(compareDueDateAsc)[0] || null;
      const pendingInvoices = clientInvoices.filter(
        (invoice) =>
          isSentOrOverdueInvoiceStatus(invoice.status) ||
          normalizeStatus(invoice.status) === "partially_paid",
      );
      const overdueInvoices = clientInvoices.filter((invoice) =>
        isOverdueInvoiceStatus(invoice.status),
      );
      const pendingProposals = clientProposals.filter((proposal) =>
        isSentOrViewedProposalStatus(proposal.status),
      );
      const openDeals = clientDeals.filter((deal) => !isClosedDealStageValue(deal.stage));

      const pendingInvoiceAmount = pendingInvoices.reduce(
        (sum, invoice) =>
          sum +
          storedOrConvertedBaseMoney(
            invoice.total_base,
            invoice.base_currency,
            invoice.total,
            rowCurrency(invoice),
            currencySettings,
          ),
        0,
      );
      const invoicedAmount = clientInvoices
        .filter((invoice) => normalizeStatus(invoice.status) !== "cancelled")
        .reduce(
          (sum, invoice) =>
            sum +
            storedOrConvertedBaseMoney(
              invoice.total_base,
              invoice.base_currency,
              invoice.total,
              rowCurrency(invoice),
              currencySettings,
            ),
          0,
        );
      const paidAmount = completedPayments.reduce(
        (sum, payment) =>
          sum +
          storedOrConvertedBaseMoney(
            payment.amount_base,
            payment.base_currency,
            payment.amount,
            payment.currency || "USD",
            currencySettings,
          ),
        0,
      );
      const creditedAmount = appliedCreditNotes.reduce(
        (sum, creditNote) =>
          sum +
          storedOrConvertedBaseMoney(
            creditNote.amount_base,
            creditNote.base_currency,
            creditNote.amount,
            creditNote.currency || "USD",
            currencySettings,
          ),
        0,
      );
      const openPipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
      const latestActivityAt = maxDate([
        client.updated_at,
        ...clientContacts.map((contact) => contact.updated_at),
        ...clientInternalNotes.map((note) => note.updated_at),
        ...clientProjects.map((project) => project.updated_at),
        ...clientTasks.map((task) => task.updated_at),
        ...clientInvoices.map((invoice) => invoice.updated_at),
        ...clientCreditNotes.map((creditNote) => creditNote.updated_at),
        ...clientSubscriptions.map((subscription) => subscription.updated_at),
        ...clientExpenses.map((expense) => expense.updated_at),
        ...clientContracts.map((contract) => contract.updated_at),
        ...clientTickets.map((ticket) => ticket.updated_at),
        ...clientReminders.map((reminder) => reminder.updated_at),
        ...clientVaultItems.map((item) => item.updated_at),
        ...clientProposals.map((proposal) => proposal.updated_at),
        ...clientDeals.map((deal) => deal.updated_at),
      ]);

      const health = getClientHealth({
        status: client.status,
        overdueInvoices: overdueInvoices.length,
        overdueTasks: overdueTasks.length,
        pendingInvoices: pendingInvoices.length,
        openTasks: openTasks.length,
        contacts: clientContacts.length,
        primaryContact: !!primaryContact,
        latestActivityAt,
      });

      return {
        ...client,
        contacts: clientContacts,
        internalNotes: clientInternalNotes,
        primaryContact,
        purchasedProducts,
        purchasedProductNames,
        projects: clientProjects,
        activeProjects,
        tasks: clientTasks,
        openTasks,
        overdueTasks,
        nextOpenTask,
        invoices: clientInvoices,
        pendingInvoices,
        overdueInvoices,
        payments: clientPayments,
        completedPayments,
        totalPaidAmount: paidAmount,
        creditNotes: clientCreditNotes,
        appliedCreditNotes,
        totalCreditAmount: creditedAmount,
        financialBalance: invoicedAmount - paidAmount - creditedAmount,
        subscriptions: clientSubscriptions,
        activeSubscriptions,
        recurringAmount: activeSubscriptions.reduce(
          (sum, subscription) =>
            sum +
            storedOrConvertedBaseMoney(
              subscription.amount_base,
              subscription.base_currency,
              subscription.amount,
              subscription.currency || subscription.base_currency || currencySettings.baseCurrency,
              currencySettings,
            ),
          0,
        ),
        expenses: clientExpenses,
        paidExpenses,
        totalExpenseAmount: clientExpenses.reduce(
          (sum, expense) =>
            sum +
            storedOrConvertedBaseMoney(
              expense.amount_base,
              expense.base_currency,
              expense.amount,
              expense.currency || expense.base_currency || currencySettings.baseCurrency,
              currencySettings,
            ),
          0,
        ),
        contracts: clientContracts,
        activeContracts,
        expiringContracts,
        totalContractValue: clientContracts.reduce(
          (sum, contract) =>
            sum +
            storedOrConvertedBaseMoney(
              contract.contract_value_base,
              contract.base_currency,
              contract.contract_value,
              contract.currency || contract.base_currency || "USD",
              currencySettings,
            ),
          0,
        ),
        tickets: clientTickets,
        openTickets,
        urgentTickets,
        overdueTickets,
        reminders: clientReminders,
        openReminders,
        overdueReminders,
        upcomingReminders,
        vaultItems: clientVaultItems,
        criticalVaultItems,
        vaultItemsToReview,
        proposals: clientProposals,
        pendingProposals,
        deals: clientDeals,
        openDeals,
        accountManagerName: client.account_manager
          ? managerNameById.get(client.account_manager) || "Sin asignar"
          : "Sin asignar",
        health: health.health,
        healthReason: health.reason,
        healthTone: HEALTH_STYLES[health.health],
        pendingInvoiceAmount,
        openPipelineValue,
        latestActivityAt,
      };
    });
  }, [
    clients,
    clientProductsByClient,
    contactsByClient,
    contractsByClient,
    contractsByProject,
    creditNotesByClient,
    creditNotesByInvoice,
    currencySettings,
    dealsByClient,
    expensesByClient,
    expensesByProject,
    internalNotesByClient,
    invoiceItemsByInvoice,
    invoicesByClient,
    managerNameById,
    paymentsByClient,
    paymentsByInvoice,
    productById,
    projectsByClient,
    proposalsByClient,
    remindersByClient,
    remindersByProject,
    subscriptionsByClient,
    tasksByClient,
    tasksByProject,
    ticketsByClient,
    ticketsByProject,
    vaultItemsByClient,
  ]);

  const activeClientsCount = useMemo(
    () => snapshots.filter((client) => normalizeStatus(client.status) === "active").length,
    [snapshots],
  );
  const vipClientsCount = useMemo(
    () => snapshots.filter((client) => normalizeStatus(client.status) === "vip").length,
    [snapshots],
  );
  const riskClientsCount = useMemo(
    () => snapshots.filter((client) => client.health === "risk").length,
    [snapshots],
  );
  const contactsCount = contacts.length;
  const primaryContactsCount = contacts.filter((contact) => contact.is_primary).length;
  const activeProjectsCount = projects.filter((project) =>
    isActiveProjectStatus(project.status),
  ).length;
  const pendingInvoicesCount = invoices.filter(
    (invoice) =>
      isSentOrOverdueInvoiceStatus(invoice.status) ||
      normalizeStatus(invoice.status) === "partially_paid",
  ).length;
  const overdueTasksCount = tasks.filter(
    (task) => !isCompletedTaskStatusValue(task.status) && isOverdue(task.due_date),
  ).length;
  const pendingInvoiceAmount = invoices
    .filter(
      (invoice) =>
        isSentOrOverdueInvoiceStatus(invoice.status) ||
        normalizeStatus(invoice.status) === "partially_paid",
    )
    .reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.total_base ?? rowBaseMoney(invoice.total, rowCurrency(invoice), currencySettings),
        ),
      0,
    );

  const managerOptions = useMemo(() => managers.filter((manager) => manager.is_active), [managers]);
  const managerByUserId = useMemo(
    () =>
      new Map(
        managers.filter((manager) => manager.user_id).map((manager) => [manager.user_id, manager]),
      ),
    [managers],
  );
  const profileUserIdFromProfileId = (profileId: string | null | undefined) => {
    if (!profileId || profileId === "none") return null;
    return managers.find((manager) => manager.id === profileId)?.user_id || null;
  };
  const primaryProjectManagerProfileId = (assigneeIds: string[]) => {
    const firstUserId = normalizeProfilePickerIds(assigneeIds)[0];
    if (!firstUserId) return null;
    return managerByUserId.get(firstUserId)?.id || null;
  };
  const industryOptions = useMemo(() => {
    return Array.from(
      new Set(snapshots.map((client) => client.industry).filter(Boolean)),
    ) as string[];
  }, [snapshots]);

  const attentionCount = useMemo(
    () =>
      snapshots.filter((client) => client.health === "attention" || client.health === "risk")
        .length,
    [snapshots],
  );
  const missingPrimaryContactCount = useMemo(
    () => snapshots.filter((client) => !client.primaryContact).length,
    [snapshots],
  );

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return snapshots.filter((client) => {
      const primaryName = client.primaryContact
        ? getContactName(client.primaryContact)
        : client.contact_person || "";
      const managerName = client.accountManagerName;
      const matchSearch =
        !term ||
        [
          client.company_name,
          primaryName,
          client.email || "",
          client.phone || "",
          client.whatsapp || "",
          client.industry || "",
          client.notes || "",
          managerName,
          ...(client.tags || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchStatus =
        statusFilter === "all" || normalizeStatus(client.status) === normalizeStatus(statusFilter);
      const matchManager =
        managerFilter === "all" ||
        (managerFilter === "mine" && client.account_manager === profile?.id) ||
        (managerFilter === "unassigned" && !client.account_manager) ||
        client.account_manager === managerFilter;
      const matchIndustry = industryFilter === "all" || client.industry === industryFilter;
      const matchContactPresence =
        contactFilter === "all" ||
        (contactFilter === "with" && client.contacts.length > 0) ||
        (contactFilter === "without" && client.contacts.length === 0) ||
        (contactFilter === "primary" && !!client.primaryContact);
      const matchHealth = healthFilter === "all" || client.health === healthFilter;
      const matchFinance =
        financeFilter === "all" ||
        (financeFilter === "pending" && client.pendingInvoices.length > 0) ||
        (financeFilter === "overdue" && client.overdueInvoices.length > 0) ||
        (financeFilter === "clear" &&
          client.pendingInvoices.length === 0 &&
          client.overdueInvoices.length === 0);
      const matchActivity =
        activityFilter === "all" ||
        (activityFilter === "recent7" && daysSince(client.latestActivityAt) <= 7) ||
        (activityFilter === "stale30" && daysSince(client.latestActivityAt) > 30) ||
        (activityFilter === "stale60" && daysSince(client.latestActivityAt) > 60);

      return (
        matchSearch &&
        matchStatus &&
        matchManager &&
        matchIndustry &&
        matchContactPresence &&
        matchHealth &&
        matchFinance &&
        matchActivity
      );
    });
  }, [
    activityFilter,
    contactFilter,
    financeFilter,
    healthFilter,
    industryFilter,
    managerFilter,
    profile?.id,
    search,
    snapshots,
    statusFilter,
  ]);

  const selectedClient = useMemo(
    () => snapshots.find((client) => client.id === selectedClientId) || null,
    [selectedClientId, snapshots],
  );
  const accountStatement = useMemo(() => {
    if (!selectedClient) {
      return {
        currencies: [] as string[],
        movements: [] as AccountStatementMovement[],
        openingBalance: 0,
        invoiced: 0,
        paid: 0,
        credited: 0,
        closingBalance: 0,
        overdueBalance: 0,
        displayCurrency: currencySettings.baseCurrency,
      };
    }

    const useBase = statementCurrency === "all";
    const displayCurrency = useBase
      ? currencySettings.baseCurrency
      : normalizeCurrency(statementCurrency);
    const currencyOf = (row: any) =>
      normalizeCurrency(
        row.currency || String(row.invoice_data?.currency || "") || currencySettings.baseCurrency,
      );
    const currencies = Array.from(
      new Set([
        ...selectedClient.invoices.map(currencyOf),
        ...selectedClient.payments.map(currencyOf),
        ...selectedClient.creditNotes.map(currencyOf),
      ]),
    ).sort();
    const amount = (row: any, raw: number) => {
      const rowCurrencyValue = currencyOf(row);
      if (!useBase && rowCurrencyValue !== displayCurrency) return null;
      return useBase
        ? storedOrConvertedBaseMoney(
            row.total_base ?? row.amount_base,
            row.base_currency,
            raw,
            rowCurrencyValue,
            currencySettings,
          )
        : Number(raw || 0);
    };

    const raw = [
      ...selectedClient.invoices
        .filter((row) => normalizeStatus(row.status) !== "cancelled")
        .map((row) => {
          const value = amount(row, row.total);
          return value == null
            ? null
            : {
                id: "invoice-" + row.id,
                date: dateKey(row.date_issued || row.due_date || row.updated_at),
                type: "invoice" as const,
                reference: row.number || "Factura",
                description: "Factura emitida",
                debit: value,
                credit: 0,
                currency: displayCurrency,
                status: row.status,
              };
        }),
      ...selectedClient.completedPayments.map((row) => {
        const value = amount(row, row.amount);
        return value == null
          ? null
          : {
              id: "payment-" + row.id,
              date: dateKey(row.payment_date || row.created_at),
              type: "payment" as const,
              reference: row.payment_number || row.reference || "Pago",
              description: "Pago recibido · " + paymentLabel(row.method),
              debit: 0,
              credit: value,
              currency: displayCurrency,
              status: row.status,
            };
      }),
      ...selectedClient.appliedCreditNotes.map((row) => {
        const value = amount(row, row.amount);
        return value == null
          ? null
          : {
              id: "credit-" + row.id,
              date: dateKey(row.date_issued || row.created_at),
              type: "credit_note" as const,
              reference: row.credit_note_number
                ? "NC-" + row.credit_note_number
                : "Nota de crédito",
              description: row.reason || "Nota de crédito aplicada",
              debit: 0,
              credit: value,
              currency: displayCurrency,
              status: row.status,
            };
      }),
    ].filter(Boolean) as Array<Omit<AccountStatementMovement, "balance">>;

    raw.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const openingBalance = raw
      .filter((row) => statementFrom && row.date < statementFrom)
      .reduce((sum, row) => sum + row.debit - row.credit, 0);
    const period = raw.filter(
      (row) =>
        (!statementFrom || row.date >= statementFrom) && (!statementTo || row.date <= statementTo),
    );
    let running = openingBalance;
    const movements = period.map((row) => ({
      ...row,
      balance: (running += row.debit - row.credit),
    }));
    const invoiced = period.reduce((sum, row) => sum + row.debit, 0);
    const paid = period
      .filter((row) => row.type === "payment")
      .reduce((sum, row) => sum + row.credit, 0);
    const credited = period
      .filter((row) => row.type === "credit_note")
      .reduce((sum, row) => sum + row.credit, 0);
    const overdueBalance = selectedClient.overdueInvoices.reduce(
      (sum, invoice) => sum + Number(amount(invoice, invoice.total) || 0),
      0,
    );
    return {
      currencies,
      movements,
      openingBalance,
      invoiced,
      paid,
      credited,
      closingBalance: openingBalance + invoiced - paid - credited,
      overdueBalance,
      displayCurrency,
    };
  }, [currencySettings, selectedClient, statementCurrency, statementFrom, statementTo]);

  const exportAccountStatement = () => {
    if (!selectedClient) return;
    const rows = [
      [
        "Fecha",
        "Tipo",
        "Referencia",
        "Descripción",
        "Débito",
        "Crédito",
        "Saldo",
        "Moneda",
        "Estado",
      ],
      ...accountStatement.movements.map((row) => [
        row.date,
        row.type,
        row.reference,
        row.description,
        row.debit,
        row.credit,
        row.balance,
        row.currency,
        row.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "estado-cuenta-" +
      selectedClient.company_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() +
      ".csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printAccountStatement = () => {
    window.print();
  };

  const projectDialogClient = useMemo(
    () => snapshots.find((client) => client.id === projectClientId) || selectedClient,
    [projectClientId, selectedClient, snapshots],
  );
  const invoiceDialogClient = useMemo(
    () => snapshots.find((client) => client.id === invoiceClientId) || selectedClient,
    [invoiceClientId, selectedClient, snapshots],
  );
  const creditNoteDialogClient = useMemo(
    () => snapshots.find((client) => client.id === creditNoteClientId) || selectedClient,
    [creditNoteClientId, selectedClient, snapshots],
  );
  const subscriptionDialogClient = useMemo(
    () => snapshots.find((client) => client.id === subscriptionClientId) || selectedClient,
    [subscriptionClientId, selectedClient, snapshots],
  );
  const expenseDialogClient = useMemo(
    () => snapshots.find((client) => client.id === expenseClientId) || selectedClient,
    [expenseClientId, selectedClient, snapshots],
  );
  const contractDialogClient = useMemo(
    () => snapshots.find((client) => client.id === contractClientId) || selectedClient,
    [contractClientId, selectedClient, snapshots],
  );
  const contractInitialValues = useMemo(
    () => ({
      subject: contractDialogClient ? `Contrato ${contractDialogClient.company_name}` : "",
      client_id: contractDialogClient?.id || undefined,
      project_id: "none",
      assigned_to: contractDialogClient?.account_manager || profile?.id || "none",
      status: "Draft",
      contract_type: "Service Agreement",
      start_date: isoDate(),
    }),
    [
      contractDialogClient?.account_manager,
      contractDialogClient?.company_name,
      contractDialogClient?.id,
      profile?.id,
    ],
  );
  const ticketDialogClient = useMemo(
    () => snapshots.find((client) => client.id === ticketClientId) || selectedClient,
    [ticketClientId, selectedClient, snapshots],
  );
  const reminderDialogClient = useMemo(
    () => snapshots.find((client) => client.id === reminderClientId) || selectedClient,
    [reminderClientId, selectedClient, snapshots],
  );
  const vaultDialogClient = useMemo(
    () => snapshots.find((client) => client.id === vaultClientId) || selectedClient,
    [vaultClientId, selectedClient, snapshots],
  );

  const closeClientDetail = () => {
    openedClientSearchRef.current = null;
    setSelectedClientId(null);
    if (routeSearch.clientId) {
      void navigate({ to: "/clients", search: {}, replace: true });
    }
  };

  useEffect(() => {
    const clientId = routeSearch.clientId;
    if (!clientId) {
      openedClientSearchRef.current = null;
      return;
    }
    if (openedClientSearchRef.current === clientId) return;
    if (!snapshots.length) return;
    const exists = snapshots.some((client) => client.id === clientId);
    openedClientSearchRef.current = clientId;
    if (exists) setSelectedClientId(clientId);
  }, [routeSearch.clientId, snapshots]);

  const canCreateTaskForClient = (client: ClientSnapshot): boolean => {
    if (!profile?.company_id || !profile?.id) return false;
    if (!can("tasks.create")) return false;
    if (role === "viewer") return false;
    if (role === "sales_agent" || role === "collaborator")
      return Boolean(
        client.account_manager && String(client.account_manager) === String(profile.id),
      );
    return true;
  };

  const openCreateTaskForClient = (client: ClientSnapshot) => {
    setSelectedClientId(client.id);
    openGlobalTaskCreate({
      initialValues: {
        title: `Dar seguimiento a ${client.company_name}`,
        description: `Seguimiento creado desde Cliente 360.\nCliente: ${client.company_name}`,
        clientId: client.id,
        assignedTo:
          client.account_manager && managerUserIdByProfileId.get(client.account_manager)
            ? managerUserIdByProfileId.get(client.account_manager)
            : profile?.user_id || user?.id || undefined,
      },
    });
  };

  const openInvoiceCreator = (client: ClientSnapshot) => {
    if (!can("invoices.create")) {
      toast.error("No tienes permiso para crear facturas");
      return;
    }
    setSelectedClientId(client.id);
    setInvoiceClientId(client.id);
    setInvoiceError(null);
    setInvoiceDialogOpen(true);
  };

  const openPaymentCreator = (client: ClientSnapshot, invoice?: InvoiceRow | null) => {
    if (!can("payments.create")) {
      toast.error("No tienes permiso para crear pagos");
      return;
    }
    setSelectedClientId(client.id);
    setPaymentInitialValues({
      reference: invoice?.number ? `Pago ${invoice.number}` : `Pago ${client.company_name}`,
      invoice_id: invoice?.id || null,
      client_id: client.id,
      amount: invoice?.total ? String(invoice.total) : "0",
      status: "Completed",
      method: "Manual",
    });
    setPaymentDialogOpen(true);
  };

  const openCreditNoteCreator = (client: ClientSnapshot) => {
    if (!can("credit_notes.issue")) {
      toast.error("No tienes permiso para crear notas de crédito");
      return;
    }
    setSelectedClientId(client.id);
    setCreditNoteClientId(client.id);
    setCreditNoteDialogOpen(true);
  };

  const openSubscriptionCreator = (client: ClientSnapshot) => {
    if (!can("subscriptions.create")) {
      toast.error("No tienes permiso para crear suscripciones");
      return;
    }
    setSelectedClientId(client.id);
    setSubscriptionClientId(client.id);
    setSubscriptionDialogOpen(true);
  };

  const openExpenseCreator = (client: ClientSnapshot) => {
    if (!can("expenses.create")) {
      toast.error("No tienes permiso para crear gastos");
      return;
    }
    setSelectedClientId(client.id);
    setExpenseClientId(client.id);
    setExpenseDialogOpen(true);
  };

  const openContractCreator = (client: ClientSnapshot) => {
    if (!can("contracts.create")) {
      toast.error("No tienes permiso para crear contratos");
      return;
    }
    setSelectedClientId(client.id);
    setContractClientId(client.id);
    setContractDialogOpen(true);
  };

  const openTicketCreator = (client: ClientSnapshot) => {
    if (!can("tickets.create")) {
      toast.error("No tienes permiso para crear tickets");
      return;
    }
    setSelectedClientId(client.id);
    setTicketClientId(client.id);
    setTicketDialogOpen(true);
  };

  const openReminderCreator = (client: ClientSnapshot) => {
    if (!profile?.company_id || !profile?.user_id) {
      toast.error("No se pudo identificar tu sesión.");
      return;
    }
    setSelectedClientId(client.id);
    setReminderClientId(client.id);
    setReminderDialogOpen(true);
  };

  const openVaultCreator = (client: ClientSnapshot) => {
    if (!canManageVault) {
      toast.error("Vault está reservado para administración y gerencia.");
      return;
    }
    setSelectedClientId(client.id);
    setVaultClientId(client.id);
    setVaultDialogOpen(true);
  };

  const openClient360QuickDetail = (
    group: Client360QuickDetailGroup,
    id: string | null | undefined,
  ) => {
    if (!id) return;
    window.dispatchEvent(
      new CustomEvent("corevix:open-global-detail", {
        detail: { group, id },
      }),
    );
  };

  const renderClient360QuickDetailButton = (
    group: Client360QuickDetailGroup,
    id: string | null | undefined,
    label: string,
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
      onClick={() => openClient360QuickDetail(group, id)}
      aria-label={label}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );

  const toggleVaultReveal = (item: VaultItemRow) => {
    setRevealedVaultItemIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
        void logActivityEvent({
          companyId: profile?.company_id,
          userId: profile?.id || null,
          action: "client_vault_secret_revealed",
          entityType: "vault_item",
          entityId: item.id,
          detail: `Se reveló un secreto de Vault desde Cliente 360: ${item.title}`,
          metadata: { client_id: item.client_id, category: item.category },
          dedupeWindowSeconds: 30,
        }).catch(() => {});
      }
      return next;
    });
  };

  const copyVaultSecret = async (item: VaultItemRow) => {
    if (!item.secret_value) {
      toast.info("Este acceso no tiene secreto guardado.");
      return;
    }
    try {
      await navigator.clipboard.writeText(item.secret_value);
      toast.success("Secreto copiado.");
      void logActivityEvent({
        companyId: profile?.company_id,
        userId: profile?.id || null,
        action: "client_vault_secret_copied",
        entityType: "vault_item",
        entityId: item.id,
        detail: `Se copió un secreto de Vault desde Cliente 360: ${item.title}`,
        metadata: { client_id: item.client_id, category: item.category },
        dedupeWindowSeconds: 30,
      }).catch(() => {});
    } catch {
      toast.error("No se pudo copiar el secreto.");
    }
  };

  const handleClientPaymentCreated = async (_result: PaymentFormCreatedResult) => {
    await Promise.all([fetchPayments(), fetchInvoices()]);
    toast.success("Pago registrado en el cliente.");
  };

  const handleCreditNoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("credit_notes.issue")) {
      toast.error("No tienes permiso para crear notas de crédito");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const client = creditNoteClientId
      ? snapshots.find((item) => item.id === creditNoteClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de crear la nota.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount") || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("El monto debe ser mayor que 0.");
      return;
    }

    const invoiceId = normalizeNullableSelectValue(formData.get("invoice_id"));
    const payload = {
      client_id: client.id,
      invoice_id: invoiceId,
      amount,
      status: String(formData.get("status") || "Draft"),
      date_issued: String(formData.get("date_issued") || isoDate()),
      reason: String(formData.get("reason") || "").trim() || "Ajuste de factura",
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id || null,
    };

    setCreditNoteSaving(true);
    try {
      const { data: rpcResult, error: rpcError } = await db.rpc("save_credit_note", {
        p_credit_note_id: null,
        p_invoice_id: invoiceId,
        p_client_id: client.id,
        p_amount: amount,
        p_date_issued: payload.date_issued,
        p_reason: payload.reason,
        p_notes: payload.notes,
      });

      if (rpcError) throw rpcError;

      const saved = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

      if (!saved?.credit_note_id) {
        throw new Error("No se pudo confirmar la nota de crédito.");
      }

      const created = {
        id: saved.credit_note_id,
        credit_note_number: saved.credit_note_number,
        status: saved.status,
      };

      await Promise.all([fetchCreditNotes(), fetchInvoices()]);
      setCreditNoteDialogOpen(false);
      setCreditNoteClientId(null);
      toast.success("Nota de crédito creada.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "credit_note_created_from_client",
        entityType: "credit_notes",
        entityId: created?.id || null,
        detail: `Nota de crédito creada para ${client.company_name}`,
        metadata: { client_id: client.id, invoice_id: invoiceId, amount },
      }).catch(() => {});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la nota de crédito.";
      toast.error(message);
    } finally {
      setCreditNoteSaving(false);
    }
  };

  const handleSubscriptionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("subscriptions.create")) {
      toast.error("No tienes permiso para crear suscripciones");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const client = subscriptionClientId
      ? snapshots.find((item) => item.id === subscriptionClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de crear la suscripción.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount") || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("El monto no puede ser negativo.");
      return;
    }
    const currency = currencySettings.baseCurrency;

    const payload = {
      name: String(formData.get("name") || "").trim(),
      client_id: client.id,
      product_id: normalizeNullableSelectValue(formData.get("product_id")),
      amount,
      currency,
      base_currency: currencySettings.baseCurrency,
      exchange_rate: 1,
      exchange_rate_source: currencySettings.rateSource,
      exchange_rate_updated_at: currencySettings.rateUpdatedAt,
      amount_base: amount,
      billing_cycle: String(formData.get("billing_cycle") || "Monthly"),
      status: String(formData.get("status") || "Active"),
      start_date: String(formData.get("start_date") || isoDate()),
      next_billing_date: normalizeNullableSelectValue(formData.get("next_billing_date")),
      end_date: normalizeNullableSelectValue(formData.get("end_date")),
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id || null,
    };

    if (!payload.name) {
      toast.error("El nombre de la suscripción es obligatorio.");
      return;
    }

    setSubscriptionSaving(true);
    try {
      const created = await createSubscription(payload as Partial<SubscriptionRow>);
      await fetchSubscriptions();
      setSubscriptionDialogOpen(false);
      setSubscriptionClientId(null);
      toast.success("Suscripción creada.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "subscription_created_from_client",
        entityType: "subscriptions",
        entityId: created?.id || null,
        detail: `Suscripción ${payload.name} creada para ${client.company_name}`,
        metadata: { client_id: client.id, product_id: payload.product_id, amount },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la suscripción.";
      toast.error(message);
    } finally {
      setSubscriptionSaving(false);
    }
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("expenses.create")) {
      toast.error("No tienes permiso para crear gastos");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const client = expenseClientId
      ? snapshots.find((item) => item.id === expenseClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de crear el gasto.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount") || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("El monto no puede ser negativo.");
      return;
    }
    const currency = currencySettings.baseCurrency;

    const payload = {
      title: String(formData.get("title") || "").trim(),
      vendor: String(formData.get("vendor") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || "General",
      amount,
      currency,
      base_currency: currencySettings.baseCurrency,
      amount_base: amount,
      status: String(formData.get("status") || "Pending"),
      expense_date: String(formData.get("expense_date") || isoDate()),
      project_id: normalizeNullableSelectValue(formData.get("project_id")),
      client_id: client.id,
      receipt_url: String(formData.get("receipt_url") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id || null,
    };

    if (!payload.title) {
      toast.error("El título del gasto es obligatorio.");
      return;
    }

    setExpenseSaving(true);
    try {
      const created = await createExpense(payload as Partial<ExpenseRow>);
      await fetchExpenses();
      setExpenseDialogOpen(false);
      setExpenseClientId(null);
      toast.success("Gasto creado.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "expense_created_from_client",
        entityType: "expenses",
        entityId: created?.id || null,
        detail: `Gasto ${payload.title} creado para ${client.company_name}`,
        metadata: { client_id: client.id, project_id: payload.project_id, amount },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el gasto.";
      toast.error(message);
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleTicketSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("tickets.create")) {
      toast.error("No tienes permiso para crear tickets");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const client = ticketClientId
      ? snapshots.find((item) => item.id === ticketClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de crear el ticket.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      subject: String(formData.get("subject") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      status: String(formData.get("status") || "Open"),
      priority: String(formData.get("priority") || "Medium"),
      department: String(formData.get("department") || "").trim() || "Support",
      service: String(formData.get("service") || "").trim() || null,
      source: "manual",
      tags: [],
      client_id: client.id,
      contact_id: normalizeNullableSelectValue(formData.get("contact_id")),
      project_id: normalizeNullableSelectValue(formData.get("project_id")),
      assigned_to: normalizeNullableSelectValue(formData.get("assigned_to")),
      created_by: profile.id || null,
    };

    if (!payload.subject) {
      toast.error("El asunto del ticket es obligatorio.");
      return;
    }

    setTicketSaving(true);
    try {
      const created = await createTicket(payload as Partial<TicketRow>);
      await fetchTickets();
      setTicketDialogOpen(false);
      setTicketClientId(null);
      toast.success("Ticket creado.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "ticket_created_from_client",
        entityType: "tickets",
        entityId: created?.id || null,
        detail: `Ticket ${payload.subject} creado para ${client.company_name}`,
        metadata: {
          client_id: client.id,
          contact_id: payload.contact_id,
          project_id: payload.project_id,
          priority: payload.priority,
        },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el ticket.";
      toast.error(message);
    } finally {
      setTicketSaving(false);
    }
  };

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id || !profile?.user_id) {
      toast.error("No se pudo identificar tu sesión.");
      return;
    }

    const client = reminderClientId
      ? snapshots.find((item) => item.id === reminderClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de crear el recordatorio.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    const startAtInput = String(formData.get("start_at") || "").trim();
    const startAt = dateTimeLocalInputToIso(startAtInput);
    if (!title) {
      toast.error("El título del recordatorio es obligatorio.");
      return;
    }
    if (!startAt) {
      toast.error("Selecciona fecha y hora para el recordatorio.");
      return;
    }

    const payload = {
      user_id: profile.user_id,
      title,
      description: String(formData.get("description") || "").trim() || null,
      location: String(formData.get("location") || "").trim() || null,
      type: String(formData.get("type") || "reminder"),
      status: "scheduled",
      start_at: startAt,
      end_at: null,
      all_day: false,
      related_client_id: client.id,
      related_project_id: normalizeNullableSelectValue(formData.get("related_project_id")),
      metadata: { created_from: "client_360" },
    };

    setReminderSaving(true);
    try {
      const created = await createCalendarEvent(payload as Partial<CalendarEventRow>);
      await fetchCalendarEvents();
      setReminderDialogOpen(false);
      setReminderClientId(null);
      toast.success("Recordatorio creado.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "reminder_created_from_client",
        entityType: "calendar_events",
        entityId: created?.id || null,
        detail: `${CLIENT_REMINDER_LABELS[payload.type] || "Recordatorio"} creado para ${client.company_name}`,
        metadata: {
          client_id: client.id,
          project_id: payload.related_project_id,
          start_at: payload.start_at,
          type: payload.type,
        },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el recordatorio.";
      toast.error(message);
    } finally {
      setReminderSaving(false);
    }
  };

  const handleVaultSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageVault) {
      toast.error("Vault está reservado para administración y gerencia.");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const client = vaultClientId
      ? snapshots.find((item) => item.id === vaultClientId) || null
      : selectedClient;
    if (!client) {
      toast.error("Selecciona un cliente antes de guardar en Vault.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      toast.error("El nombre del acceso es obligatorio.");
      return;
    }

    const payload = {
      title,
      category: String(formData.get("category") || "login"),
      status: String(formData.get("status") || "active"),
      sensitivity: String(formData.get("sensitivity") || "restricted"),
      client_id: client.id,
      project_id: normalizeNullableSelectValue(formData.get("project_id")),
      owner_id: normalizeNullableSelectValue(formData.get("owner_id")),
      url: String(formData.get("url") || "").trim() || null,
      username: String(formData.get("username") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      secret_value: String(formData.get("secret_value") || "").trim() || null,
      expires_at: normalizeNullableSelectValue(formData.get("expires_at")),
      tags: splitTags(String(formData.get("tags") || "")),
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id || null,
      updated_by: profile.id || null,
    };

    setVaultSaving(true);
    try {
      const created = await createVaultItem(payload as Partial<VaultItemRow>);
      await fetchVaultItems();
      setVaultDialogOpen(false);
      setVaultClientId(null);
      toast.success("Acceso guardado en Vault.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "vault_item_created_from_client",
        entityType: "vault_item",
        entityId: created?.id || null,
        detail: `Acceso de Vault creado para ${client.company_name}: ${title}`,
        metadata: {
          client_id: client.id,
          project_id: payload.project_id,
          category: payload.category,
          sensitivity: payload.sensitivity,
        },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar en Vault.";
      toast.error(message);
    } finally {
      setVaultSaving(false);
    }
  };

  const invoiceInitialDraft = useMemo<InvoiceEditorDraft>(() => {
    const client = invoiceDialogClient;
    const primaryContact = client?.primaryContact || null;
    const firstPurchasedProduct = client?.purchasedProducts[0]?.product || null;
    const productDescription =
      cleanInvoiceText(firstPurchasedProduct?.description) ||
      cleanInvoiceText(firstPurchasedProduct?.name) ||
      "";
    const productPrice = Math.max(0, Number(firstPurchasedProduct?.base_price || 0) || 0);
    const initialItems: InvoiceEditorItem[] = productDescription
      ? [
          {
            product_id: firstPurchasedProduct?.id || null,
            item_name: cleanInvoiceText(firstPurchasedProduct?.name) || productDescription,
            description: productDescription,
            quantity: 1,
            unit_type: "qty",
            unit_price: productPrice,
            total: productPrice,
            is_optional: false,
          },
        ]
      : [
          {
            product_id: null,
            item_name: "",
            description: "",
            quantity: 1,
            unit_type: "qty",
            unit_price: 0,
            total: 0,
            is_optional: false,
          },
        ];

    return {
      number: `INV-${Date.now().toString().slice(-6)}`,
      status: "Draft",
      client_id: client?.id || null,
      proposal_id: null,
      product_id: firstPurchasedProduct?.id || null,
      currency: cleanInvoiceText(firstPurchasedProduct?.currency) || "USD",
      date_issued: isoDate(),
      due_date: isoDate(30),
      notes: null,
      clientName: cleanInvoiceText(primaryContact ? getContactName(primaryContact) : null),
      clientCompany: cleanInvoiceText(client?.company_name),
      clientEmail: cleanInvoiceText(primaryContact?.email) || cleanInvoiceText(client?.email),
      clientPhone:
        cleanInvoiceText(primaryContact?.phone) ||
        cleanInvoiceText(primaryContact?.whatsapp) ||
        cleanInvoiceText(client?.phone) ||
        cleanInvoiceText(client?.whatsapp),
      clientAddress: cleanInvoiceText(
        [client?.address, client?.city, client?.country].filter(Boolean).join(", "),
      ),
      clientTaxId: cleanInvoiceText(client?.tax_id),
      issuerName: null,
      issuerTaxId: null,
      issuerEmail: null,
      issuerPhone: null,
      issuerAddress: null,
      issuerWebsite: null,
      relatedProposalNumber: null,
      relatedProposalTitle: null,
      productName: cleanInvoiceText(firstPurchasedProduct?.name),
      tax: 0,
      discount: 0,
      legacySubtotal: 0,
      items: initialItems,
    };
  }, [invoiceDialogClient]);

  const saveClientInvoiceDraft = async (
    draft: InvoiceEditorDraft,
    nextStatus: "Draft" | "Sent",
  ) => {
    if (!profile?.company_id) {
      setInvoiceError("No se pudo identificar tu compañía.");
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    const rows = draft.items
      .map((item, index) => {
        const itemName = String(item.item_name || item.description || "").trim();
        const description = String(item.description || item.item_name || "").trim();
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        return {
          product_id: item.product_id || null,
          item_name: itemName,
          description,
          quantity: Number.isFinite(quantity) ? quantity : Number.NaN,
          unit_type: item.unit_type || "qty",
          unit_price: Number.isFinite(unitPrice) ? unitPrice : Number.NaN,
          is_optional: item.is_optional === true,
          sort_order: index,
          document_currency: item.document_currency || draft.currency || null,
          original_currency: item.original_currency || draft.currency || null,
          original_unit_price:
            item.original_unit_price === null || item.original_unit_price === undefined
              ? unitPrice
              : Number(item.original_unit_price),
          converted_unit_price:
            item.converted_unit_price === null || item.converted_unit_price === undefined
              ? unitPrice
              : Number(item.converted_unit_price),
          exchange_rate:
            item.exchange_rate === null || item.exchange_rate === undefined
              ? null
              : Number(item.exchange_rate),
          exchange_rate_source: item.exchange_rate_source || null,
          exchange_rate_updated_at: item.exchange_rate_updated_at || null,
          tax_id: item.tax_id || null,
          tax_name: item.tax_name || null,
          tax_rate:
            item.tax_rate === null || item.tax_rate === undefined ? 0 : Number(item.tax_rate),
          tax_amount:
            item.tax_amount === null || item.tax_amount === undefined ? 0 : Number(item.tax_amount),
        };
      })
      .filter((item) => item.item_name || item.description || item.unit_price > 0);

    for (const row of rows) {
      if (!row.item_name && !row.description) {
        setInvoiceError("Cada línea debe tener descripción.");
        toast.error("Cada línea debe tener descripción.");
        return;
      }
      if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
        setInvoiceError("La cantidad debe ser mayor que 0.");
        toast.error("La cantidad debe ser mayor que 0.");
        return;
      }
      if (!Number.isFinite(row.unit_price) || row.unit_price < 0) {
        setInvoiceError("El precio unitario no puede ser negativo.");
        toast.error("El precio unitario no puede ser negativo.");
        return;
      }
    }

    const record = {
      number: cleanInvoiceText(draft.number) || `INV-${Date.now().toString().slice(-6)}`,
      client_id: draft.client_id || invoiceDialogClient?.id || null,
      proposal_id: draft.proposal_id || null,
      product_id: draft.product_id || null,
      tax: Math.max(0, Number(draft.tax || 0) || 0),
      discount: Math.max(0, Number(draft.discount || 0) || 0),
      status: nextStatus,
      date_issued: cleanInvoiceText(draft.date_issued) || isoDate(),
      due_date: cleanInvoiceText(draft.due_date) || isoDate(30),
      notes: cleanInvoiceText(draft.notes),
      payment_link: null,
      ...(nextStatus === "Sent" ? { sent_at: new Date().toISOString() } : {}),
      invoice_data: {
        currency: cleanInvoiceText(draft.currency) || "USD",
        clientName: cleanInvoiceText(draft.clientName),
        clientCompany: cleanInvoiceText(draft.clientCompany),
        clientEmail: cleanInvoiceText(draft.clientEmail),
        clientPhone: cleanInvoiceText(draft.clientPhone),
        clientAddress: cleanInvoiceText(draft.clientAddress),
        clientTaxId: cleanInvoiceText(draft.clientTaxId),
        issuerName: cleanInvoiceText(draft.issuerName),
        issuerTaxId: cleanInvoiceText(draft.issuerTaxId),
        issuerEmail: cleanInvoiceText(draft.issuerEmail),
        issuerPhone: cleanInvoiceText(draft.issuerPhone),
        issuerAddress: cleanInvoiceText(draft.issuerAddress),
        issuerWebsite: cleanInvoiceText(draft.issuerWebsite),
        relatedProposalNumber: cleanInvoiceText(draft.relatedProposalNumber),
        relatedProposalTitle: cleanInvoiceText(draft.relatedProposalTitle),
        productName: cleanInvoiceText(draft.productName),
      },
    };

    setInvoiceSaving(true);
    setInvoiceError(null);
    try {
      const db = supabase as any;
      const { data: savedResult, error } = await db.rpc("save_invoice_with_items", {
        p_invoice_id: null,
        p_invoice: record,
        p_items: rows.map((row) => ({
          product_id: row.product_id,
          item_name: row.item_name,
          description: row.description,
          quantity: row.quantity,
          unit_type: row.unit_type,
          unit_price: row.unit_price,
          is_optional: row.is_optional,
          document_currency: row.document_currency,
          original_currency: row.original_currency,
          original_unit_price: row.original_unit_price,
          converted_unit_price: row.converted_unit_price,
          exchange_rate: row.exchange_rate,
          exchange_rate_source: row.exchange_rate_source,
          exchange_rate_updated_at: row.exchange_rate_updated_at,
          tax_id: row.tax_id,
          tax_name: row.tax_name,
          tax_rate: row.tax_rate,
          tax_amount: row.tax_amount,
        })),
      });
      if (error) throw error;
      const rpcRow = Array.isArray(savedResult) ? savedResult[0] : savedResult;
      const invoiceId = String(rpcRow?.invoice_id || "");
      if (!invoiceId) throw new Error("No se pudo confirmar el ID de la factura guardada.");

      await fetchInvoices();
      setInvoiceDialogOpen(false);
      setInvoiceClientId(null);
      toast.success(nextStatus === "Sent" ? "Factura marcada como enviada." : "Factura creada.");
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: nextStatus === "Sent" ? "invoice_sent_from_client" : "invoice_created_from_client",
        entityType: "invoices",
        entityId: invoiceId,
        detail: `Factura ${record.number} creada desde Cliente 360`,
        metadata: { client_id: record.client_id },
      }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la factura.";
      setInvoiceError(message);
      toast.error(message);
    } finally {
      setInvoiceSaving(false);
    }
  };

  const summaryNote = useMemo(() => {
    if (attentionCount === 0) {
      return "Todo está bajo control por ahora.";
    }
    return `Hoy tienes ${attentionCount} cuentas que necesitan atención para no perder oportunidades.`;
  }, [attentionCount]);

  const activityFeed = useMemo<ActivityItem[]>(() => {
    if (!selectedClient) return [];

    const relatedLeadIds = new Set<string>();
    const relatedEntityIds = new Set<string>([selectedClient.id]);
    selectedClient.contacts.forEach((contact) => relatedEntityIds.add(contact.id));
    selectedClient.internalNotes.forEach((note) => relatedEntityIds.add(note.id));
    selectedClient.projects.forEach((project) => relatedEntityIds.add(project.id));
    selectedClient.tasks.forEach((task) => relatedEntityIds.add(task.id));
    selectedClient.invoices.forEach((invoice) => relatedEntityIds.add(invoice.id));
    selectedClient.creditNotes.forEach((creditNote) => relatedEntityIds.add(creditNote.id));
    selectedClient.subscriptions.forEach((subscription) => relatedEntityIds.add(subscription.id));
    selectedClient.expenses.forEach((expense) => relatedEntityIds.add(expense.id));
    selectedClient.contracts.forEach((contract) => relatedEntityIds.add(contract.id));
    selectedClient.tickets.forEach((ticket) => relatedEntityIds.add(ticket.id));
    selectedClient.reminders.forEach((reminder) => relatedEntityIds.add(reminder.id));
    selectedClient.vaultItems.forEach((item) => relatedEntityIds.add(item.id));
    selectedClient.proposals.forEach((proposal) => relatedEntityIds.add(proposal.id));
    selectedClient.deals.forEach((deal) => {
      relatedEntityIds.add(deal.id);
      if (deal.lead_id) relatedLeadIds.add(deal.lead_id);
    });

    const activityTitleByAction: Record<string, string> = {
      lead_created: "Prospecto creado",
      lead_updated: "Prospecto actualizado",
      deal_created: "Oportunidad creada",
      deal_moved: "Oportunidad movida",
      proposal_created: "Propuesta creada",
      proposal_sent: "Propuesta enviada",
      proposal_approved: "Propuesta aprobada",
      invoice_created: "Factura creada",
      invoice_sent: "Factura enviada",
      invoice_paid: "Factura pagada",
      credit_note_created_from_client: "Nota de crédito creada",
      subscription_created_from_client: "Suscripción creada",
      expense_created_from_client: "Gasto creado",
      contract_created_from_client: "Contrato creado",
      contract_updated: "Contrato actualizado",
      ticket_created_from_client: "Ticket creado",
      reminder_created_from_client: "Recordatorio creado",
      vault_item_created_from_client: "Acceso de Vault creado",
      client_vault_secret_revealed: "Secreto de Vault revelado",
      client_vault_secret_copied: "Secreto de Vault copiado",
      client_note_created: "Nota interna creada",
      client_note_updated: "Nota interna actualizada",
      client_note_archived: "Nota interna archivada",
      project_created: "Proyecto creado",
      project_updated: "Proyecto actualizado",
      task_created: "Tarea creada",
      task_completed: "Tarea completada",
      client_created: "Cliente creado",
      client_updated: "Cliente actualizado",
    };

    const activityToneByEntity: Record<string, string> = {
      leads: "bg-blue-50 text-blue-700",
      deals: "bg-sky-50 text-sky-700",
      proposals: "bg-violet-50 text-violet-700",
      invoices: "bg-amber-50 text-amber-700",
      credit_notes: "bg-orange-50 text-orange-700",
      subscriptions: "bg-emerald-50 text-emerald-700",
      expenses: "bg-orange-50 text-orange-700",
      contracts: "bg-slate-50 text-slate-700",
      tickets: "bg-blue-50 text-blue-700",
      calendar_events: "bg-amber-50 text-amber-700",
      vault_item: "bg-blue-50 text-blue-700",
      projects: "bg-emerald-50 text-emerald-700",
      tasks: "bg-rose-50 text-rose-700",
      client_notes: "bg-slate-50 text-slate-700",
      clients: "bg-emerald-50 text-emerald-700",
    };

    const activityIconByEntity: Record<string, ComponentType<{ className?: string }>> = {
      leads: Users,
      deals: BriefcaseBusiness,
      proposals: FileText,
      invoices: Receipt,
      credit_notes: FileText,
      subscriptions: Activity,
      expenses: Receipt,
      contracts: ShieldAlert,
      tickets: MessageSquarePlus,
      calendar_events: CalendarClock,
      vault_item: ShieldAlert,
      projects: FolderKanban,
      tasks: Clock3,
      client_notes: FileText,
      clients: Activity,
    };

    const logItems = activityLogs
      .filter((log) => {
        const metadataClientId =
          log.metadata && typeof log.metadata === "object"
            ? String((log.metadata as Record<string, unknown>).client_id || "")
            : "";
        if (metadataClientId === selectedClient.id) return true;
        if (!log.entity_id) return false;
        if (relatedEntityIds.has(log.entity_id)) return true;
        return log.entity_type === "leads" && relatedLeadIds.has(log.entity_id);
      })
      .map((log) => {
        const entityLabel = activityTitleByAction[log.action] || `${log.entity_type} actualizado`;
        const detail = log.detail || entityLabel;
        const icon = activityIconByEntity[log.entity_type] || Activity;
        const tone = activityToneByEntity[log.entity_type] || "bg-slate-50 text-slate-700";
        return {
          id: log.id,
          title: entityLabel,
          description: detail,
          at: log.created_at,
          icon,
          tone,
        } satisfies ActivityItem;
      });
    const coveredNoteIds = new Set(
      activityLogs
        .filter((log) => log.entity_type === "client_notes" && log.entity_id)
        .map((log) => String(log.entity_id)),
    );
    const coveredProjectIds = new Set(
      activityLogs
        .filter((log) => log.entity_type === "projects" && log.entity_id)
        .map((log) => String(log.entity_id)),
    );
    const coveredTaskIds = new Set(
      activityLogs
        .filter((log) => log.entity_type === "tasks" && log.entity_id)
        .map((log) => String(log.entity_id)),
    );

    const items: ActivityItem[] = [];

    selectedClient.internalNotes.slice(0, 4).forEach((note) => {
      if (coveredNoteIds.has(note.id)) return;
      items.push({
        id: `client-note-${note.id}`,
        title:
          note.created_at === note.updated_at ? "Nota interna creada" : "Nota interna actualizada",
        description: note.content || "Nota interna del cliente",
        at: note.updated_at || note.created_at,
        icon: FileText,
        tone: "bg-slate-50 text-slate-700",
      });
    });

    selectedClient.projects.slice(0, 4).forEach((project) => {
      if (coveredProjectIds.has(project.id)) return;
      const progress = projectProgressFromTasks(project, selectedClient.tasks);
      items.push({
        id: `project-${project.id}`,
        title: "Proyecto actualizado",
        description: `${project.name} · ${projectLabel(project.status)} · ${progress}%`,
        at: project.updated_at,
        icon: FolderKanban,
        tone: "bg-emerald-50 text-emerald-700",
      });
    });

    selectedClient.tasks.slice(0, 4).forEach((task) => {
      if (coveredTaskIds.has(task.id)) return;
      const project = task.related_project_id ? projectById.get(task.related_project_id) : null;
      items.push({
        id: `task-activity-${task.id}`,
        title: isCompletedTaskStatusValue(task.status) ? "Tarea completada" : "Tarea actualizada",
        description: `${task.title}${task.description ? ` · ${task.description}` : ""}${
          task.due_date ? ` · Vence ${formatDate(task.due_date)}` : ""
        }${project ? ` · ${project.name}` : ""}`,
        at: task.updated_at,
        icon: Clock3,
        tone: isCompletedTaskStatusValue(task.status)
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blue-50 text-blue-700",
      });
    });

    selectedClient.contacts.slice(0, 4).forEach((contact) => {
      items.push({
        id: `contact-${contact.id}`,
        title: `Contacto ${contact.is_primary ? "principal" : "registrado"}`,
        description: `${getContactName(contact)}${contact.position ? ` · ${contact.position}` : ""}`,
        at: contact.updated_at,
        icon: Users,
        tone: "bg-blue-50 text-blue-700",
      });
    });

    selectedClient.overdueInvoices.slice(0, 3).forEach((invoice) => {
      items.push({
        id: `invoice-overdue-${invoice.id}`,
        title: `Factura vencida ${invoice.number}`,
        description: `${money(invoice.total, rowCurrency(invoice))} · Vence ${formatDate(invoice.due_date)}`,
        at: invoice.updated_at,
        icon: Receipt,
        tone: "bg-rose-50 text-rose-700",
      });
    });

    selectedClient.pendingInvoices.slice(0, 3).forEach((invoice) => {
      items.push({
        id: `invoice-${invoice.id}`,
        title: `Factura pendiente ${invoice.number}`,
        description: `${money(invoice.total, rowCurrency(invoice))} · Estado ${invoice.status}`,
        at: invoice.updated_at,
        icon: CircleDollarSign,
        tone: "bg-amber-50 text-amber-700",
      });
    });

    selectedClient.openTasks.slice(0, 4).forEach((task) => {
      const overdue = isOverdue(task.due_date);
      items.push({
        id: `task-${task.id}`,
        title: overdue ? "Tarea atrasada" : "Tarea pendiente",
        description: `${task.title} · ${task.priority}${task.due_date ? ` · Vence ${formatDate(task.due_date)}` : ""}`,
        at: task.updated_at,
        icon: Clock3,
        tone: overdue ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700",
      });
    });

    selectedClient.payments.slice(0, 3).forEach((payment) => {
      items.push({
        id: `payment-${payment.id}`,
        title: "Pago registrado",
        description: `${money(payment.amount, payment.currency)} · ${paymentLabel(payment.method)} · ${paymentLabel(payment.status)}`,
        at: payment.updated_at || payment.created_at,
        icon: CircleDollarSign,
        tone: "bg-emerald-50 text-emerald-700",
      });
    });

    selectedClient.creditNotes.slice(0, 3).forEach((creditNote) => {
      items.push({
        id: `credit-note-${creditNote.id}`,
        title: "Nota de crédito",
        description: `${money(creditNote.amount, creditNote.currency)} · ${creditNote.reason || creditNoteLabel(creditNote.status)}`,
        at: creditNote.updated_at || creditNote.created_at,
        icon: FileText,
        tone: "bg-orange-50 text-orange-700",
      });
    });

    selectedClient.subscriptions.slice(0, 3).forEach((subscription) => {
      items.push({
        id: `subscription-${subscription.id}`,
        title: "Suscripción",
        description: `${subscription.name} · ${money(subscription.amount, subscription.currency)} · ${subscriptionLabel(subscription.status)}`,
        at: subscription.updated_at || subscription.created_at,
        icon: Activity,
        tone: "bg-emerald-50 text-emerald-700",
      });
    });

    selectedClient.expenses.slice(0, 3).forEach((expense) => {
      items.push({
        id: `expense-${expense.id}`,
        title: "Gasto registrado",
        description: `${expense.title} · ${money(expense.amount, expense.currency || expense.base_currency || currencySettings.baseCurrency)} · ${expenseLabel(expense.status)}`,
        at: expense.updated_at || expense.created_at,
        icon: Receipt,
        tone: "bg-orange-50 text-orange-700",
      });
    });

    selectedClient.contracts.slice(0, 3).forEach((contract) => {
      items.push({
        id: `contract-${contract.id}`,
        title: "Contrato vinculado",
        description: `${contract.subject} · ${contract.contract_type || contractLabel(contract.status)}`,
        at: contract.updated_at || contract.created_at,
        icon: ShieldAlert,
        tone: "bg-slate-50 text-slate-700",
      });
    });

    selectedClient.tickets.slice(0, 3).forEach((ticket) => {
      items.push({
        id: `ticket-${ticket.id}`,
        title: "Ticket",
        description: `${ticket.subject} · ${ticketLabel(ticket.status)} · ${ticketLabel(ticket.priority)}`,
        at: ticket.updated_at || ticket.created_at,
        icon: MessageSquarePlus,
        tone: "bg-blue-50 text-blue-700",
      });
    });

    selectedClient.reminders.slice(0, 3).forEach((reminder) => {
      items.push({
        id: `reminder-${reminder.id}`,
        title: reminderLabel(reminder.type),
        description: `${reminder.title} · ${formatDateTime(reminder.start_at)}`,
        at: reminder.updated_at || reminder.created_at,
        icon: CalendarClock,
        tone: "bg-amber-50 text-amber-700",
      });
    });

    selectedClient.vaultItems.slice(0, 3).forEach((item) => {
      items.push({
        id: `vault-${item.id}`,
        title: `Vault: ${item.title}`,
        description: `${vaultOptionLabel(VAULT_CATEGORIES, item.category)} · ${vaultOptionLabel(
          VAULT_SENSITIVITY,
          item.sensitivity,
        )}`,
        at: item.updated_at || item.created_at,
        icon: ShieldAlert,
        tone:
          item.sensitivity === "critical" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700",
      });
    });

    selectedClient.pendingProposals.slice(0, 3).forEach((proposal) => {
      items.push({
        id: `proposal-${proposal.id}`,
        title: `Propuesta ${proposal.number}`,
        description: `${proposal.title} · ${money(proposal.amount, proposal.currency)}`,
        at: proposal.updated_at,
        icon: FileText,
        tone: "bg-violet-50 text-violet-700",
      });
    });

    selectedClient.openDeals.slice(0, 3).forEach((deal) => {
      items.push({
        id: `deal-${deal.id}`,
        title: `Oportunidad abierta`,
        description: `${deal.name} · ${deal.stage} · ${money(deal.value, currencySettings.baseCurrency)}`,
        at: deal.updated_at,
        icon: BriefcaseBusiness,
        tone: "bg-sky-50 text-sky-700",
      });
    });

    items.push({
      id: `client-${selectedClient.id}`,
      title: "Ficha del cliente actualizada",
      description: `Última actividad: ${relativeLabel(selectedClient.latestActivityAt)}`,
      at: selectedClient.updated_at,
      icon: Activity,
      tone: "bg-emerald-50 text-emerald-700",
    });

    const mergedItems = [...logItems, ...items];
    const seen = new Set<string>();
    return mergedItems
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, 8);
  }, [activityLogs, projectById, selectedClient]);

  useEffect(() => {
    if (!contactDialogOpen) {
      setContactIsPrimary(false);
    }
  }, [contactDialogOpen]);

  const resetClientDialog = () => {
    setDialogOpen(false);
    setEditClient(null);
  };

  const resetContactDialog = () => {
    setContactDialogOpen(false);
    setEditContact(null);
    setContactClientId(null);
    setContactIsPrimary(false);
  };

  const resetProjectDialog = () => {
    setProjectDialogOpen(false);
    setProjectClientId(null);
    setProjectAssigneeIds([]);
  };

  const openCreateClient = () => {
    setEditClient(null);
    setDialogOpen(true);
  };

  const openEditClient = (client: ClientRow) => {
    setEditClient(client);
    setDialogOpen(true);
  };

  const openContactCreator = (clientId: string) => {
    setEditContact(null);
    setContactClientId(clientId);
    const client = snapshots.find((snapshot) => snapshot.id === clientId);
    setContactIsPrimary((client?.contacts.length || 0) === 0);
    setContactDialogOpen(true);
  };

  const openProjectCreator = (client: ClientSnapshot) => {
    if (!can("projects.create")) {
      toast.error("No tienes permiso para crear proyectos");
      return;
    }
    setProjectClientId(client.id);
    setProjectAssigneeIds(
      normalizeProfilePickerIds(profileUserIdFromProfileId(client.account_manager)),
    );
    setProjectDialogOpen(true);
  };

  const openContactEditor = (contact: ContactRow) => {
    setEditContact(contact);
    setContactClientId(contact.client_id);
    setContactIsPrimary(contact.is_primary);
    setContactDialogOpen(true);
  };

  function normalizeNullableSelectValue(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized === "none") return null;
    return normalized;
  }

  const handleClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can(editClient ? "clients.edit" : "clients.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const payload = {
      company_name: String(formData.get("company_name") || "").trim(),
      contact_person: String(formData.get("contact_person") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      country: String(formData.get("country") || "").trim() || null,
      tax_id: String(formData.get("tax_id") || "").trim() || null,
      website: String(formData.get("website") || "").trim() || null,
      industry: String(formData.get("industry") || "").trim() || null,
      status: (formData.get("status") as ClientStatus) || "Active",
      account_manager: normalizeNullableSelectValue(formData.get("account_manager")),
      tags: splitTags(String(formData.get("tags") || "")),
      notes: String(formData.get("notes") || "").trim() || null,
    };

    try {
      if (editClient) {
        await updateClient(editClient.id, payload);
        toast.success("Cliente actualizado");
      } else {
        await createClient(payload);
        toast.success("Cliente creado");
      }
      resetClientDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el cliente";
      toast.error(message);
    }
  };

  const handleClientDelete = async () => {
    if (!deleteId) return;
    if (!can("clients.delete")) {
      toast.error("No tienes permiso para eliminar");
      return;
    }
    try {
      await removeClient(deleteId);
      if (selectedClientId === deleteId) {
        setSelectedClientId(null);
      }
      setDeleteId(null);
      toast.success("Cliente eliminado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el cliente";
      toast.error(message);
    }
  };

  const handleDeactivateClient = async (client: ClientRow) => {
    if (!can("clients.edit")) {
      toast.error("No tienes permiso para editar");
      return;
    }
    try {
      await updateClient(client.id, { status: "Inactive" });
      toast.success("Cliente inactivado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo inactivar el cliente";
      toast.error(message);
    }
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("clients.edit")) {
      toast.error("No tienes permiso para modificar contactos");
      return;
    }
    if (!contactClientId) {
      toast.error("Selecciona un cliente antes de crear el contacto");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      first_name: String(formData.get("first_name") || "").trim(),
      last_name: String(formData.get("last_name") || "").trim(),
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      department: String(formData.get("department") || "").trim() || null,
      position: String(formData.get("position") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      tags: splitTags(String(formData.get("tags") || "")),
      is_primary: contactIsPrimary,
    };

    try {
      const result = editContact
        ? await updateContact(editContact.id, payload)
        : await createContact({ ...payload, client_id: contactClientId });

      if (result?.is_primary) {
        const { error } = await supabase
          .from("contacts")
          .update({ is_primary: false })
          .eq("company_id", profile?.company_id || "")
          .eq("client_id", contactClientId)
          .neq("id", result.id);

        if (error) throw error;
        await fetchContacts();
      }

      toast.success(editContact ? "Contacto actualizado" : "Contacto creado");
      resetContactDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el contacto";
      toast.error(message);
    }
  };

  const handleContactDelete = async (contactId: string) => {
    try {
      await removeContact(contactId);
      toast.success("Contacto eliminado");
      if (editContact?.id === contactId) {
        resetContactDialog();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el contacto";
      toast.error(message);
    }
  };

  const syncProjectAssignees = async (projectId: string, assigneeIds: string[]) => {
    if (!profile?.company_id) throw new Error("No se pudo identificar tu compañía.");
    const normalized = normalizeProfilePickerIds(assigneeIds);
    const db = supabase as any;
    const { error: deleteError } = await db
      .from("project_assignees")
      .delete()
      .eq("project_id", projectId);
    if (deleteError) throw deleteError;
    if (!normalized.length) return;
    const rows = normalized.map((userId) => ({
      company_id: profile.company_id,
      project_id: projectId,
      user_id: userId,
      created_by: user?.id || profile?.user_id || null,
    }));
    const { error: insertError } = await db.from("project_assignees").insert(rows);
    if (insertError) throw insertError;
  };

  const handleProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can("projects.create")) {
      toast.error("No tienes permiso para crear proyectos");
      return;
    }
    if (!profile?.company_id || !projectClientId) {
      toast.error("No se pudo identificar el cliente o compañía.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      status: String(formData.get("status") || "Not Started"),
      progress: Number(formData.get("progress") || 0) || 0,
      priority: String(formData.get("priority") || "Medium"),
      budget: String(formData.get("budget") || "").trim()
        ? Number(formData.get("budget")) || 0
        : null,
      start_date: String(formData.get("start_date") || "") || null,
      due_date: String(formData.get("due_date") || "") || null,
      client_id: projectClientId,
      product_id: normalizeNullableSelectValue(formData.get("product_id")),
      manager: primaryProjectManagerProfileId(projectAssigneeIds),
    };

    if (!payload.name) {
      toast.error("El nombre del proyecto es obligatorio.");
      return;
    }

    try {
      const created = await createProject(payload);
      if (created?.id) {
        const { error: scheduleError } = await (supabase as any)
          .from("projects")
          .update({ start_date: payload.start_date, due_date: payload.due_date })
          .eq("id", created.id)
          .eq("company_id", profile.company_id);
        if (scheduleError) throw scheduleError;
        await syncProjectAssignees(created.id, projectAssigneeIds);
      }
      await fetchProjects();
      toast.success("Proyecto creado");
      resetProjectDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el proyecto";
      toast.error(message);
    }
  };

  const exportVisible = () => {
    if (filteredClients.length === 0) return;
    const csv = buildClientCsv(filteredClients, currencySettings.baseCurrency);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `corevix-clientes-${filteredClients.length}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onDemoOpenClient360 = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;

      if (detail?.open === false) {
        setSelectedClientId(null);
        return;
      }

      const demoClient =
        filteredClients.find((client) =>
          String(client.company_name || "")
            .toLowerCase()
            .includes("demo"),
        ) ||
        filteredClients.find(
          (client) =>
            client.projects.length ||
            client.invoices.length ||
            client.proposals.length ||
            client.openDeals.length,
        ) ||
        filteredClients[0] ||
        snapshots[0];

      if (demoClient?.id) {
        setSelectedClientId(demoClient.id);
      }
    };

    window.addEventListener("crm-demo-open-client-360", onDemoOpenClient360);
    return () => window.removeEventListener("crm-demo-open-client-360", onDemoOpenClient360);
  }, [filteredClients, snapshots]);

  useEffect(() => {
    const onDemoClient360Tab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (!tab) return;

      const selectors = [
        `[data-demo="client-360-tab-${tab}"]`,
        `button[value="${tab}"]`,
        `[role="tab"][value="${tab}"]`,
        `[role="tab"][data-value="${tab}"]`,
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          el.click();
          break;
        }
      }
    };

    window.addEventListener("crm-demo-client360-tab", onDemoClient360Tab);
    return () => window.removeEventListener("crm-demo-client360-tab", onDemoClient360Tab);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-white px-4 py-4 text-[#101828] sm:px-5">
        <div className="mb-5 space-y-2">
          <div className="h-9 w-40 rounded bg-slate-100" />
          <div className="h-5 w-96 max-w-full rounded bg-slate-100" />
        </div>
        <div className="mb-5">
          <LoadingMetrics count={8} />
        </div>
        <LoadingTable rows={6} cols={8} />
      </div>
    );
  }

  const mobileStatusFilters = [
    { key: "all", label: "Todos los estados" },
    { key: "Active", label: "Activos" },
    { key: "VIP", label: "VIP" },
    { key: "Pending", label: "Pendientes" },
    { key: "Inactive", label: "Inactivos" },
  ];
  const mobileHealthFilters = [
    { key: "all", label: "Toda la salud" },
    { key: "attention", label: "Con atención" },
    { key: "risk", label: "En riesgo" },
    { key: "active", label: "Saludables" },
    { key: "inactive", label: "Inactivos" },
  ];
  return (
    <div data-demo="clients-main" className="min-h-[calc(100vh-72px)] bg-white text-[#101828]">
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <div className="hidden md:block">
          <PageHeader
            title="Clientes"
            subtitle="Gestiona cuentas activas, contactos, proyectos, finanzas y la salud comercial de cada cliente."
          />
        </div>

        <GlobalKpiStrip
          title="Clientes"
          subtitle="Cuentas, contactos y salud comercial"
          actionLabel={can("clients.create") ? "Nuevo cliente" : undefined}
          onAction={can("clients.create") ? openCreateClient : undefined}
          actionIcon={<Plus className="h-3.5 w-3.5" />}
          items={[
            {
              key: "clients-summary",
              label: "Requieren atención",
              value: attentionCount,
              helper: `${filteredClients.length} visibles de ${snapshots.length} clientes`,
              icon: ShieldAlert,
              tone: attentionCount > 0 ? "red" : "green",
              meta: [
                { label: "Activos", value: activeClientsCount, tone: "green" },
                { label: "Riesgo", value: riskClientsCount, tone: "red" },
                { label: "Sin contacto", value: missingPrimaryContactCount, tone: "orange" },
              ],
            },
          ]}
        >
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mobileStatusFilters.map((filter) => (
                  <SelectItem key={filter.key} value={filter.key}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={(value) => setHealthFilter(value as any)}>
              <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mobileHealthFilters.map((filter) => (
                  <SelectItem key={filter.key} value={filter.key}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlobalKpiStrip>

        <section data-demo="clients-insights-bar" className="hidden gap-3 md:grid md:grid-cols-4">
          <ClientKpi label="Visibles" value={filteredClients.length} tone="neutral" />
          <ClientKpi label="Activos" value={activeClientsCount} tone="success" />
          <ClientKpi
            label="Atención"
            value={attentionCount}
            tone={clientRiskTone(attentionCount, 1, 6)}
          />
          <ClientKpi
            label="Pendientes"
            value={pendingInvoicesCount}
            tone={clientRiskTone(pendingInvoicesCount, 1, 6)}
          />
        </section>

        {errorMessage && (
          <div
            data-demo="clients-warning-message"
            className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            {errorMessage}
          </div>
        )}

        <section
          data-demo="clients-filters-panel"
          className="hidden border-y border-slate-100 bg-white px-4 py-3 shadow-none md:block"
        >
          <div className="flex items-center gap-3">
            <SearchFilters
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar clientes, contactos, industria..."
              filters={[]}
              className="flex-1"
            />
            <CrmDetailLineButton
              type="button"
              icon={<Download className="h-4 w-4" />}
              onClick={exportVisible}
            >
              Exportar
            </CrmDetailLineButton>
            {can("clients.create") ? (
              <Button
                type="button"
                className="h-9 rounded-md bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
                onClick={openCreateClient}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            ) : null}
          </div>
        </section>

        <DataCard
          data-demo="clients-list-panel"
          className="mt-4 overflow-hidden rounded-none border-x-0 border-y border-slate-100 bg-white shadow-none md:mt-0"
        >
          {filteredClients.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="No hay clientes que coincidan con estos filtros"
              description="Prueba cambiando la búsqueda o crea tu primer cliente para empezar a trabajar con contactos activos."
              actionLabel={can("clients.create") ? "Nuevo cliente" : undefined}
              onAction={openCreateClient}
            />
          ) : (
            <>
              <div className="grid gap-2.5 md:hidden">
                {filteredClients.map((client, index) => (
                  <button
                    key={client.id}
                    type="button"
                    data-demo={index === 0 ? "clients-first-mobile-card" : undefined}
                    onClick={() => setSelectedClientId(client.id)}
                    className={cnJoin(
                      "w-full rounded-[18px] border border-slate-200 bg-white p-3.5 text-left transition-colors active:scale-[0.992]",
                      selectedClientId === client.id && "border-blue-200 bg-blue-50/40",
                    )}
                  >
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
                          {client.company_name}
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] font-medium leading-4 text-slate-500">
                          {client.primaryContact
                            ? getContactName(client.primaryContact)
                            : client.contact_person || client.industry || "Sin contacto"}
                        </div>
                      </div>
                      <StatusBadge
                        status={client.status}
                        className="min-h-6 max-w-[88px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                          Salud
                        </div>
                        <div className="mt-1">
                          <HealthBadge health={client.health} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                          Responsable
                        </div>
                        <div className="mt-1 truncate text-[12.5px] font-semibold text-slate-600">
                          {client.accountManagerName}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[13px] font-extrabold text-slate-950">
                          {client.activeProjects.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                          Proyectos
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] font-extrabold text-slate-950">
                          {client.tasks.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                          Tareas
                        </div>
                      </div>
                      <div>
                        <div className="truncate text-[13px] font-extrabold text-slate-950">
                          {clientFinanceLabel(client, currencySettings.baseCurrency)}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                          Finanzas
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[960px]">
                  <TableHeader className="bg-white">
                    <TableRow>
                      <TableHead className="w-[230px] pl-4">Empresa</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="w-[115px]">Salud</TableHead>
                      <TableHead className="hidden lg:table-cell w-[150px]">Responsable</TableHead>
                      <TableHead className="hidden xl:table-cell w-[105px]">Productos</TableHead>
                      <TableHead className="hidden xl:table-cell w-[105px]">Proyectos</TableHead>
                      <TableHead className="hidden xl:table-cell w-[105px]">Tareas</TableHead>
                      <TableHead className="hidden xl:table-cell w-[110px]">Finanzas</TableHead>
                      <TableHead className="hidden 2xl:table-cell w-[130px]">
                        Última actividad
                      </TableHead>
                      <TableHead className="w-[48px] pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client, index) => (
                      <TableRow
                        key={client.id}
                        className={cnJoin(
                          "cursor-pointer transition-colors hover:bg-slate-50/80",
                          selectedClientId === client.id && "bg-blue-50/60",
                        )}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <TableCell className="py-2 pl-4">
                          <div className="space-y-0.5">
                            <p className="font-normal text-[#101828]">{client.company_name}</p>
                            <p className="text-xs text-[#667085]">
                              {client.industry || "Sin industria"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <StatusBadge status={client.status} />
                        </TableCell>
                        <TableCell className="py-2">
                          <HealthBadge health={client.health} />
                        </TableCell>
                        <TableCell className="hidden py-2 lg:table-cell">
                          <p className="text-sm font-normal text-[#344054]">
                            {client.accountManagerName}
                          </p>
                        </TableCell>
                        <TableCell className="hidden py-2 xl:table-cell">
                          <div className="space-y-0.5">
                            <p className="text-sm font-normal text-[#101828]">
                              {client.purchasedProducts.length}
                            </p>
                            <p className="text-xs text-[#667085]">
                              {(client.purchasedProductNames.slice(0, 2).join(", ") || "—") +
                                (client.purchasedProductNames.length > 2 ? "…" : "")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2 xl:table-cell">
                          <div className="space-y-0.5">
                            <p className="text-sm font-normal text-[#101828]">
                              {client.activeProjects.length}
                            </p>
                            <p className="text-xs text-[#667085]">activos</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2 xl:table-cell">
                          <div className="space-y-0.5">
                            <p className="text-sm font-normal text-[#101828]">
                              {client.tasks.length}
                            </p>
                            <p className="text-xs text-[#667085]">
                              {client.openTasks.length} abiertas
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2 xl:table-cell">
                          <div className="space-y-0.5">
                            <p className="text-sm font-normal text-[#101828]">
                              {clientFinanceLabel(client, currencySettings.baseCurrency)}
                            </p>
                            <p className="text-xs text-[#667085]">
                              {money(client.pendingInvoiceAmount, currencySettings.baseCurrency)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2 2xl:table-cell">
                          <p className="text-sm font-normal text-[#344054]">
                            {relativeLabel(client.latestActivityAt)}
                          </p>
                        </TableCell>
                        <TableCell className="py-2 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent text-[#667085] shadow-none hover:bg-transparent"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 rounded-none border-slate-200 bg-white shadow-none"
                            >
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedClientId(client.id);
                                }}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditClient(client);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openContactCreator(client.id);
                                }}
                              >
                                <MessageSquarePlus className="mr-2 h-4 w-4" />
                                Añadir contacto
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate({ to: "/tasks" });
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Ir a tareas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate({
                                    to: "/proposals",
                                    search: {
                                      leadId: undefined,
                                      dealId: undefined,
                                      conversationId: undefined,
                                      productId: undefined,
                                      clientId: client.id,
                                    },
                                  });
                                }}
                              >
                                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                                Ir a propuestas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate({ to: "/invoices" });
                                }}
                              >
                                <Receipt className="mr-2 h-4 w-4" />
                                Ir a facturas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeactivateClient(client);
                                }}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Inactivar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteId(client.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DataCard>
      </div>

      <Dialog
        open={!!selectedClient}
        onOpenChange={(open) => {
          if (!open) closeClientDetail();
        }}
      >
        <DialogContent
          data-demo="client-360-panel"
          className="flex h-[94dvh] w-[calc(100vw-24px)] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-xl [&>button.absolute.right-4.top-4]:z-20 [&>button.absolute.right-4.top-4]:rounded-none [&>button.absolute.right-4.top-4]:border-b [&>button.absolute.right-4.top-4]:border-slate-200 [&>button.absolute.right-4.top-4]:bg-white"
        >
          {selectedClient && (
            <div className="flex h-full flex-col">
              <DialogHeader className="relative border-b border-slate-200 bg-white px-4 py-4 text-left lg:px-6">
                <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-none">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="truncate text-xl font-normal tracking-normal text-slate-950">
                        {selectedClient.company_name}
                      </DialogTitle>
                      <DialogDescription className="mt-1 truncate text-sm font-normal text-slate-500">
                        {selectedClient.primaryContact
                          ? getContactName(selectedClient.primaryContact)
                          : selectedClient.contact_person || "Sin contacto principal"}{" "}
                        · {selectedClient.contacts.length} contacto
                        {selectedClient.contacts.length === 1 ? "" : "s"}
                      </DialogDescription>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedClient.status} />
                        <HealthBadge health={selectedClient.health} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pr-10 lg:justify-end">
                    <CrmDetailLineButton
                      className="h-8"
                      icon={<FileText className="h-3.5 w-3.5" />}
                      data-demo="client-360-create-task"
                      onClick={() => openCreateTaskForClient(selectedClient)}
                      disabled={!canCreateTaskForClient(selectedClient)}
                    >
                      Crear tarea
                    </CrmDetailLineButton>

                    <CrmDetailLineButton
                      className="h-8"
                      icon={<Receipt className="h-3.5 w-3.5" />}
                      onClick={() => openInvoiceCreator(selectedClient)}
                      disabled={!can("invoices.create")}
                    >
                      Crear factura
                    </CrmDetailLineButton>

                    <CrmDetailLineButton
                      className="h-8"
                      icon={<Mail className="h-3.5 w-3.5" />}
                      onClick={() => {
                        const email = selectedClient.primaryContact?.email || selectedClient.email;
                        const phone = selectedClient.whatsapp || selectedClient.phone;

                        if (email) {
                          window.location.href = `mailto:${email}`;
                          return;
                        }

                        if (phone) {
                          window.location.href = `tel:${phone}`;
                          return;
                        }

                        openContactCreator(selectedClient.id);
                      }}
                    >
                      Contactar
                    </CrmDetailLineButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CrmDetailLineButton
                          className="h-8"
                          icon={<MoreHorizontal className="h-3.5 w-3.5" />}
                        >
                          Más
                        </CrmDetailLineButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 border-slate-200 bg-white shadow-none"
                      >
                        <DropdownMenuItem onClick={() => openEditClient(selectedClient)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDeactivateClient(selectedClient)}
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Inactivar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteId(selectedClient.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </DialogHeader>

              <Tabs
                defaultValue="overview"
                className="grid min-h-0 flex-1 grid-cols-1 bg-white lg:grid-cols-[280px_minmax(0,1fr)]"
              >
                <aside className="border-b border-slate-200 bg-slate-50/80 lg:border-b-0 lg:border-r">
                  <ScrollArea className="max-h-[180px] lg:h-[calc(94dvh-122px)] lg:max-h-none">
                    <TabsList
                      data-demo="client-360-tabs"
                      className="flex h-auto w-max min-w-full items-stretch justify-start gap-1 rounded-none bg-transparent p-3 lg:w-full lg:flex-col lg:items-stretch"
                    >
                      {[
                        {
                          value: "overview",
                          label: "Perfil",
                          icon: UserCheck,
                          demo: "client-360-tab-summary",
                        },
                        {
                          value: "contacts",
                          label: "Contactos",
                          icon: Users,
                          demo: "client-360-tab-contacts",
                          count: selectedClient.contacts.length,
                        },
                        {
                          value: "notes",
                          label: "Notas",
                          icon: FileText,
                          count: selectedClient.internalNotes.length || undefined,
                        },
                        { value: "statement", label: "Estado de cuenta", icon: Receipt },
                        {
                          value: "finance",
                          label: "Facturas",
                          icon: Receipt,
                          demo: "client-360-tab-finance",
                          count: selectedClient.invoices.length,
                        },
                        { value: "payments", label: "Pagos", icon: CircleDollarSign },
                        {
                          value: "proposals",
                          label: "Propuestas",
                          icon: BriefcaseBusiness,
                          count: selectedClient.proposals.length,
                        },
                        { value: "credit-notes", label: "Notas de crédito", icon: FileText },
                        { value: "subscriptions", label: "Suscripciones", icon: Activity },
                        { value: "expenses", label: "Gastos", icon: Receipt },
                        { value: "contracts", label: "Contratos", icon: ShieldAlert },
                        {
                          value: "projects",
                          label: "Proyectos",
                          icon: FolderKanban,
                          demo: "client-360-tab-projects",
                          count: selectedClient.projects.length,
                        },
                        {
                          value: "tasks",
                          label: "Tareas",
                          icon: CheckCircle2,
                          count: selectedClient.tasks.length,
                        },
                        { value: "tickets", label: "Tickets", icon: MessageSquarePlus },
                        { value: "files", label: "Archivos", icon: FileText },
                        {
                          value: "vault",
                          label: "Vault",
                          icon: ShieldAlert,
                          count: selectedClient.vaultItems.length,
                        },
                        {
                          value: "reminders",
                          label: "Recordatorios",
                          icon: CalendarClock,
                          count: selectedClient.reminders.length,
                        },
                        {
                          value: "activity",
                          label: "Actividad",
                          icon: Activity,
                          demo: "client-360-tab-activity",
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <TabsTrigger
                            key={item.value}
                            data-demo={item.demo}
                            value={item.value}
                            className="min-w-fit justify-start gap-2 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-none data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm lg:w-full"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {typeof item.count === "number" ? (
                              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
                                {item.count}
                              </span>
                            ) : null}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </ScrollArea>
                </aside>

                <ScrollArea className="min-h-0 bg-white lg:h-[calc(94dvh-122px)]">
                  <div className="mx-auto w-full max-w-6xl space-y-4 bg-white px-4 py-5 lg:px-7">
                    <TabsContent
                      value="overview"
                      className="space-y-3 data-[state=inactive]:hidden"
                    >
                      <div
                        data-demo="client-360-summary-strip"
                        className="border-b border-slate-100 pb-4"
                      >
                        <CrmDetailSummaryGrid
                          columns={4}
                          items={[
                            {
                              key: "contacts",
                              label: "Contactos",
                              value: selectedClient.contacts.length,
                            },
                            {
                              key: "projects",
                              label: "Proyectos",
                              value: selectedClient.projects.length,
                            },
                            {
                              key: "tasks",
                              label: "Tareas",
                              value: selectedClient.tasks.length,
                            },
                            {
                              key: "pipeline",
                              label: "Embudo",
                              value: money(
                                selectedClient.openPipelineValue,
                                currencySettings.baseCurrency,
                              ),
                            },
                          ]}
                        />
                      </div>

                      <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-normal text-slate-950">Salud de la cuenta</p>
                            <p className="mt-1 text-sm font-normal text-slate-500">
                              {selectedClient.healthReason}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cnJoin(
                              "rounded-full border px-3 py-1 text-xs font-bold",
                              selectedClient.healthTone,
                            )}
                          >
                            {healthLabel(selectedClient.health)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 border-b border-slate-100 pb-4 xl:grid-cols-2">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Datos del cliente
                          </h3>
                          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                            {[
                              ["Estado", clientStatusLabel(selectedClient.status)],
                              ["Industria", selectedClient.industry || "—"],
                              ["Responsable", selectedClient.accountManagerName],
                              ["Contacto rápido", selectedClient.contact_person || "—"],
                              ["Web", selectedClient.website || "—"],
                              ["ID fiscal", selectedClient.tax_id || "—"],
                              ["Ciudad", selectedClient.city || "—"],
                              ["País", selectedClient.country || "—"],
                            ].map(([label, value]) => (
                              <div key={label as string} className="border-b border-slate-100 pb-2">
                                <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                                  {label}
                                </p>
                                <p className="mt-1 text-sm font-normal text-slate-950">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Notas y etiquetas
                          </h3>
                          <div className="mt-4 space-y-4">
                            <div>
                              <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                                Etiquetas
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(selectedClient.tags || []).length === 0 ? (
                                  <span className="text-sm text-slate-500">Sin etiquetas</span>
                                ) : (
                                  (selectedClient.tags || []).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="rounded-full bg-slate-100 text-slate-700"
                                    >
                                      {tag}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                                Notas
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm font-normal text-slate-500">
                                {selectedClient.notes || "Sin notas registradas todavía."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 border-b border-slate-100 pb-4 xl:grid-cols-2">
                        <div data-demo="client-360-products" className="min-w-0">
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Productos comprados
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Productos vinculados a esta cuenta.
                          </p>
                          {selectedClient.purchasedProducts.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              Sin productos comprados registrados.
                            </p>
                          ) : (
                            <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                              {selectedClient.purchasedProducts.slice(0, 8).map((row) => (
                                <div
                                  key={row.clientProduct.id}
                                  className="flex items-start justify-between gap-3 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-normal text-slate-950">
                                      {row.product?.name || row.clientProduct.product_id}
                                    </p>
                                    <p className="mt-0.5 text-xs font-normal text-slate-500">
                                      {[row.product?.category, row.clientProduct.status]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-normal text-slate-500">Inicio</p>
                                    <p className="text-sm font-normal text-slate-950">
                                      {row.clientProduct.start_date || "—"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {selectedClient.purchasedProducts.length > 8 ? (
                                <p className="text-xs text-slate-500">
                                  Mostrando 8 de {selectedClient.purchasedProducts.length}.
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                                Próximo paso
                              </h3>
                              <p className="mt-1 text-sm font-normal text-slate-500">
                                Tarea pendiente más cercana por fecha de vencimiento.
                              </p>
                            </div>
                            <CrmDetailLineButton
                              className="h-8 shrink-0"
                              icon={<Plus className="h-4 w-4" />}
                              onClick={() => {
                                openCreateTaskForClient(selectedClient);
                              }}
                              disabled={!canCreateTaskForClient(selectedClient)}
                            >
                              Crear tarea
                            </CrmDetailLineButton>
                          </div>

                          {!selectedClient.nextOpenTask ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay tareas pendientes con fecha.
                            </p>
                          ) : (
                            <div className="mt-4 border-y border-slate-100 py-3">
                              <p className="text-sm font-normal text-slate-950">
                                {selectedClient.nextOpenTask.title}
                              </p>
                              <p className="mt-1 text-xs font-normal text-slate-500">
                                {selectedClient.nextOpenTask.due_date
                                  ? `Vence ${selectedClient.nextOpenTask.due_date}`
                                  : "Sin fecha"}{" "}
                                · {selectedClient.nextOpenTask.priority}
                              </p>
                            </div>
                          )}

                          <Separator className="my-4" />

                          <CrmDetailSummaryGrid
                            columns={2}
                            items={[
                              {
                                key: "pending-tasks",
                                label: "Tareas pendientes",
                                value: selectedClient.openTasks.length,
                              },
                              {
                                key: "overdue-tasks",
                                label: "Tareas vencidas",
                                value: selectedClient.overdueTasks.length,
                              },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div
                          data-demo="client-360-deals"
                          className="min-w-0 border-b border-slate-100 pb-4"
                        >
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Oportunidades
                          </h3>
                          {selectedClient.openDeals.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay oportunidades abiertas.
                            </p>
                          ) : (
                            <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                              {selectedClient.openDeals.slice(0, 6).map((deal) => (
                                <div key={deal.id} className="py-3">
                                  <p className="text-sm font-normal text-slate-950">{deal.name}</p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {deal.stage} ·{" "}
                                    {money(deal.value, currencySettings.baseCurrency)}{" "}
                                    {deal.expected_close ? `· Cierre ${deal.expected_close}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          data-demo="client-360-proposals"
                          className="min-w-0 border-b border-slate-100 pb-4"
                        >
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Propuestas
                          </h3>
                          {selectedClient.proposals.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay propuestas vinculadas.
                            </p>
                          ) : (
                            <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                              {selectedClient.proposals.slice(0, 6).map((proposal) => (
                                <div key={proposal.id} className="py-3">
                                  <p className="text-sm font-normal text-slate-950">
                                    {proposal.number} · {proposal.title}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {proposal.status} · {money(proposal.amount, proposal.currency)}{" "}
                                    {proposal.valid_until ? `· Vence ${proposal.valid_until}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-statement"
                      value="statement"
                      className="space-y-5"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-[180px] max-w-[220px]">
                          <h3 className="text-base font-semibold text-slate-950">
                            Estado de cuenta
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Facturas, pagos y notas de crédito con saldo acumulado.
                          </p>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-end justify-end gap-1.5">
                          <div className="shrink-0 space-y-1">
                            <Label className="text-[11px] text-slate-500">Desde</Label>
                            <Input
                              type="date"
                              value={statementFrom}
                              onChange={(event) => setStatementFrom(event.target.value)}
                              className="h-8 w-[124px] px-2 text-xs"
                            />
                          </div>
                          <div className="shrink-0 space-y-1">
                            <Label className="text-[11px] text-slate-500">Hasta</Label>
                            <Input
                              type="date"
                              value={statementTo}
                              onChange={(event) => setStatementTo(event.target.value)}
                              className="h-8 w-[124px] px-2 text-xs"
                            />
                          </div>
                          <div className="shrink-0 space-y-1">
                            <Label className="text-[11px] text-slate-500">Moneda</Label>
                            <Select value={statementCurrency} onValueChange={setStatementCurrency}>
                              <SelectTrigger className="h-8 w-[128px] px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Moneda base</SelectItem>
                                {accountStatement.currencies.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={exportAccountStatement}
                            aria-label="Exportar estado de cuenta en CSV"
                            title="Exportar CSV"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={printAccountStatement}
                            aria-label="Imprimir o guardar estado de cuenta en PDF"
                            title="Imprimir / PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {accountStatement.movements.length === 0 &&
                      accountStatement.openingBalance === 0 ? (
                        <EmptyState
                          icon={<Receipt className="h-6 w-6" />}
                          title="Aún no hay movimientos"
                          description="Este cliente todavía no tiene facturas, pagos ni notas de crédito registradas. Cuando se cree el primer movimiento, aparecerá aquí automáticamente."
                          actionLabel={can("invoices.create") ? "Crear primera factura" : undefined}
                          onAction={
                            can("invoices.create")
                              ? () => openInvoiceCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <>
                          <CrmDetailSummaryGrid
                            columns={4}
                            items={[
                              {
                                key: "opening",
                                label: "Saldo inicial",
                                value: money(
                                  accountStatement.openingBalance,
                                  accountStatement.displayCurrency,
                                ),
                              },
                              {
                                key: "invoiced",
                                label: "Facturado",
                                value: money(
                                  accountStatement.invoiced,
                                  accountStatement.displayCurrency,
                                ),
                              },
                              {
                                key: "paid",
                                label: "Pagos recibidos",
                                value: money(
                                  accountStatement.paid,
                                  accountStatement.displayCurrency,
                                ),
                              },
                              {
                                key: "credits",
                                label: "Notas de crédito",
                                value: money(
                                  accountStatement.credited,
                                  accountStatement.displayCurrency,
                                ),
                              },
                              {
                                key: "overdue",
                                label: "Monto vencido",
                                value: money(
                                  accountStatement.overdueBalance,
                                  accountStatement.displayCurrency,
                                ),
                              },
                              {
                                key: "closing",
                                label: "Saldo pendiente",
                                value: money(
                                  accountStatement.closingBalance,
                                  accountStatement.displayCurrency,
                                ),
                              },
                            ]}
                          />
                          <div className="overflow-x-auto border-y border-slate-100">
                            <Table className="min-w-[860px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Movimiento</TableHead>
                                  <TableHead>Referencia</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead className="text-right">Débito</TableHead>
                                  <TableHead className="text-right">Crédito</TableHead>
                                  <TableHead className="text-right">Saldo</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {accountStatement.movements.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell>{formatDate(row.date)}</TableCell>
                                    <TableCell>
                                      {row.type === "invoice"
                                        ? "Factura"
                                        : row.type === "payment"
                                          ? "Pago"
                                          : "Nota de crédito"}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-950">
                                      {row.reference}
                                    </TableCell>
                                    <TableCell className="max-w-[260px] truncate text-slate-500">
                                      {row.description}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {row.debit ? money(row.debit, row.currency) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-700">
                                      {row.credit ? money(row.credit, row.currency) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-950">
                                      {money(row.balance, row.currency)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <p className="text-xs text-slate-500">
                            El saldo se calcula con facturas no canceladas menos pagos completados y
                            notas de crédito emitidas o aplicadas.
                          </p>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-contacts-section"
                      value="contacts"
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Contactos
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Gestiona los contactos activos de esta cuenta.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<MessageSquarePlus className="h-4 w-4" />}
                          onClick={() => openContactCreator(selectedClient.id)}
                        >
                          Añadir contacto
                        </CrmDetailLineButton>
                      </div>

                      {selectedClient.contacts.length === 0 ? (
                        <EmptyState
                          icon={<Users className="h-6 w-6" />}
                          title="No hay contactos todavía"
                          description="Crea el primer contacto para empezar a gestionar esta cuenta."
                          actionLabel="Añadir contacto"
                          onAction={() => openContactCreator(selectedClient.id)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.contacts.map((contact) => (
                            <div key={contact.id} className="py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-base font-normal text-slate-950">
                                      {getContactName(contact)}
                                    </h4>
                                    {contact.is_primary && (
                                      <Badge
                                        variant="secondary"
                                        className="rounded-full bg-blue-50 text-blue-700"
                                      >
                                        Principal
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm font-normal text-slate-500">
                                    {[contact.position, contact.department]
                                      .filter(Boolean)
                                      .join(" · ") || "Sin cargo definido"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openContactEditor(contact)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => handleContactDelete(contact.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                <div className="space-y-1 border-b border-slate-100 pb-2">
                                  <p className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-slate-500">
                                    <Mail className="h-3.5 w-3.5" />
                                    Correo electrónico
                                  </p>
                                  <p className="text-sm font-normal text-slate-950">
                                    {contact.email || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 border-b border-slate-100 pb-2">
                                  <p className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-slate-500">
                                    <Phone className="h-3.5 w-3.5" />
                                    Teléfono
                                  </p>
                                  <p className="text-sm font-normal text-slate-950">
                                    {contact.phone || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 border-b border-slate-100 pb-2">
                                  <p className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-slate-500">
                                    <Globe className="h-3.5 w-3.5" />
                                    WhatsApp
                                  </p>
                                  <p className="text-sm font-normal text-slate-950">
                                    {contact.whatsapp || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 border-b border-slate-100 pb-2">
                                  <p className="text-xs font-normal uppercase tracking-wide text-slate-500">
                                    Etiquetas
                                  </p>
                                  <p className="text-sm font-normal text-slate-950">
                                    {(contact.tags || []).length ? contact.tags!.join(", ") : "—"}
                                  </p>
                                </div>
                              </div>

                              {contact.notes && (
                                <div className="mt-3 border-t border-slate-100 pt-3">
                                  <p className="text-xs font-normal uppercase tracking-wide text-slate-500">
                                    Notas
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm font-normal text-slate-500">
                                    {contact.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-projects"
                      value="projects"
                      className="space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Proyectos
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Estado de los proyectos activos y en riesgo.
                          </p>
                        </div>
                      </div>
                      {selectedClient.projects.length === 0 ? (
                        <EmptyState
                          icon={<FolderKanban className="h-6 w-6" />}
                          title="No hay proyectos vinculados"
                          description="Crea el primer proyecto para este cliente sin salir del panel."
                          actionLabel={can("projects.create") ? "Nuevo proyecto" : undefined}
                          onAction={() => openProjectCreator(selectedClient)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.projects.map((project) => {
                            const progress = projectProgressFromTasks(
                              project,
                              selectedClient.tasks,
                            );
                            return (
                              <div key={project.id} className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="text-base font-normal text-slate-950">
                                      {project.name}
                                    </h4>
                                    <p className="mt-1 text-sm font-normal text-slate-500">
                                      Vence {formatDate(project.due_date)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <StatusBadge status={project.status} />
                                    {renderClient360QuickDetailButton(
                                      "projects",
                                      project.id,
                                      "Ver proyecto",
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 h-2 rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-blue-500 transition-all"
                                    style={{
                                      width: `${progress}%`,
                                    }}
                                  />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm font-normal text-slate-500">
                                  <span>Progreso</span>
                                  <span className="font-normal text-slate-950">{progress}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-finance"
                      value="finance"
                      className="space-y-4"
                    >
                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "pending-invoices",
                            label: "Pendientes",
                            value: selectedClient.pendingInvoices.length,
                          },
                          {
                            key: "overdue-invoices",
                            label: "Vencidas",
                            value: selectedClient.overdueInvoices.length,
                          },
                          {
                            key: "pending-proposals",
                            label: "Propuestas",
                            value: selectedClient.pendingProposals.length,
                          },
                          {
                            key: "open-pipeline",
                            label: "Embudo",
                            value: money(
                              selectedClient.openPipelineValue,
                              currencySettings.baseCurrency,
                            ),
                          },
                        ]}
                      />

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div
                          data-demo="client-360-invoices"
                          className="border-b border-slate-100 pb-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                                Facturas
                              </h3>
                              <p className="mt-1 text-sm font-normal text-slate-500">
                                Facturas vinculadas a esta cuenta.
                              </p>
                            </div>
                            <CrmDetailLineButton
                              className="h-8 shrink-0"
                              icon={<Plus className="h-4 w-4" />}
                              onClick={() => openInvoiceCreator(selectedClient)}
                              disabled={!can("invoices.create")}
                            >
                              Crear factura
                            </CrmDetailLineButton>
                          </div>
                          <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                            {selectedClient.invoices.length === 0 ? (
                              <EmptyState
                                icon={<Receipt className="h-6 w-6" />}
                                title="No hay facturas registradas"
                                description="Crea la primera factura usando los datos de este cliente."
                                actionLabel={can("invoices.create") ? "Crear factura" : undefined}
                                onAction={
                                  can("invoices.create")
                                    ? () => openInvoiceCreator(selectedClient)
                                    : undefined
                                }
                              />
                            ) : (
                              selectedClient.invoices.slice(0, 5).map((invoice) => (
                                <div key={invoice.id} className="py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-normal text-slate-950">
                                        Factura {invoice.number}
                                      </p>
                                      <p className="text-xs font-normal text-slate-500">
                                        Vence {formatDate(invoice.due_date)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <StatusBadge status={invoice.status} />
                                      {renderClient360QuickDetailButton(
                                        "invoices",
                                        invoice.id,
                                        "Ver factura",
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="font-normal text-slate-500">
                                      {money(invoice.total, rowCurrency(invoice))}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500">
                                        {formatDateTime(invoice.updated_at)}
                                      </span>
                                      {can("payments.create") ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 rounded-full px-2 text-xs font-semibold text-emerald-700"
                                          onClick={() =>
                                            openPaymentCreator(selectedClient, invoice)
                                          }
                                        >
                                          Registrar pago
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="border-b border-slate-100 pb-4">
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Propuestas y embudo
                          </h3>
                          <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                            {selectedClient.pendingProposals.length === 0 &&
                            selectedClient.openDeals.length === 0 ? (
                              <p className="py-3 text-sm font-normal text-slate-500">
                                No hay propuestas ni oportunidades abiertas.
                              </p>
                            ) : (
                              <>
                                {selectedClient.pendingProposals.slice(0, 4).map((proposal) => (
                                  <div key={proposal.id} className="py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-normal text-slate-950">
                                          {proposal.title}
                                        </p>
                                        <p className="text-xs font-normal text-slate-500">
                                          Propuesta {proposal.number}
                                        </p>
                                      </div>
                                      <StatusBadge status={proposal.status} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                      <span className="font-normal text-slate-500">
                                        {money(proposal.amount, proposal.currency)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-500">
                                          {formatDateTime(proposal.updated_at)}
                                        </span>
                                        {renderClient360QuickDetailButton(
                                          "proposals",
                                          proposal.id,
                                          "Ver propuesta",
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {selectedClient.openDeals.slice(0, 4).map((deal) => (
                                  <div key={deal.id} className="py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-normal text-slate-950">
                                          {deal.name}
                                        </p>
                                        <p className="text-xs font-normal text-slate-500">
                                          Etapa {deal.stage}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="secondary"
                                        className="rounded-full bg-emerald-50 text-emerald-700"
                                      >
                                        {deal.probability || 0}%
                                      </Badge>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                      <span className="font-normal text-slate-500">
                                        {money(deal.value, currencySettings.baseCurrency)}
                                      </span>
                                      <span className="text-slate-500">
                                        {formatDateTime(deal.updated_at)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <ClientNotesPanel
                        clientId={selectedClient.id}
                        canEdit={can("clients.edit")}
                        onChanged={async () => {
                          await fetchClientNotes();
                          setActivityRefreshKey((value) => value + 1);
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Pagos del cliente
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Pagos registrados directamente al cliente o vinculados a sus facturas.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openPaymentCreator(selectedClient)}
                          disabled={!can("payments.create")}
                        >
                          Registrar pago
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "payments-count",
                            label: "Pagos",
                            value: selectedClient.payments.length,
                          },
                          {
                            key: "payments-completed",
                            label: "Completados",
                            value: selectedClient.completedPayments.length,
                          },
                          {
                            key: "payments-total",
                            label: "Total cobrado",
                            value: money(
                              selectedClient.totalPaidAmount,
                              currencySettings.baseCurrency,
                            ),
                          },
                          {
                            key: "pending-invoices",
                            label: "Facturas pendientes",
                            value: selectedClient.pendingInvoices.length,
                          },
                        ]}
                      />

                      {selectedClient.payments.length === 0 ? (
                        <EmptyState
                          icon={<CircleDollarSign className="h-6 w-6" />}
                          title="No hay pagos registrados"
                          description="Registra el primer pago de este cliente sin salir del perfil."
                          actionLabel={can("payments.create") ? "Registrar pago" : undefined}
                          onAction={
                            can("payments.create")
                              ? () => openPaymentCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.payments.map((payment) => {
                            const invoice = payment.invoice_id
                              ? invoiceById.get(payment.invoice_id)
                              : null;
                            return (
                              <div
                                key={payment.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {payment.reference ||
                                      payment.payment_number ||
                                      `Pago ${formatDate(payment.payment_date)}`}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {invoice ? `Factura ${invoice.number} · ` : ""}
                                    {paymentLabel(payment.method)} ·{" "}
                                    {formatDate(payment.payment_date)}
                                  </p>
                                  {payment.notes ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {payment.notes}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {money(payment.amount, payment.currency)}
                                    </p>
                                    <StatusBadge status={payment.status} />
                                  </div>
                                  {renderClient360QuickDetailButton(
                                    "payments",
                                    payment.id,
                                    "Ver pago",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="proposals" className="space-y-4">
                      {selectedClient.proposals.length === 0 ? (
                        <EmptyState
                          icon={<BriefcaseBusiness className="h-6 w-6" />}
                          title="No hay propuestas vinculadas"
                          description="Las propuestas creadas para este cliente aparecerán aquí."
                          actionLabel="Crear propuesta"
                          onAction={() => setQuickProposalOpen(true)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.proposals.map((proposal) => (
                            <div
                              key={proposal.id}
                              className="flex items-start justify-between gap-4 py-4"
                            >
                              <div>
                                <p className="text-sm font-normal text-slate-950">
                                  {proposal.title}
                                </p>
                                <p className="mt-1 text-xs font-normal text-slate-500">
                                  Propuesta {proposal.number} ·{" "}
                                  {money(proposal.amount, proposal.currency)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <StatusBadge status={proposal.status} />
                                {renderClient360QuickDetailButton(
                                  "proposals",
                                  proposal.id,
                                  "Ver propuesta",
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="credit-notes" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Notas de crédito
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Ajustes y créditos vinculados al cliente o a sus facturas.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openCreditNoteCreator(selectedClient)}
                          disabled={!can("credit_notes.issue")}
                        >
                          Crear nota
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "credit-notes-count",
                            label: "Notas",
                            value: selectedClient.creditNotes.length,
                          },
                          {
                            key: "credit-notes-applied",
                            label: "Emitidas / aplicadas",
                            value: selectedClient.appliedCreditNotes.length,
                          },
                          {
                            key: "credit-notes-total",
                            label: "Total acreditado",
                            value: money(
                              selectedClient.totalCreditAmount,
                              currencySettings.baseCurrency,
                            ),
                          },
                          {
                            key: "credit-notes-invoices",
                            label: "Facturas vinculadas",
                            value: new Set(
                              selectedClient.creditNotes
                                .map((creditNote) => creditNote.invoice_id)
                                .filter(Boolean),
                            ).size,
                          },
                        ]}
                      />

                      {selectedClient.creditNotes.length === 0 ? (
                        <EmptyState
                          icon={<FileText className="h-6 w-6" />}
                          title="No hay notas de crédito"
                          description="Crea el primer ajuste o crédito para este cliente sin salir del perfil."
                          actionLabel={can("credit_notes.issue") ? "Crear nota" : undefined}
                          onAction={
                            can("credit_notes.issue")
                              ? () => openCreditNoteCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.creditNotes.map((creditNote) => {
                            const invoice = creditNote.invoice_id
                              ? invoiceById.get(creditNote.invoice_id)
                              : null;
                            return (
                              <div
                                key={creditNote.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {creditNote.reason || "Nota de crédito"}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {creditNote.credit_note_number
                                      ? `Nota #${creditNote.credit_note_number} · `
                                      : ""}
                                    {invoice ? `Factura ${invoice.number} · ` : ""}
                                    {formatDate(creditNote.date_issued)}
                                  </p>
                                  {creditNote.notes ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {creditNote.notes}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {money(creditNote.amount, creditNote.currency)}
                                    </p>
                                    <StatusBadge status={creditNote.status} />
                                  </div>
                                  {renderClient360QuickDetailButton(
                                    "credit_notes",
                                    creditNote.id,
                                    "Ver nota de crédito",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="subscriptions" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Suscripciones
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Servicios recurrentes, ciclos activos y próximas renovaciones.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openSubscriptionCreator(selectedClient)}
                          disabled={!can("subscriptions.create")}
                        >
                          Crear suscripción
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "subscriptions-count",
                            label: "Suscripciones",
                            value: selectedClient.subscriptions.length,
                          },
                          {
                            key: "subscriptions-active",
                            label: "Activas / prueba",
                            value: selectedClient.activeSubscriptions.length,
                          },
                          {
                            key: "subscriptions-recurring",
                            label: "Monto recurrente",
                            value: money(
                              selectedClient.recurringAmount,
                              currencySettings.baseCurrency,
                            ),
                          },
                          {
                            key: "subscriptions-next",
                            label: "Próximo cobro",
                            value: selectedClient.activeSubscriptions.find((subscription) =>
                              Boolean(subscription.next_billing_date),
                            )?.next_billing_date
                              ? formatDate(
                                  selectedClient.activeSubscriptions.find((subscription) =>
                                    Boolean(subscription.next_billing_date),
                                  )?.next_billing_date || null,
                                )
                              : "—",
                          },
                        ]}
                      />

                      {selectedClient.subscriptions.length === 0 ? (
                        <EmptyState
                          icon={<Activity className="h-6 w-6" />}
                          title="No hay suscripciones"
                          description="Crea el primer servicio recurrente para este cliente sin salir del perfil."
                          actionLabel={
                            can("subscriptions.create") ? "Crear suscripción" : undefined
                          }
                          onAction={
                            can("subscriptions.create")
                              ? () => openSubscriptionCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.subscriptions.map((subscription) => {
                            const product = subscription.product_id
                              ? productById.get(subscription.product_id)
                              : null;
                            return (
                              <div
                                key={subscription.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {subscription.name}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {product ? `${product.name} · ` : ""}
                                    {subscriptionLabel(subscription.billing_cycle)}
                                    {subscription.next_billing_date
                                      ? ` · Próximo cobro ${formatDate(subscription.next_billing_date)}`
                                      : ""}
                                  </p>
                                  {subscription.notes ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {subscription.notes}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {money(subscription.amount, subscription.currency)}
                                    </p>
                                    <StatusBadge status={subscription.status} />
                                  </div>
                                  {renderClient360QuickDetailButton(
                                    "subscriptions",
                                    subscription.id,
                                    "Ver suscripción",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="expenses" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Gastos
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Costos operativos vinculados al cliente o a sus proyectos.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openExpenseCreator(selectedClient)}
                          disabled={!can("expenses.create")}
                        >
                          Crear gasto
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "expenses-count",
                            label: "Gastos",
                            value: selectedClient.expenses.length,
                          },
                          {
                            key: "expenses-paid",
                            label: "Pagados",
                            value: selectedClient.paidExpenses.length,
                          },
                          {
                            key: "expenses-total",
                            label: "Total registrado",
                            value: money(
                              selectedClient.totalExpenseAmount,
                              currencySettings.baseCurrency,
                            ),
                          },
                          {
                            key: "expenses-projects",
                            label: "Proyectos vinculados",
                            value: new Set(
                              selectedClient.expenses
                                .map((expense) => expense.project_id)
                                .filter(Boolean),
                            ).size,
                          },
                        ]}
                      />

                      {selectedClient.expenses.length === 0 ? (
                        <EmptyState
                          icon={<Receipt className="h-6 w-6" />}
                          title="No hay gastos registrados"
                          description="Registra costos asociados a este cliente sin salir del perfil."
                          actionLabel={can("expenses.create") ? "Crear gasto" : undefined}
                          onAction={
                            can("expenses.create")
                              ? () => openExpenseCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.expenses.map((expense) => {
                            const project = expense.project_id
                              ? selectedClient.projects.find(
                                  (item) => item.id === expense.project_id,
                                )
                              : null;
                            return (
                              <div
                                key={expense.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {expense.title}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {expense.vendor ? `${expense.vendor} · ` : ""}
                                    {expense.category || "General"} ·{" "}
                                    {formatDate(expense.expense_date)}
                                    {project ? ` · ${project.name}` : ""}
                                  </p>
                                  {expense.notes ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {expense.notes}
                                    </p>
                                  ) : null}
                                  {expense.receipt_url ? (
                                    <a
                                      href={expense.receipt_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                      Ver recibo
                                    </a>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {money(
                                        expense.amount,
                                        expense.currency ||
                                          expense.base_currency ||
                                          currencySettings.baseCurrency,
                                      )}
                                    </p>
                                    <StatusBadge status={expense.status} />
                                  </div>
                                  {renderClient360QuickDetailButton(
                                    "expenses",
                                    expense.id,
                                    "Ver gasto",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="contracts" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Contratos
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Acuerdos, firmas, renovaciones y vencimientos vinculados al cliente.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openContractCreator(selectedClient)}
                          disabled={!can("contracts.create")}
                        >
                          Crear contrato
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "contracts-count",
                            label: "Contratos",
                            value: selectedClient.contracts.length,
                          },
                          {
                            key: "contracts-active",
                            label: "Activos",
                            value: selectedClient.activeContracts.length,
                          },
                          {
                            key: "contracts-value",
                            label: "Valor contratado",
                            value: money(
                              selectedClient.totalContractValue,
                              currencySettings.baseCurrency,
                            ),
                          },
                          {
                            key: "contracts-expiring",
                            label: "Vencen pronto",
                            value: selectedClient.expiringContracts.length,
                          },
                        ]}
                      />

                      {selectedClient.contracts.length === 0 ? (
                        <EmptyState
                          icon={<ShieldAlert className="h-6 w-6" />}
                          title="No hay contratos vinculados"
                          description="Crea el primer contrato para este cliente sin salir del perfil."
                          actionLabel={can("contracts.create") ? "Crear contrato" : undefined}
                          onAction={
                            can("contracts.create")
                              ? () => openContractCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.contracts.map((contract) => {
                            const project = contract.project_id
                              ? selectedClient.projects.find(
                                  (item) => item.id === contract.project_id,
                                )
                              : null;
                            const signatureStatus = contract.signed_at
                              ? "Signed"
                              : contract.signature_status || "Not Signed";
                            return (
                              <div
                                key={contract.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {contract.subject}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {contract.contract_number
                                      ? `Contrato #${contract.contract_number} · `
                                      : ""}
                                    {contract.contract_type || "Acuerdo"}
                                    {project ? ` · ${project.name}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {contract.start_date
                                      ? formatDate(contract.start_date)
                                      : "Sin inicio"}
                                    {" - "}
                                    {contract.end_date
                                      ? formatDate(contract.end_date)
                                      : "Sin vencimiento"}
                                  </p>
                                  {contract.description ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {contract.description}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {money(
                                        contract.contract_value,
                                        contract.currency ||
                                          contract.base_currency ||
                                          currencySettings.baseCurrency,
                                      )}
                                    </p>
                                    <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                                      <StatusBadge status={contract.status} />
                                      <StatusBadge status={signatureStatus} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="tickets" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Tickets
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Solicitudes, soporte y casos abiertos vinculados al cliente.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openTicketCreator(selectedClient)}
                          disabled={!can("tickets.create")}
                        >
                          Crear ticket
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "tickets-count",
                            label: "Tickets",
                            value: selectedClient.tickets.length,
                          },
                          {
                            key: "tickets-open",
                            label: "Abiertos",
                            value: selectedClient.openTickets.length,
                          },
                          {
                            key: "tickets-urgent",
                            label: "Alta prioridad",
                            value: selectedClient.urgentTickets.length,
                          },
                          {
                            key: "tickets-overdue",
                            label: "Vencidos",
                            value: selectedClient.overdueTickets.length,
                          },
                        ]}
                      />

                      {selectedClient.tickets.length === 0 ? (
                        <EmptyState
                          icon={<MessageSquarePlus className="h-6 w-6" />}
                          title="No hay tickets vinculados"
                          description="Crea el primer ticket de soporte para este cliente sin salir del perfil."
                          actionLabel={can("tickets.create") ? "Crear ticket" : undefined}
                          onAction={
                            can("tickets.create")
                              ? () => openTicketCreator(selectedClient)
                              : undefined
                          }
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.tickets.map((ticket) => {
                            const project = ticket.project_id
                              ? selectedClient.projects.find(
                                  (item) => item.id === ticket.project_id,
                                )
                              : null;
                            const contact = ticket.contact_id
                              ? selectedClient.contacts.find(
                                  (item) => item.id === ticket.contact_id,
                                )
                              : null;
                            return (
                              <div
                                key={ticket.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-normal text-slate-950">
                                    {ticket.subject}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {ticket.ticket_number
                                      ? `Ticket #${ticket.ticket_number} · `
                                      : ""}
                                    {ticket.department || "Support"}
                                    {ticket.service ? ` · ${ticket.service}` : ""}
                                    {project ? ` · ${project.name}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {contact ? `${getContactName(contact)} · ` : ""}
                                    Última actividad {formatDateTime(ticket.updated_at)}
                                  </p>
                                  {ticket.description ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {ticket.description}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <div className="text-right">
                                    <p
                                      className={cn(
                                        "text-sm font-semibold",
                                        ["urgent", "high"].includes(
                                          normalizeStatus(ticket.priority),
                                        )
                                          ? "text-rose-600"
                                          : "text-slate-950",
                                      )}
                                    >
                                      {ticketLabel(ticket.priority)}
                                    </p>
                                    <StatusBadge status={ticket.status} />
                                  </div>
                                  {renderClient360QuickDetailButton(
                                    "tickets",
                                    ticket.id,
                                    "Ver ticket",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="reminders" className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Recordatorios
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Seguimientos, llamadas, demos y reuniones vinculadas a este cliente.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openReminderCreator(selectedClient)}
                        >
                          Crear recordatorio
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "reminders-count",
                            label: "Recordatorios",
                            value: selectedClient.reminders.length,
                          },
                          {
                            key: "reminders-open",
                            label: "Programados",
                            value: selectedClient.openReminders.length,
                          },
                          {
                            key: "reminders-overdue",
                            label: "Vencidos",
                            value: selectedClient.overdueReminders.length,
                          },
                          {
                            key: "reminders-next",
                            label: "Próximo",
                            value: selectedClient.upcomingReminders[0]
                              ? formatDateTime(selectedClient.upcomingReminders[0].start_at)
                              : "—",
                          },
                        ]}
                      />

                      {selectedClient.reminders.length === 0 ? (
                        <EmptyState
                          icon={<CalendarClock className="h-6 w-6" />}
                          title="No hay recordatorios vinculados"
                          description="Programa el próximo seguimiento del cliente sin salir del perfil."
                          actionLabel="Crear recordatorio"
                          onAction={() => openReminderCreator(selectedClient)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.reminders.map((reminder) => {
                            const project = reminder.related_project_id
                              ? selectedClient.projects.find(
                                  (item) => item.id === reminder.related_project_id,
                                )
                              : null;
                            const overdue =
                              !["completed", "cancelled"].includes(
                                normalizeStatus(reminder.status),
                              ) && String(reminder.start_at) < new Date().toISOString();
                            return (
                              <div
                                key={reminder.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-normal text-slate-950">
                                      {reminder.title}
                                    </p>
                                    {overdue ? (
                                      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
                                        Vencido
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {reminderLabel(reminder.type)} ·{" "}
                                    {formatDateTime(reminder.start_at)}
                                    {project ? ` · ${project.name}` : ""}
                                    {reminder.location ? ` · ${reminder.location}` : ""}
                                  </p>
                                  {reminder.description ? (
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {reminder.description}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <StatusBadge status={reminder.status} />
                                  {renderClient360QuickDetailButton(
                                    "calendar",
                                    reminder.id,
                                    "Ver recordatorio",
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="vault" className="space-y-5">
                      {!canManageVault ? (
                        <EmptyState
                          icon={<ShieldAlert className="h-6 w-6" />}
                          title="Vault restringido"
                          description="Esta información está disponible solo para administración y gerencia."
                        />
                      ) : selectedClient.vaultItems.length === 0 ? (
                        <EmptyState
                          icon={<ShieldAlert className="h-6 w-6" />}
                          title="No hay accesos guardados"
                          description="Guarda credenciales, llaves o notas seguras vinculadas directamente a este cliente."
                          actionLabel="Nuevo acceso"
                          onAction={() => openVaultCreator(selectedClient)}
                        />
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-normal uppercase tracking-wide text-slate-500">
                                Vault del cliente
                              </p>
                              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                                Accesos y datos sensibles
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                Información operativa guardada para {selectedClient.company_name}.
                              </p>
                            </div>
                            <Button
                              type="button"
                              className="rounded-full"
                              onClick={() => openVaultCreator(selectedClient)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Nuevo acceso
                            </Button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <ClientKpi label="Guardados" value={selectedClient.vaultItems.length} />
                            <ClientKpi
                              label="Críticos"
                              value={selectedClient.criticalVaultItems.length}
                              tone={selectedClient.criticalVaultItems.length ? "danger" : "neutral"}
                            />
                            <ClientKpi
                              label="Por revisar"
                              value={selectedClient.vaultItemsToReview.length}
                              tone={
                                selectedClient.vaultItemsToReview.length ? "warning" : "neutral"
                              }
                            />
                          </div>

                          <div className="divide-y divide-slate-100 border-y border-slate-100">
                            {selectedClient.vaultItems.map((item) => {
                              const revealed = revealedVaultItemIds.has(item.id);
                              const linkedProject = item.project_id
                                ? projectById.get(item.project_id)
                                : null;
                              const owner = item.owner_id
                                ? managers.find((manager) => manager.id === item.owner_id)
                                : null;

                              return (
                                <div
                                  key={item.id}
                                  className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                                >
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                      <KeyRound className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold text-slate-950">
                                          {item.title}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className={vaultStatusClass(item.status)}
                                        >
                                          {vaultOptionLabel(VAULT_STATUSES, item.status)}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className={vaultSensitivityClass(item.sensitivity)}
                                        >
                                          {vaultOptionLabel(VAULT_SENSITIVITY, item.sensitivity)}
                                        </Badge>
                                      </div>
                                      <p className="mt-1 text-sm text-slate-500">
                                        {vaultOptionLabel(VAULT_CATEGORIES, item.category)}
                                        {linkedProject ? ` · ${linkedProject.name}` : ""}
                                        {owner?.full_name ? ` · ${owner.full_name}` : ""}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(item.tags || []).map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="bg-slate-100"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm lg:min-w-[360px]">
                                    <div className="grid gap-1 sm:grid-cols-2">
                                      <div>
                                        <p className="text-xs uppercase text-slate-400">Usuario</p>
                                        <p className="truncate font-medium text-slate-700">
                                          {item.username || item.email || "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase text-slate-400">Vence</p>
                                        <p className="font-medium text-slate-700">
                                          {formatDate(item.expires_at)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="min-w-0 flex-1 truncate font-mono text-slate-700">
                                        {item.secret_value
                                          ? revealed
                                            ? item.secret_value
                                            : "••••••••••••"
                                          : "Sin secreto"}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => toggleVaultReveal(item)}
                                        disabled={!item.secret_value}
                                        aria-label={
                                          revealed ? "Ocultar secreto" : "Revelar secreto"
                                        }
                                      >
                                        {revealed ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => void copyVaultSecret(item)}
                                        disabled={!item.secret_value}
                                        aria-label="Copiar secreto"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      {item.url ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full"
                                          asChild
                                        >
                                          <a
                                            href={
                                              item.url.startsWith("http")
                                                ? item.url
                                                : `https://${item.url}`
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="Abrir URL"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="files" className="space-y-4">
                      <ClientFilesPanel
                        clientId={selectedClient.id}
                        clientName={selectedClient.company_name}
                        driveFolderUrl={selectedClient.drive_folder_url}
                        canEdit={can("clients.edit")}
                      />
                    </TabsContent>

                    <TabsContent value="tasks" className="space-y-5">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Tareas del cliente
                          </h3>
                          <p className="mt-1 text-sm font-normal text-slate-500">
                            Seguimientos, pendientes y trabajo operativo vinculado a esta cuenta.
                          </p>
                        </div>
                        <CrmDetailLineButton
                          className="h-8 shrink-0"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => openCreateTaskForClient(selectedClient)}
                          disabled={!canCreateTaskForClient(selectedClient)}
                        >
                          Crear tarea
                        </CrmDetailLineButton>
                      </div>

                      <CrmDetailSummaryGrid
                        className="border-b border-slate-100 pb-4"
                        items={[
                          {
                            key: "tasks-total",
                            label: "Tareas",
                            value: selectedClient.tasks.length,
                          },
                          {
                            key: "tasks-open",
                            label: "Abiertas",
                            value: selectedClient.openTasks.length,
                          },
                          {
                            key: "tasks-overdue",
                            label: "Vencidas",
                            value: selectedClient.overdueTasks.length,
                          },
                          {
                            key: "tasks-next",
                            label: "Próxima",
                            value: selectedClient.nextOpenTask?.due_date
                              ? formatDate(selectedClient.nextOpenTask.due_date)
                              : "—",
                          },
                        ]}
                      />

                      {selectedClient.tasks.length === 0 ? (
                        <EmptyState
                          icon={<CheckCircle2 className="h-6 w-6" />}
                          title="No hay tareas vinculadas"
                          description="Las tareas del cliente aparecerán aquí para gestionarlas sin salir del perfil."
                          actionLabel="Crear tarea"
                          onAction={() => openCreateTaskForClient(selectedClient)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {selectedClient.tasks.map((task) => {
                            const overdue =
                              isOverdue(task.due_date) && isOpenTaskStatus(task.status);
                            const project = task.related_project_id
                              ? projectById.get(task.related_project_id)
                              : null;
                            return (
                              <div
                                key={task.id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-normal text-slate-950">
                                      {task.title}
                                    </p>
                                    {overdue ? (
                                      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
                                        Vencida
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-xs font-normal text-slate-500">
                                    {task.due_date
                                      ? `Vence ${formatDate(task.due_date)}`
                                      : "Sin fecha"}
                                    {" · "}
                                    Prioridad {PROJECT_LABELS[task.priority] || task.priority}
                                    {project ? ` · ${project.name}` : ""}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                                  <StatusBadge status={task.status} />
                                  {renderClient360QuickDetailButton("tasks", task.id, "Ver tarea")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-activity"
                      value="activity"
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                          Actividad reciente
                        </h3>
                        <p className="mt-1 text-sm font-normal text-slate-500">
                          Una línea de tiempo unificada con lo último que pasó en esta cuenta.
                        </p>
                      </div>

                      {activityFeed.length === 0 ? (
                        <EmptyState
                          icon={<Activity className="h-6 w-6" />}
                          title="No hay actividad reciente todavía"
                          description="Cuando se actualicen contactos, facturas, tareas o proyectos, aparecerán aquí."
                          actionLabel="Agregar contacto"
                          onAction={() => openContactCreator(selectedClient.id)}
                        />
                      ) : (
                        <div className="divide-y divide-slate-100 border-y border-slate-100">
                          {activityFeed.map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.id} className="flex items-start gap-3 py-4">
                                <div
                                  className={cnJoin(
                                    "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-100 bg-white",
                                    item.tone,
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-normal text-slate-950">{item.title}</p>
                                      <p className="text-sm font-normal text-slate-500">
                                        {item.description}
                                      </p>
                                    </div>
                                    <span className="text-xs font-normal text-slate-500">
                                      {relativeLabel(item.at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          if (invoiceSaving) return;
          setInvoiceDialogOpen(open);
          if (!open) {
            setInvoiceClientId(null);
            setInvoiceError(null);
          }
        }}
      >
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-xl sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-4 py-4 text-left sm:px-6">
            <DialogTitle className="text-xl font-normal tracking-normal text-slate-950">
              Nueva factura
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-slate-500">
              {invoiceDialogClient
                ? `${invoiceDialogClient.company_name} · los datos del cliente ya están cargados.`
                : "Completa los datos principales de la factura."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-5 sm:px-6">
              <InvoiceEditor
                mode="create"
                initialDraft={invoiceInitialDraft}
                clients={clients}
                products={products}
                proposals={proposals}
                statusOptions={INVOICE_STATUSES}
                saving={invoiceSaving}
                error={invoiceError}
                onCancel={() => {
                  if (invoiceSaving) return;
                  setInvoiceDialogOpen(false);
                  setInvoiceClientId(null);
                  setInvoiceError(null);
                }}
                onSaveDraft={async (draft) => {
                  await saveClientInvoiceDraft(draft, "Draft");
                }}
                onConfirmSend={async (draft) => {
                  await saveClientInvoiceDraft(draft, "Sent");
                }}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentInitialValues(undefined);
        }}
        initialValues={paymentInitialValues}
        onCreated={(result) => {
          void handleClientPaymentCreated(result);
        }}
      />

      <CrmCreationDialog
        open={creditNoteDialogOpen}
        onOpenChange={(open) => {
          if (creditNoteSaving) return;
          setCreditNoteDialogOpen(open);
          if (!open) setCreditNoteClientId(null);
        }}
        title="Nueva nota de crédito"
        description={`${creditNoteDialogClient?.company_name || "Cliente seleccionado"} · Registra un ajuste o crédito vinculado a esta cuenta.`}
        size="md"
      >
        <form
          key={creditNoteDialogClient?.id || "credit-note"}
          onSubmit={handleCreditNoteSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Razón</Label>
              <Input
                name="reason"
                placeholder="Ajuste de factura, descuento, devolución..."
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Factura vinculada</Label>
              <Select name="invoice_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin factura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin factura</SelectItem>
                  {(creditNoteDialogClient?.invoices || []).map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.number} · {money(invoice.total, rowCurrency(invoice))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Monto</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha</Label>
              <Input
                name="date_issued"
                type="date"
                defaultValue={isoDate()}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue="Draft">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Draft"].map((status) => (
                    <SelectItem key={status} value={status}>
                      {creditNoteLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Contexto interno del ajuste."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (creditNoteSaving) return;
                setCreditNoteDialogOpen(false);
                setCreditNoteClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={crmFormStyles.primaryButton}
              disabled={creditNoteSaving}
            >
              {creditNoteSaving ? "Guardando..." : "Crear nota"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={subscriptionDialogOpen}
        onOpenChange={(open) => {
          if (subscriptionSaving) return;
          setSubscriptionDialogOpen(open);
          if (!open) setSubscriptionClientId(null);
        }}
        title="Nueva suscripción"
        description={`${subscriptionDialogClient?.company_name || "Cliente seleccionado"} · Crea un servicio recurrente para esta cuenta.`}
        size="md"
      >
        <form
          key={subscriptionDialogClient?.id || "subscription"}
          onSubmit={handleSubscriptionSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Nombre de la suscripción</Label>
              <Input
                name="name"
                placeholder={`Servicio recurrente para ${subscriptionDialogClient?.company_name || "cliente"}`}
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Producto o servicio</Label>
              <Select name="product_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin producto</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Monto recurrente</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Ciclo</Label>
              <Select name="billing_cycle" defaultValue="Monthly">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CYCLES.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {subscriptionLabel(cycle)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue="Active">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {subscriptionLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha de inicio</Label>
              <Input
                name="start_date"
                type="date"
                defaultValue={isoDate()}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Próximo cobro</Label>
              <Input name="next_billing_date" type="date" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Fecha de finalización</Label>
              <Input name="end_date" type="date" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Condiciones, alcance o detalles internos del servicio recurrente."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (subscriptionSaving) return;
                setSubscriptionDialogOpen(false);
                setSubscriptionClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={crmFormStyles.primaryButton}
              disabled={subscriptionSaving}
            >
              {subscriptionSaving ? "Guardando..." : "Crear suscripción"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={expenseDialogOpen}
        onOpenChange={(open) => {
          if (expenseSaving) return;
          setExpenseDialogOpen(open);
          if (!open) setExpenseClientId(null);
        }}
        title="Nuevo gasto"
        description={`${expenseDialogClient?.company_name || "Cliente seleccionado"} · Registra un costo vinculado a esta cuenta.`}
        size="md"
      >
        <form
          key={expenseDialogClient?.id || "expense"}
          onSubmit={handleExpenseSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Título del gasto</Label>
              <Input
                name="title"
                placeholder="Compra, servicio externo, transporte..."
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Proveedor</Label>
              <Input name="vendor" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Categoría</Label>
              <Input name="category" defaultValue="General" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Proyecto vinculado</Label>
              <Select name="project_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {(expenseDialogClient?.projects || []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Monto</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue="Pending">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {expenseLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha del gasto</Label>
              <Input
                name="expense_date"
                type="date"
                defaultValue={isoDate()}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>URL del recibo</Label>
              <Input
                name="receipt_url"
                type="url"
                placeholder="https://..."
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Detalle interno del gasto."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (expenseSaving) return;
                setExpenseDialogOpen(false);
                setExpenseClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={expenseSaving}>
              {expenseSaving ? "Guardando..." : "Crear gasto"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <ContractEditorDialog
        open={contractDialogOpen}
        onOpenChange={(open) => {
          setContractDialogOpen(open);
          if (!open) setContractClientId(null);
        }}
        contract={null}
        clients={clients}
        projects={projects}
        profiles={managers}
        initialValues={contractInitialValues}
        onSaved={async () => {
          await fetchContracts();
          toast.success("Contrato vinculado al cliente.");
        }}
      />

      <CrmCreationDialog
        open={ticketDialogOpen}
        onOpenChange={(open) => {
          if (ticketSaving) return;
          setTicketDialogOpen(open);
          if (!open) setTicketClientId(null);
        }}
        title="Nuevo ticket"
        description={`${ticketDialogClient?.company_name || "Cliente seleccionado"} · Registra una solicitud o caso de soporte.`}
        size="md"
      >
        <form
          key={ticketDialogClient?.id || "ticket"}
          onSubmit={handleTicketSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Asunto</Label>
              <Input
                name="subject"
                placeholder="Describe brevemente la solicitud"
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Contacto</Label>
              <Select name="contact_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin contacto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin contacto</SelectItem>
                  {(ticketDialogClient?.contacts || []).map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {getContactName(contact)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Proyecto vinculado</Label>
              <Select name="project_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {(ticketDialogClient?.projects || []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue="Open">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ticketLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Prioridad</Label>
              <Select name="priority" defaultValue="Medium">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {ticketLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Departamento</Label>
              <Input name="department" defaultValue="Support" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Servicio</Label>
              <Input name="service" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Responsable</Label>
              <Select
                name="assigned_to"
                defaultValue={ticketDialogClient?.account_manager || profile?.id || "none"}
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email || "Usuario"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Descripción</Label>
              <Textarea
                name="description"
                rows={5}
                placeholder="Contexto del caso, pasos realizados o solicitud del cliente."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (ticketSaving) return;
                setTicketDialogOpen(false);
                setTicketClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={ticketSaving}>
              {ticketSaving ? "Guardando..." : "Crear ticket"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={reminderDialogOpen}
        onOpenChange={(open) => {
          if (reminderSaving) return;
          setReminderDialogOpen(open);
          if (!open) setReminderClientId(null);
        }}
        title="Nuevo recordatorio"
        description={`${reminderDialogClient?.company_name || "Cliente seleccionado"} · Programa el próximo seguimiento.`}
        size="md"
      >
        <form
          key={reminderDialogClient?.id || "reminder"}
          onSubmit={handleReminderSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Título</Label>
              <Input
                name="title"
                defaultValue={
                  reminderDialogClient
                    ? `Dar seguimiento a ${reminderDialogClient.company_name}`
                    : ""
                }
                placeholder="Seguimiento, llamada, reunión..."
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Tipo</Label>
              <Select name="type" defaultValue="reminder">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_REMINDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {reminderLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha y hora</Label>
              <Input
                name="start_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalInputValue()}
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Proyecto vinculado</Label>
              <Select name="related_project_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {(reminderDialogClient?.projects || []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Lugar</Label>
              <Input
                name="location"
                placeholder="Teléfono, oficina, Google Meet..."
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="description"
                rows={5}
                placeholder="Contexto del seguimiento, temas a tratar o próximos pasos."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (reminderSaving) return;
                setReminderDialogOpen(false);
                setReminderClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={reminderSaving}>
              {reminderSaving ? "Guardando..." : "Crear recordatorio"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={vaultDialogOpen}
        onOpenChange={(open) => {
          if (vaultSaving) return;
          setVaultDialogOpen(open);
          if (!open) setVaultClientId(null);
        }}
        title="Nuevo acceso seguro"
        description={`${vaultDialogClient?.company_name || "Cliente seleccionado"} · Guarda información sensible vinculada a esta cuenta.`}
        size="lg"
      >
        <form
          key={vaultDialogClient?.id || "vault"}
          onSubmit={handleVaultSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Nombre del acceso</Label>
              <Input
                name="title"
                placeholder="Ej: Hosting, dominio, portal del cliente..."
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Categoría</Label>
              <Select name="category" defaultValue="login">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAULT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Nivel</Label>
              <Select name="sensitivity" defaultValue="restricted">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAULT_SENSITIVITY.map((sensitivity) => (
                    <SelectItem key={sensitivity.value} value={sensitivity.value}>
                      {sensitivity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Proyecto vinculado</Label>
              <Select name="project_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {(vaultDialogClient?.projects || []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Responsable</Label>
              <Select name="owner_id" defaultValue={vaultDialogClient?.account_manager || "none"}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin responsable</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email || "Usuario"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAULT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Vence</Label>
              <Input name="expires_at" type="date" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>URL</Label>
              <Input name="url" placeholder="https://..." className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Usuario</Label>
              <Input name="username" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Correo</Label>
              <Input name="email" type="email" className={crmFormStyles.input} />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Secreto</Label>
              <Input
                name="secret_value"
                type="password"
                placeholder="Contraseña, token o llave"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Etiquetas</Label>
              <Input
                name="tags"
                placeholder="producción, hosting, dominio..."
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Contexto, instrucciones o detalles operativos."
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                if (vaultSaving) return;
                setVaultDialogOpen(false);
                setVaultClientId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={vaultSaving}>
              {vaultSaving ? "Guardando..." : "Guardar acceso"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <QuickCreateDialog
        type="client"
        open={quickClientOpen}
        onOpenChange={setQuickClientOpen}
        context={{
          sourceType: "manual",
          prefill: {
            account_manager: profile?.id || null,
          },
        }}
        onCreated={(args) => {
          if (args.record?.id) {
            setSelectedClientId(String(args.record.id));
          }
          toast.success("Cliente creado rápido.");
        }}
      />

      <QuickCreateDialog
        type="proposal"
        open={quickProposalOpen}
        onOpenChange={setQuickProposalOpen}
        context={
          selectedClient
            ? {
                sourceType: "client",
                sourceId: selectedClient.id,
                prefill: {
                  client_id: selectedClient.id,
                  title: `Propuesta — ${selectedClient.company_name}`,
                  currency: "USD",
                  valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                },
              }
            : undefined
        }
        onCreated={() => {
          toast.success("Propuesta vinculada al cliente.");
        }}
      />

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetClientDialog();
        }}
        title={editClient ? "Editar cliente" : "Nuevo cliente"}
        description="Completa los datos principales para registrar la cuenta y sus contactos clave."
        size="lg"
      >
        <form
          key={editClient?.id || "new-client"}
          onSubmit={handleClientSubmit}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Nombre de la empresa</Label>
              <Input
                name="company_name"
                defaultValue={editClient?.company_name || ""}
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Contacto principal rápido</Label>
              <Input
                name="contact_person"
                defaultValue={editClient?.contact_person || ""}
                placeholder="Referencia rápida"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Correo electrónico</Label>
              <Input
                name="email"
                type="email"
                defaultValue={editClient?.email || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Teléfono</Label>
              <Input
                name="phone"
                defaultValue={editClient?.phone || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>WhatsApp</Label>
              <Input
                name="whatsapp"
                defaultValue={editClient?.whatsapp || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Industria</Label>
              <Input
                name="industry"
                defaultValue={editClient?.industry || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Responsable</Label>
              <Select
                name="account_manager"
                defaultValue={editClient?.account_manager || undefined}
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {managerOptions.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue={editClient?.status || "Active"}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {clientStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Sitio web</Label>
              <Input
                name="website"
                defaultValue={editClient?.website || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>ID fiscal</Label>
              <Input
                name="tax_id"
                defaultValue={editClient?.tax_id || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Ciudad</Label>
              <Input
                name="city"
                defaultValue={editClient?.city || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>País</Label>
              <Input
                name="country"
                defaultValue={editClient?.country || ""}
                className={crmFormStyles.input}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Dirección</Label>
              <Input
                name="address"
                defaultValue={editClient?.address || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Etiquetas</Label>
              <Input
                name="tags"
                defaultValue={(editClient?.tags || []).join(", ")}
                placeholder="vip, recurrente, saludable"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                defaultValue={editClient?.notes || ""}
                rows={4}
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={resetClientDialog}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton}>
              {editClient ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetContactDialog();
        }}
        title={editContact ? "Editar contacto" : "Nuevo contacto"}
        description={`${selectedClient?.company_name || "Selecciona un cliente"} · Completa la información del contacto operativo.`}
        size="lg"
      >
        <form
          key={editContact?.id || "new-contact"}
          onSubmit={handleContactSubmit}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Nombre</Label>
              <Input
                name="first_name"
                defaultValue={editContact?.first_name || ""}
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Apellido</Label>
              <Input
                name="last_name"
                defaultValue={editContact?.last_name || ""}
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Cargo</Label>
              <Input
                name="position"
                defaultValue={editContact?.position || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Departamento</Label>
              <Input
                name="department"
                defaultValue={editContact?.department || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Correo electrónico</Label>
              <Input
                name="email"
                type="email"
                defaultValue={editContact?.email || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Teléfono</Label>
              <Input
                name="phone"
                defaultValue={editContact?.phone || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>WhatsApp</Label>
              <Input
                name="whatsapp"
                defaultValue={editContact?.whatsapp || ""}
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Etiquetas</Label>
              <Input
                name="tags"
                defaultValue={(editContact?.tags || []).join(", ")}
                placeholder="principal, finanzas"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Notas</Label>
              <Textarea
                name="notes"
                defaultValue={editContact?.notes || ""}
                rows={4}
                className={crmFormStyles.textarea}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div>
              <p className="text-sm font-normal text-slate-950">Contacto primario</p>
              <p className="text-sm font-normal text-slate-500">
                Marca este contacto como el principal para la cuenta.
              </p>
            </div>
            <Checkbox
              checked={contactIsPrimary}
              onCheckedChange={(checked) => setContactIsPrimary(Boolean(checked))}
              aria-label="Marcar como contacto primario"
            />
          </label>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={resetContactDialog}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton}>
              {editContact ? "Guardar contacto" : "Crear contacto"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <CrmCreationDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetProjectDialog();
        }}
        title="Nuevo proyecto"
        description={`${projectDialogClient?.company_name || "Cliente seleccionado"} · Crea un proyecto vinculado a esta cuenta.`}
        size="lg"
      >
        <form
          key={projectClientId || "new-client-project"}
          onSubmit={handleProjectSubmit}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Nombre del proyecto</Label>
              <Input
                name="name"
                className={crmFormStyles.input}
                placeholder={`Proyecto para ${projectDialogClient?.company_name || "cliente"}`}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Responsables</Label>
              <ProfileMultiPicker
                value={projectAssigneeIds}
                profiles={managerOptions}
                onChange={setProjectAssigneeIds}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Producto o servicio</Label>
              <Select name="product_id" defaultValue="none">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Sin producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin producto</SelectItem>
                  {products
                    .filter((product) => product.is_active !== false)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.category ? `${product.name} · ${product.category}` : product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha de inicio</Label>
              <Input name="start_date" type="date" className={crmFormStyles.input} />
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fecha de entrega</Label>
              <Input name="due_date" type="date" className={crmFormStyles.input} />
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado inicial</Label>
              <Select name="status" defaultValue="Not Started">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PROJECT_LABELS[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Prioridad</Label>
              <Select name="priority" defaultValue="Medium">
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PROJECT_LABELS[priority] || priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Presupuesto</Label>
              <Input name="budget" type="number" min="0" className={crmFormStyles.input} />
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Progreso inicial (%)</Label>
              <Input
                name="progress"
                type="number"
                min="0"
                max="100"
                defaultValue="0"
                className={crmFormStyles.input}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className={crmFormStyles.label}>Descripción</Label>
              <Textarea
                name="description"
                rows={5}
                className={crmFormStyles.textarea}
                placeholder="Alcance, entregables, notas del cliente o próximos pasos."
              />
            </div>
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={resetProjectDialog}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton}>
              Crear proyecto
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClientDelete}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
