import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  Mail,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  Plus,
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
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { logActivityEvent } from "@/lib/activity-log";
import { LoadingMetrics, LoadingTable } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { SearchFilters } from "@/components/crm/search-filters";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export const Route = createFileRoute("/clients")({
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

const CLIENT_STATUSES = ["Active", "VIP", "Pending", "Inactive", "Past Client"] as const;
const CLIENT_HEALTH_FILTERS = ["all", "active", "attention", "risk", "inactive"] as const;
const CONTACT_PRESENCE_FILTERS = ["all", "with", "without", "primary"] as const;
const FINANCE_FILTERS = ["all", "pending", "overdue", "clear"] as const;
const ACTIVITY_FILTERS = ["all", "recent7", "stale30", "stale60"] as const;

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
  status: string;
  progress: number | null;
  due_date: string | null;
  updated_at: string;
}

interface TaskRow {
  id: string;
  company_id: string;
  title: string;
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
  is_active: boolean;
}

interface InvoiceRow {
  id: string;
  company_id: string;
  client_id: string | null;
  number: string;
  status: string;
  total: number;
  due_date: string | null;
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
  department: string | null;
  is_active: boolean;
}

interface ClientSnapshot extends ClientRow {
  contacts: ContactRow[];
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

function money(value: number | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString("es-DO")}`;
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

function splitTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
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

function clientFinanceLabel(client: ClientSnapshot) {
  if (client.overdueInvoices.length > 0) {
    return `${client.overdueInvoices.length} vencida${client.overdueInvoices.length > 1 ? "s" : ""}`;
  }
  if (client.pendingInvoices.length > 0) {
    return `${client.pendingInvoices.length} pendiente${client.pendingInvoices.length > 1 ? "s" : ""}`;
  }
  return "Al día";
}

function buildClientCsv(clients: ClientSnapshot[]) {
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
    money(client.pendingInvoiceAmount),
    String(client.overdueTasks.length),
    money(client.openPipelineValue),
    client.notes || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  meta,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  meta?: string;
}) {
  return (
    <article className="group flex min-h-[96px] items-center gap-3 rounded-[18px] border border-[#e6eaf0] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition-all duration-200 hover:-translate-y-[4px] hover:border-[#cbd8ee] hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <div
        className={cnJoin(
          "grid h-11 w-11 place-items-center rounded-[15px] transition-transform duration-200 group-hover:scale-[1.08]",
          tone,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#667085] transition-colors group-hover:text-[#1d62f9]">
          {label}
        </p>
        <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#101828] transition-colors group-hover:text-[#1d62f9]">
          {value}
        </p>
        {meta && <p className="text-[11px] font-normal text-[#667085]">{meta}</p>}
      </div>
    </article>
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
  const { profile, user } = useAuth();
  const { can, role } = usePermissions();
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
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickProposalOpen, setQuickProposalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
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
      "id,company_id,company_name,contact_person,email,phone,whatsapp,address,city,country,tax_id,website,industry,status,account_manager,tags,notes,created_at,updated_at",
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

  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
  } = useCrud<ProjectRow>({
    table: "projects",
    select: "id,company_id,client_id,name,status,progress,due_date,updated_at",
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
      "id,company_id,title,status,priority,due_date,updated_at,related_client_id,related_project_id",
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
    select: "id,company_id,name,category,type,base_price,currency,billing_type,is_active",
    orderBy: "name",
    ascending: true,
    limit: 2000,
  });

  const {
    data: invoices,
    loading: invoicesLoading,
    error: invoicesError,
  } = useCrud<InvoiceRow>({
    table: "invoices",
    select: "id,company_id,client_id,number,status,total,due_date,updated_at",
    orderBy: "updated_at",
    ascending: false,
  });

  const {
    data: proposals,
    loading: proposalsLoading,
    error: proposalsError,
  } = useCrud<ProposalRow>({
    table: "proposals",
    select: "id,company_id,client_id,number,title,amount,status,valid_until,updated_at",
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
    select: "id,company_id,full_name,user_id,department,is_active",
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
    proposalsError,
    dealsError,
    managersError,
  ]);

  const managerNameById = useMemo(() => {
    return new Map(managers.map((manager) => [manager.id, manager.full_name]));
  }, [managers]);

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
  }, [profile?.company_id]);

  const contactsByClient = useMemo(
    () => groupBy(contacts, (contact) => contact.client_id),
    [contacts],
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

  const snapshots = useMemo<ClientSnapshot[]>(() => {
    return clients.map((client) => {
      const clientContacts = contactsByClient.get(client.id) || [];
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
      const clientProposals = proposalsByClient.get(client.id) || [];
      const clientDeals = dealsByClient.get(client.id) || [];
      const cps = (clientProductsByClient.get(client.id) || []) as ClientProductRow[];
      const purchasedProducts = cps.map((cp) => ({
        clientProduct: cp,
        product: productById.get(cp.product_id) || null,
      }));
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
        (sum, invoice) => sum + Number(invoice.total || 0),
        0,
      );
      const openPipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
      const latestActivityAt = maxDate([
        client.updated_at,
        ...clientContacts.map((contact) => contact.updated_at),
        ...clientProjects.map((project) => project.updated_at),
        ...clientTasks.map((task) => task.updated_at),
        ...clientInvoices.map((invoice) => invoice.updated_at),
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
    dealsByClient,
    invoicesByClient,
    managerNameById,
    productById,
    projectsByClient,
    proposalsByClient,
    tasksByClient,
    tasksByProject,
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
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  const managerOptions = useMemo(() => managers.filter((manager) => manager.is_active), [managers]);
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

  const canCreateTaskForClient = (client: ClientSnapshot): boolean => {
    if (!profile?.company_id || !profile?.id) return false;
    if (!can("tasks.create")) return false;
    if (role === "viewer") return false;
    if (role === "sales_agent")
      return Boolean(
        client.account_manager && String(client.account_manager) === String(profile.id),
      );
    return true;
  };

  const openCreateTaskForClient = (client: ClientSnapshot) => {
    setSelectedClientId(client.id);
    setQuickTaskOpen(true);
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
    selectedClient.projects.forEach((project) => relatedEntityIds.add(project.id));
    selectedClient.tasks.forEach((task) => relatedEntityIds.add(task.id));
    selectedClient.invoices.forEach((invoice) => relatedEntityIds.add(invoice.id));
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
      projects: "bg-emerald-50 text-emerald-700",
      tasks: "bg-rose-50 text-rose-700",
      clients: "bg-emerald-50 text-emerald-700",
    };

    const activityIconByEntity: Record<string, ComponentType<{ className?: string }>> = {
      leads: Users,
      deals: BriefcaseBusiness,
      proposals: FileText,
      invoices: Receipt,
      projects: FolderKanban,
      tasks: Clock3,
      clients: Activity,
    };

    const logItems = activityLogs
      .filter((log) => {
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

    if (logItems.length > 0) {
      return logItems
        .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
        .slice(0, 8);
    }

    const items: ActivityItem[] = [];

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
        description: `${money(invoice.total)} · Vence ${formatDate(invoice.due_date)}`,
        at: invoice.updated_at,
        icon: Receipt,
        tone: "bg-rose-50 text-rose-700",
      });
    });

    selectedClient.pendingInvoices.slice(0, 3).forEach((invoice) => {
      items.push({
        id: `invoice-${invoice.id}`,
        title: `Factura pendiente ${invoice.number}`,
        description: `${money(invoice.total)} · Estado ${invoice.status}`,
        at: invoice.updated_at,
        icon: CircleDollarSign,
        tone: "bg-amber-50 text-amber-700",
      });
    });

    selectedClient.overdueTasks.slice(0, 3).forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        title: `Tarea atrasada`,
        description: `${task.title} · ${task.priority}`,
        at: task.updated_at,
        icon: Clock3,
        tone: "bg-rose-50 text-rose-700",
      });
    });

    selectedClient.pendingProposals.slice(0, 3).forEach((proposal) => {
      items.push({
        id: `proposal-${proposal.id}`,
        title: `Propuesta ${proposal.number}`,
        description: `${proposal.title} · ${money(proposal.amount)}`,
        at: proposal.updated_at,
        icon: FileText,
        tone: "bg-violet-50 text-violet-700",
      });
    });

    selectedClient.openDeals.slice(0, 3).forEach((deal) => {
      items.push({
        id: `deal-${deal.id}`,
        title: `Oportunidad abierta`,
        description: `${deal.name} · ${deal.stage} · ${money(deal.value)}`,
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

    return items
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, 8);
  }, [activityLogs, selectedClient]);

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

  const openCreateClient = () => {
    setEditClient(null);
    setQuickClientOpen(true);
  };

  const openEditClient = (client: ClientRow) => {
    setEditClient(client);
    setDialogOpen(true);
  };

  const openContactCreator = (clientId: string) => {
    setEditContact(null);
    setContactClientId(clientId);
    setContactIsPrimary(false);
    setContactDialogOpen(true);
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

  const exportVisible = () => {
    if (filteredClients.length === 0) return;
    const csv = buildClientCsv(filteredClients);
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

  return (
    <div data-demo="clients-main" className="min-h-[calc(100vh-72px)] bg-white text-[#101828]">
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="w-fit text-[26px] font-semibold leading-none tracking-[-0.03em] transition-colors duration-200 hover:text-[#1d62f9]">
              Clientes
            </h1>
            <p className="mt-2 text-[14px] font-[650] text-[#667085]">
              Gestiona cuentas activas, contactos, proyectos, finanzas y la salud comercial de cada
              cliente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              className="h-[38px] rounded-[12px] border-[#e6eaf0] bg-white px-[13px] text-[13px] font-semibold text-[#344054] shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#bdd1ff] hover:text-[#1d62f9]"
              onClick={exportVisible}
              type="button"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar visibles
            </Button>
            {can("clients.create") && (
              <Button
                className="h-[38px] rounded-[12px] bg-[#1d62f9] px-[13px] text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(29,98,249,0.20)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0f52dd]"
                onClick={openCreateClient}
                type="button"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            )}
          </div>
        </header>

        <section
          data-demo="clients-insights-bar"
          className="flex flex-wrap items-center gap-2 border-y border-[#edf1f7] bg-white px-1 py-2 text-[12px] font-semibold text-[#667085]"
        >
          <span className="text-[#101828]">{filteredClients.length} visibles</span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#1d62f9]">{activeClientsCount}</strong> activos
          </span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#7c3aed]">{vipClientsCount}</strong> VIP
          </span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#e11d48]">{attentionCount}</strong> con atención
          </span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#16a34a]">{contactsCount}</strong> contactos
          </span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#d97706]">{activeProjectsCount}</strong> proyectos activos
          </span>
          <span className="text-[#d0d5dd]">•</span>
          <span>
            <strong className="text-[#f97316]">{pendingInvoicesCount}</strong> facturas pendientes
          </span>
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
          className="rounded-[16px] border border-[#edf1f7] bg-white px-3 py-2 shadow-none"
        >
          <div className="flex items-center gap-2">
            <SearchFilters
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar clientes, contactos, industria..."
              filters={[]}
              className="flex-1"
            />
          </div>
        </section>

        <DataCard
          data-demo="clients-list-panel"
          className="overflow-hidden border-[#edf1f7] shadow-none"
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
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[230px] pl-4">Empresa</TableHead>
                    <TableHead className="w-[220px]">Contacto principal</TableHead>
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
                          <p className="font-semibold text-[#101828]">{client.company_name}</p>
                          <p className="text-xs text-[#667085]">
                            {client.industry || "Sin industria"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-0.5">
                          <p className="font-medium text-[#344054]">
                            {client.primaryContact
                              ? getContactName(client.primaryContact)
                              : client.contact_person || "—"}
                          </p>
                          <p className="text-xs text-[#667085]">
                            {client.primaryContact?.position ||
                              client.primaryContact?.department ||
                              client.email ||
                              client.phone ||
                              "Sin detalle"}
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
                        <p className="text-sm font-medium text-[#344054]">
                          {client.accountManagerName}
                        </p>
                      </TableCell>
                      <TableCell className="hidden py-2 xl:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#101828]">
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
                          <p className="text-sm font-semibold text-[#101828]">
                            {client.activeProjects.length}
                          </p>
                          <p className="text-xs text-[#667085]">activos</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-2 xl:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#101828]">
                            {client.openTasks.length}
                          </p>
                          <p className="text-xs text-[#667085]">
                            {client.overdueTasks.length} vencidas
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-2 xl:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#101828]">
                            {clientFinanceLabel(client)}
                          </p>
                          <p className="text-xs text-[#667085]">
                            {money(client.pendingInvoiceAmount)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-2 2xl:table-cell">
                        <p className="text-sm font-medium text-[#344054]">
                          {relativeLabel(client.latestActivityAt)}
                        </p>
                      </TableCell>
                      <TableCell className="py-2 pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#667085]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
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
          )}
        </DataCard>
      </div>

      <Sheet
        open={!!selectedClient}
        onOpenChange={(open) => {
          if (!open) setSelectedClientId(null);
        }}
      >
        <SheetContent data-demo="client-360-panel" side="right" className="w-full p-0 sm:max-w-3xl">
          {selectedClient && (
            <div className="flex h-full flex-col">
              <SheetHeader className="relative border-b border-slate-200 px-4 py-3 text-left">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[84px] bg-gradient-to-b from-violet-600/20 via-violet-500/10 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-white/80 shadow-[0_12px_24px_rgba(15,23,42,.06)] dark:bg-background/70">
                      <Building2 className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-[18px] font-semibold tracking-[-0.02em] text-[#101828] truncate">
                        {selectedClient.company_name}
                      </SheetTitle>
                      <SheetDescription className="mt-0.5 text-[13px] text-[#667085] truncate">
                        {selectedClient.primaryContact
                          ? getContactName(selectedClient.primaryContact)
                          : selectedClient.contact_person || "Sin contacto principal"}{" "}
                        · {selectedClient.contacts.length} contacto
                        {selectedClient.contacts.length === 1 ? "" : "s"}
                      </SheetDescription>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedClient.status} />
                        <HealthBadge health={selectedClient.health} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="h-8 gap-2 bg-[#1d62f9] hover:bg-[#0f52dd]"
                    data-demo="client-360-create-task"
                    onClick={() => openCreateTaskForClient(selectedClient)}
                    disabled={!canCreateTaskForClient(selectedClient)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Crear tarea
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2"
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
                    <Mail className="h-3.5 w-3.5" />
                    Contactar
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 gap-2">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        Más
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => openEditClient(selectedClient)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar cliente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openContactCreator(selectedClient.id)}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Añadir contacto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setQuickProposalOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Crear propuesta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/invoices" })}>
                        <Receipt className="mr-2 h-4 w-4" />
                        Ir a facturas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/tasks" })}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ir a tareas
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate({
                            to: "/proposals",
                            search: {
                              leadId: undefined,
                              dealId: undefined,
                              conversationId: undefined,
                              productId: undefined,
                              clientId: selectedClient.id,
                            },
                          })
                        }
                      >
                        <BriefcaseBusiness className="mr-2 h-4 w-4" />
                        Ir a propuestas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleDeactivateClient(selectedClient)}>
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
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-86px)]">
                <div className="space-y-3 px-4 py-3">
                  <Tabs defaultValue="overview" className="w-full space-y-3">
                    <TabsList
                      data-demo="client-360-tabs"
                      className="grid h-auto w-full grid-cols-5 rounded-[12px] bg-slate-100 p-1"
                    >
                      <TabsTrigger data-demo="client-360-tab-summary" value="overview">
                        Resumen
                      </TabsTrigger>
                      <TabsTrigger data-demo="client-360-tab-contacts" value="contacts">
                        Contactos
                      </TabsTrigger>
                      <TabsTrigger data-demo="client-360-tab-projects" value="projects">
                        Proyectos
                      </TabsTrigger>
                      <TabsTrigger data-demo="client-360-tab-finance" value="finance">
                        Finanzas
                      </TabsTrigger>
                      <TabsTrigger data-demo="client-360-tab-activity" value="activity">
                        Actividad
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="overview"
                      className="space-y-3 data-[state=inactive]:hidden"
                    >
                      <div
                        data-demo="client-360-summary-strip"
                        className="rounded-[16px] border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-slate-600">
                          <span>
                            <strong className="text-slate-950">
                              {selectedClient.contacts.length}
                            </strong>{" "}
                            contactos
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            <strong className="text-amber-600">
                              {selectedClient.activeProjects.length}
                            </strong>{" "}
                            proyectos
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            <strong className="text-rose-600">
                              {selectedClient.openTasks.length}
                            </strong>{" "}
                            tareas
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            <strong className="text-orange-600">
                              {selectedClient.pendingInvoices.length}
                            </strong>{" "}
                            facturas
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            <strong className="text-emerald-600">
                              {money(selectedClient.openPipelineValue)}
                            </strong>{" "}
                            embudo
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Salud de la cuenta
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
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

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                          <h3 className="text-sm font-bold text-slate-900">Datos del cliente</h3>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                              <div
                                key={label as string}
                                className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  {label}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                          <h3 className="text-sm font-bold text-slate-900">Notas y etiquetas</h3>
                          <div className="mt-4 space-y-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Notas
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                                {selectedClient.notes || "Sin notas registradas todavía."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div
                          data-demo="client-360-products"
                          className="rounded-[18px] border border-slate-200 bg-white p-4"
                        >
                          <h3 className="text-sm font-bold text-slate-900">Productos comprados</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Productos vinculados a esta cuenta.
                          </p>
                          {selectedClient.purchasedProducts.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              Sin productos comprados registrados.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-2">
                              {selectedClient.purchasedProducts.slice(0, 8).map((row) => (
                                <div
                                  key={row.clientProduct.id}
                                  className="flex items-start justify-between gap-3 rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {row.product?.name || row.clientProduct.product_id}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-600">
                                      {[row.product?.category, row.clientProduct.status]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-semibold text-slate-500">Inicio</p>
                                    <p className="text-sm font-semibold text-slate-900">
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

                        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Próximo paso</h3>
                              <p className="mt-1 text-sm text-slate-600">
                                Tarea pendiente más cercana por fecha de vencimiento.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                openCreateTaskForClient(selectedClient);
                              }}
                              disabled={!canCreateTaskForClient(selectedClient)}
                            >
                              <Plus className="h-4 w-4" />
                              Crear tarea
                            </Button>
                          </div>

                          {!selectedClient.nextOpenTask ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay tareas pendientes con fecha.
                            </p>
                          ) : (
                            <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedClient.nextOpenTask.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {selectedClient.nextOpenTask.due_date
                                  ? `Vence ${selectedClient.nextOpenTask.due_date}`
                                  : "Sin fecha"}{" "}
                                · {selectedClient.nextOpenTask.priority}
                              </p>
                            </div>
                          )}

                          <Separator className="my-4" />

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div
                              data-demo="client-360-tasks"
                              className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Tareas pendientes
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {selectedClient.openTasks.length}
                              </p>
                            </div>
                            <div className="rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Tareas vencidas
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {selectedClient.overdueTasks.length}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div
                          data-demo="client-360-deals"
                          className="rounded-[18px] border border-slate-200 bg-white p-4"
                        >
                          <h3 className="text-sm font-bold text-slate-900">Oportunidades</h3>
                          {selectedClient.openDeals.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay oportunidades abiertas.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-2">
                              {selectedClient.openDeals.slice(0, 6).map((deal) => (
                                <div
                                  key={deal.id}
                                  className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-slate-900">
                                    {deal.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {deal.stage} · {money(deal.value)}{" "}
                                    {deal.expected_close ? `· Cierre ${deal.expected_close}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          data-demo="client-360-proposals"
                          className="rounded-[18px] border border-slate-200 bg-white p-4"
                        >
                          <h3 className="text-sm font-bold text-slate-900">Propuestas</h3>
                          {selectedClient.proposals.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">
                              No hay propuestas vinculadas.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-2">
                              {selectedClient.proposals.slice(0, 6).map((proposal) => (
                                <div
                                  key={proposal.id}
                                  className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-slate-900">
                                    {proposal.number} · {proposal.title}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {proposal.status} · {money(proposal.amount)}{" "}
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
                      data-demo="client-360-contacts-section"
                      value="contacts"
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Contactos</h3>
                          <p className="text-sm text-slate-600">
                            Gestiona los contactos activos de esta cuenta.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openContactCreator(selectedClient.id)}
                          className="gap-2"
                        >
                          <MessageSquarePlus className="h-4 w-4" />
                          Añadir contacto
                        </Button>
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
                        <div className="space-y-3">
                          {selectedClient.contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-base font-bold text-slate-900">
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
                                  <p className="mt-1 text-sm text-slate-600">
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

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <Mail className="h-3.5 w-3.5" />
                                    Correo electrónico
                                  </p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {contact.email || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <Phone className="h-3.5 w-3.5" />
                                    Teléfono
                                  </p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {contact.phone || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <Globe className="h-3.5 w-3.5" />
                                    WhatsApp
                                  </p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {contact.whatsapp || "—"}
                                  </p>
                                </div>
                                <div className="space-y-1 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Etiquetas
                                  </p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {(contact.tags || []).length ? contact.tags!.join(", ") : "—"}
                                  </p>
                                </div>
                              </div>

                              {contact.notes && (
                                <div className="mt-3 rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Notas
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
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
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Proyectos</h3>
                        <p className="text-sm text-slate-600">
                          Estado de los proyectos activos y en riesgo.
                        </p>
                      </div>
                      {selectedClient.projects.length === 0 ? (
                        <EmptyState
                          icon={<FolderKanban className="h-6 w-6" />}
                          title="No hay proyectos vinculados"
                          description="Cuando existan proyectos, aparecerán aquí con su progreso y estado."
                          actionLabel="Ir a proyectos"
                          onAction={() => navigate({ to: "/projects" })}
                        />
                      ) : (
                        <div className="space-y-3">
                          {selectedClient.projects.map((project) => (
                            <div
                              key={project.id}
                              className="rounded-[18px] border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className="text-base font-bold text-slate-900">
                                    {project.name}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600">
                                    Vence {formatDate(project.due_date)}
                                  </p>
                                </div>
                                <StatusBadge status={project.status} />
                              </div>
                              <div className="mt-4 h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-blue-500 transition-all"
                                  style={{
                                    width: `${Math.max(0, Math.min(Number(project.progress || 0), 100))}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                                <span>Progreso</span>
                                <span className="font-semibold text-slate-900">
                                  {Math.max(0, Math.min(Number(project.progress || 0), 100))}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      data-demo="client-360-finance"
                      value="finance"
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <MetricCard
                          label="Pendientes"
                          value={selectedClient.pendingInvoices.length}
                          icon={CircleDollarSign}
                          tone="bg-[#fff3e8] text-[#f97316]"
                          meta={money(selectedClient.pendingInvoiceAmount)}
                        />
                        <MetricCard
                          label="Vencidas"
                          value={selectedClient.overdueInvoices.length}
                          icon={ShieldAlert}
                          tone="bg-[#fef2f2] text-[#ef4444]"
                          meta="Cobro urgente"
                        />
                        <MetricCard
                          label="Propuestas"
                          value={selectedClient.pendingProposals.length}
                          icon={FileText}
                          tone="bg-[#f3ecff] text-[#7c3aed]"
                          meta="Enviado / visto"
                        />
                        <MetricCard
                          label="Embudo"
                          value={selectedClient.openDeals.length}
                          icon={BriefcaseBusiness}
                          tone="bg-[#ecfdf3] text-[#16a34a]"
                          meta={money(selectedClient.openPipelineValue)}
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div
                          data-demo="client-360-invoices"
                          className="rounded-[18px] border border-slate-200 bg-white p-4"
                        >
                          <h3 className="text-sm font-bold text-slate-900">Facturas</h3>
                          <div className="mt-4 space-y-3">
                            {selectedClient.invoices.length === 0 ? (
                              <p className="text-sm text-slate-500">No hay facturas registradas.</p>
                            ) : (
                              selectedClient.invoices.slice(0, 5).map((invoice) => (
                                <div
                                  key={invoice.id}
                                  className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        Factura {invoice.number}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Vence {formatDate(invoice.due_date)}
                                      </p>
                                    </div>
                                    <StatusBadge status={invoice.status} />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="text-slate-600">{money(invoice.total)}</span>
                                    <span className="text-slate-500">
                                      {formatDateTime(invoice.updated_at)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                          <h3 className="text-sm font-bold text-slate-900">Propuestas y embudo</h3>
                          <div className="mt-4 space-y-3">
                            {selectedClient.pendingProposals.length === 0 &&
                            selectedClient.openDeals.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No hay propuestas ni oportunidades abiertas.
                              </p>
                            ) : (
                              <>
                                {selectedClient.pendingProposals.slice(0, 4).map((proposal) => (
                                  <div
                                    key={proposal.id}
                                    className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {proposal.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Propuesta {proposal.number}
                                        </p>
                                      </div>
                                      <StatusBadge status={proposal.status} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                      <span className="text-slate-600">
                                        {money(proposal.amount)}
                                      </span>
                                      <span className="text-slate-500">
                                        {formatDateTime(proposal.updated_at)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {selectedClient.openDeals.slice(0, 4).map((deal) => (
                                  <div
                                    key={deal.id}
                                    className="rounded-[14px] border border-slate-100 bg-slate-50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {deal.name}
                                        </p>
                                        <p className="text-xs text-slate-500">Etapa {deal.stage}</p>
                                      </div>
                                      <Badge
                                        variant="secondary"
                                        className="rounded-full bg-emerald-50 text-emerald-700"
                                      >
                                        {deal.probability || 0}%
                                      </Badge>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                      <span className="text-slate-600">{money(deal.value)}</span>
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

                    <TabsContent
                      data-demo="client-360-activity"
                      value="activity"
                      className="space-y-4"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Actividad reciente</h3>
                        <p className="text-sm text-slate-600">
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
                        <div className="space-y-3">
                          {activityFeed.map((item) => {
                            const Icon = item.icon;
                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-white p-4"
                              >
                                <div
                                  className={cnJoin(
                                    "grid h-10 w-10 shrink-0 place-items-center rounded-[14px]",
                                    item.tone,
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-slate-900">{item.title}</p>
                                      <p className="text-sm text-slate-600">{item.description}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">
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
                  </Tabs>
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      <QuickCreateDialog
        type="task"
        open={quickTaskOpen}
        onOpenChange={setQuickTaskOpen}
        context={
          selectedClient
            ? {
                sourceType: "client",
                sourceId: selectedClient.id,
                prefill: {
                  title: `Dar seguimiento a ${selectedClient.company_name}`,
                  description: `Seguimiento creado desde Cliente 360.\nCliente: ${selectedClient.company_name}`,
                  related_client_id: selectedClient.id,
                  assigned_to:
                    selectedClient.account_manager &&
                    managerUserIdByProfileId.get(selectedClient.account_manager)
                      ? managerUserIdByProfileId.get(selectedClient.account_manager)
                      : profile?.user_id || user?.id || null,
                },
              }
            : undefined
        }
        onCreated={() => {
          void fetchTasks();
          toast.success("Tarea vinculada al cliente.");
        }}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetClientDialog();
        }}
      >
        <DialogContent className="h-[92vh] max-w-3xl overflow-hidden p-0">
          <div className="flex h-full min-h-0 flex-col gap-4 p-6">
            <DialogHeader>
              <DialogTitle>{editClient ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
              <DialogDescription>
                Completa los datos principales para registrar la cuenta y sus contactos clave.
              </DialogDescription>
            </DialogHeader>

            <form
              key={editClient?.id || "new-client"}
              onSubmit={handleClientSubmit}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre de la empresa</Label>
                  <Input
                    name="company_name"
                    defaultValue={editClient?.company_name || ""}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contacto principal rápido</Label>
                  <Input
                    name="contact_person"
                    defaultValue={editClient?.contact_person || ""}
                    placeholder="Referencia rápida"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo electrónico</Label>
                  <Input name="email" type="email" defaultValue={editClient?.email || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input name="phone" defaultValue={editClient?.phone || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" defaultValue={editClient?.whatsapp || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Industria</Label>
                  <Input name="industry" defaultValue={editClient?.industry || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsable</Label>
                  <Select
                    name="account_manager"
                    defaultValue={editClient?.account_manager || undefined}
                  >
                    <SelectTrigger>
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
                  <Label>Estado</Label>
                  <Select name="status" defaultValue={editClient?.status || "Active"}>
                    <SelectTrigger>
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
                  <Label>Sitio web</Label>
                  <Input name="website" defaultValue={editClient?.website || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>ID fiscal</Label>
                  <Input name="tax_id" defaultValue={editClient?.tax_id || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad</Label>
                  <Input name="city" defaultValue={editClient?.city || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Input name="country" defaultValue={editClient?.country || ""} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Dirección</Label>
                  <Input name="address" defaultValue={editClient?.address || ""} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Etiquetas</Label>
                  <Input
                    name="tags"
                    defaultValue={(editClient?.tags || []).join(", ")}
                    placeholder="vip, recurrente, saludable"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea name="notes" defaultValue={editClient?.notes || ""} rows={4} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetClientDialog}>
                  Cancelar
                </Button>
                <Button type="submit">{editClient ? "Guardar cambios" : "Crear cliente"}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contactDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetContactDialog();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editContact ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
            <DialogDescription>
              {selectedClient?.company_name || "Selecciona un cliente"} · Completa la información
              del contacto operativo.
            </DialogDescription>
          </DialogHeader>

          <form
            key={editContact?.id || "new-contact"}
            onSubmit={handleContactSubmit}
            className="space-y-4 overflow-y-auto pr-1"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input name="first_name" defaultValue={editContact?.first_name || ""} required />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido</Label>
                <Input name="last_name" defaultValue={editContact?.last_name || ""} required />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input name="position" defaultValue={editContact?.position || ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Input name="department" defaultValue={editContact?.department || ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input name="email" type="email" defaultValue={editContact?.email || ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input name="phone" defaultValue={editContact?.phone || ""} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input name="whatsapp" defaultValue={editContact?.whatsapp || ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Etiquetas</Label>
                <Input
                  name="tags"
                  defaultValue={(editContact?.tags || []).join(", ")}
                  placeholder="principal, finanzas"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Notas</Label>
                <Textarea name="notes" defaultValue={editContact?.notes || ""} rows={4} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Contacto primario</p>
                <p className="text-sm text-slate-600">
                  Marca este contacto como el principal para la cuenta.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={contactIsPrimary}
                  onCheckedChange={(checked) => setContactIsPrimary(Boolean(checked))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetContactDialog}>
                Cancelar
              </Button>
              <Button type="submit">{editContact ? "Guardar contacto" : "Crear contacto"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
