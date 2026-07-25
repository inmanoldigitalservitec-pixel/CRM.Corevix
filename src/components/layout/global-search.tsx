import {
  BriefcaseBusiness,
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Tag,
  Target,
  Ticket,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuickCreateDialog, type QuickCreateType } from "@/components/crm/quick-create-dialog";
import { openGlobalTaskCreate } from "@/components/tasks/global-task-create-host";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currency";

type SearchGroup =
  | "clients"
  | "leads"
  | "tasks"
  | "projects"
  | "tickets"
  | "invoices"
  | "proposals"
  | "estimates"
  | "calendar"
  | "email"
  | "conversations";

type GlobalSearchItem = {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
  searchText: string;
  updatedAt?: string | null;
};

type QuickAction = {
  type: QuickCreateType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const GROUP_META: Record<
  SearchGroup,
  { label: string; icon: ComponentType<{ className?: string }>; tone: string }
> = {
  clients: { label: "Clientes", icon: Building2, tone: "bg-blue-50 text-blue-700" },
  leads: { label: "Leads", icon: Target, tone: "bg-emerald-50 text-emerald-700" },
  tasks: { label: "Tareas", icon: CheckSquare, tone: "bg-violet-50 text-violet-700" },
  projects: { label: "Proyectos", icon: BriefcaseBusiness, tone: "bg-cyan-50 text-cyan-700" },
  tickets: { label: "Tickets", icon: Ticket, tone: "bg-rose-50 text-rose-700" },
  invoices: { label: "Facturas", icon: Receipt, tone: "bg-amber-50 text-amber-700" },
  proposals: { label: "Propuestas", icon: FileText, tone: "bg-indigo-50 text-indigo-700" },
  estimates: { label: "Cotizaciones", icon: CircleDollarSign, tone: "bg-teal-50 text-teal-700" },
  calendar: { label: "Calendario", icon: CalendarDays, tone: "bg-sky-50 text-sky-700" },
  email: { label: "Email", icon: Mail, tone: "bg-red-50 text-red-700" },
  conversations: {
    label: "Conversaciones",
    icon: MessageCircle,
    tone: "bg-lime-50 text-lime-700",
  },
};

const GROUP_ORDER: SearchGroup[] = [
  "clients",
  "leads",
  "tasks",
  "projects",
  "tickets",
  "invoices",
  "proposals",
  "estimates",
  "calendar",
  "email",
  "conversations",
];

const DIRECT_DETAIL_GROUPS = new Set<SearchGroup>([
  "clients",
  "leads",
  "tasks",
  "projects",
  "tickets",
  "invoices",
  "proposals",
  "estimates",
  "calendar",
  "email",
  "conversations",
]);

const QUICK_ACTIONS: QuickAction[] = [
  {
    type: "client",
    label: "Crear cliente",
    description: "Nueva cuenta en el CRM",
    icon: Building2,
  },
  {
    type: "lead",
    label: "Crear lead",
    description: "Nuevo prospecto rápido",
    icon: Target,
  },
  {
    type: "task",
    label: "Crear tarea",
    description: "Seguimiento o pendiente",
    icon: CheckSquare,
  },
  {
    type: "proposal",
    label: "Crear propuesta",
    description: "Borrador comercial",
    icon: FileText,
  },
];

function cleanQuery(value: string) {
  return value
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function searchPattern(value: string) {
  return `%${cleanQuery(value)}%`;
}

function buildOr(fields: string[], value: string) {
  const pattern = searchPattern(value);
  return fields.map((field) => `${field}.ilike.${pattern}`).join(",");
}

function joinParts(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" · ");
}

function formatMoney(value: unknown, currency?: string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return formatCurrencyAmount(amount, currency || "USD");
}

function itemKey(item: GlobalSearchItem) {
  return `${item.group}:${item.id}`;
}

function normalizeForScore(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function recentScore(value?: string | null) {
  const time = Date.parse(String(value || ""));
  if (!Number.isFinite(time)) return 0;
  const days = Math.max(0, (Date.now() - time) / 86400000);
  if (days <= 1) return 30;
  if (days <= 7) return 20;
  if (days <= 30) return 10;
  return 0;
}

function scoreSearchItem(item: GlobalSearchItem, query: string) {
  const q = normalizeForScore(query);
  const title = normalizeForScore(item.title);
  const subtitle = normalizeForScore(item.subtitle);
  const meta = normalizeForScore(item.meta);
  const all = normalizeForScore(
    item.searchText || `${item.title} ${item.subtitle} ${item.meta || ""}`,
  );

  let score = 0;
  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 700;
  else if (title.includes(q)) score += 500;

  if (subtitle === q) score += 320;
  else if (subtitle.startsWith(q)) score += 240;
  else if (subtitle.includes(q)) score += 160;

  if (meta === q) score += 140;
  else if (meta.includes(q)) score += 80;

  if (all.includes(q)) score += 60;
  score += recentScore(item.updatedAt);
  return score;
}

function sortSearchItems(items: GlobalSearchItem[], query: string) {
  return [...items].sort((a, b) => {
    const diff = scoreSearchItem(b, query) - scoreSearchItem(a, query);
    if (diff !== 0) return diff;
    return GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
  });
}

function dateMeta(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-DO", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function looksLikeEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

function isTaskIntent(value: string) {
  return /\b(llamar|tarea|recordar|seguimiento|hacer|pendiente)\b/i.test(value);
}

function isProposalIntent(value: string) {
  return /\b(propuesta|cotizacion|cotización|presupuesto)\b/i.test(value);
}

function sectionSearchPlaceholder(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const labels: Array<[string, string]> = [
    ["/dashboard", "dashboard"],
    ["/clients", "clientes"],
    ["/leads", "prospectos"],
    ["/pipeline", "pipeline"],
    ["/projects", "proyectos"],
    ["/tickets", "tickets"],
    ["/contracts", "contratos"],
    ["/invoices", "facturas"],
    ["/proposals", "propuestas"],
    ["/estimates", "cotizaciones"],
    ["/credit-notes", "notas de credito"],
    ["/payments", "pagos"],
    ["/expenses", "gastos"],
    ["/subscriptions", "suscripciones"],
    ["/products", "productos"],
    ["/calendar", "calendario"],
    ["/tasks", "tareas"],
    ["/reports", "reportes"],
    ["/team", "equipo"],
    ["/email", "Gmail"],
    ["/whatsapp-web", "WhatsApp Web"],
    ["/whatsapp", "WhatsApp"],
    ["/ai-assistant", "asistente IA"],
    ["/settings", "configuracion"],
  ];
  const match = labels.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? `Buscar en ${match[1]}...` : "Buscar en todo el CRM...";
}

function quickActionCopy(action: QuickAction, query: string) {
  if (!query) return { label: action.label, description: action.description };

  if (action.type === "task") {
    return {
      label: isTaskIntent(query) ? "Crear tarea de seguimiento" : `Crear tarea: ${query}`,
      description: "Guardar este pendiente y abrirlo rápido",
    };
  }

  if (action.type === "proposal") {
    return {
      label: isProposalIntent(query) ? "Crear propuesta con esta búsqueda" : "Crear propuesta",
      description: query ? `Usar "${query}" como punto de partida` : action.description,
    };
  }

  if (action.type === "lead") {
    return {
      label: looksLikeEmail(query)
        ? "Crear lead con este email"
        : looksLikePhone(query)
          ? "Crear lead con este teléfono"
          : `Crear lead: ${query}`,
      description: "Nuevo prospecto desde la búsqueda",
    };
  }

  return {
    label: looksLikePhone(query) ? "Crear cliente con este teléfono" : `Crear cliente: ${query}`,
    description: "Nueva cuenta usando esta búsqueda",
  };
}

type GlobalSearchProps = {
  launcherOnly?: boolean;
};

export function GlobalSearch({ launcherOnly = false }: GlobalSearchProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GlobalSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [koreMode, setKoreMode] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<QuickCreateType | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      window.setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 0);
    };
    const handleClose = () => {
      setOpen(false);
      setKoreMode(false);
    };
    window.addEventListener("corevix:open-global-search", handleOpen);
    window.addEventListener("corevix:close-global-search", handleClose);
    return () => {
      window.removeEventListener("corevix:open-global-search", handleOpen);
      window.removeEventListener("corevix:close-global-search", handleClose);
    };
  }, []);

  useEffect(() => {
    const handleQuickCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: QuickCreateType }>).detail;
      if (!detail?.type) return;
      setOpen(false);
      setKoreMode(false);
      setQuery("");
      setItems([]);
      if (detail.type === "task") {
        openGlobalTaskCreate({
          initialValues: {
            title: "",
            description: "",
          },
        });
        return;
      }
      setQuickCreateType(detail.type);
    };

    window.addEventListener("corevix:open-quick-create", handleQuickCreate);
    return () => window.removeEventListener("corevix:open-quick-create", handleQuickCreate);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("corevix:global-search-state", { detail: { open } }));
  }, [open]);

  useEffect(() => {
    if (open) {
      setPanelMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setPanelMounted(false), 260);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const normalizedQuery = cleanQuery(query);
  const searchPlaceholder = koreMode
    ? "Preguntale a Kore..."
    : sectionSearchPlaceholder(location.pathname);
  const visibleItems = useMemo(() => items, [items]);
  const groupedItems = useMemo(() => {
    const groups: Array<{ group: SearchGroup; items: GlobalSearchItem[] }> = [];
    for (const item of visibleItems) {
      let entry = groups.find((candidate) => candidate.group === item.group);
      if (!entry) {
        entry = { group: item.group, items: [] };
        groups.push(entry);
      }
      entry.items.push(item);
    }
    return groups;
  }, [visibleItems]);

  const contextualQuickActions = useMemo(() => {
    const q = normalizedQuery;
    if (!q) return QUICK_ACTIONS;
    if (isProposalIntent(q)) {
      return [
        QUICK_ACTIONS.find((action) => action.type === "proposal")!,
        QUICK_ACTIONS.find((action) => action.type === "task")!,
        QUICK_ACTIONS.find((action) => action.type === "client")!,
        QUICK_ACTIONS.find((action) => action.type === "lead")!,
      ];
    }
    if (isTaskIntent(q)) {
      return [
        QUICK_ACTIONS.find((action) => action.type === "task")!,
        QUICK_ACTIONS.find((action) => action.type === "lead")!,
        QUICK_ACTIONS.find((action) => action.type === "client")!,
        QUICK_ACTIONS.find((action) => action.type === "proposal")!,
      ];
    }
    if (looksLikeEmail(q) || looksLikePhone(q)) {
      return [
        QUICK_ACTIONS.find((action) => action.type === "lead")!,
        QUICK_ACTIONS.find((action) => action.type === "client")!,
        QUICK_ACTIONS.find((action) => action.type === "task")!,
        QUICK_ACTIONS.find((action) => action.type === "proposal")!,
      ];
    }
    return QUICK_ACTIONS;
  }, [normalizedQuery]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setKoreMode(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    window.setTimeout(() => mobileInputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    const companyId = profile?.company_id;
    const requestId = ++requestIdRef.current;

    if (koreMode || !companyId || normalizedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      const db = supabase as any;
      const limit = 5;
      const safeData = async <T,>(promise: PromiseLike<{ data: T[] | null; error: unknown }>) => {
        const { data, error } = await promise;
        if (error) return [] as T[];
        return data || [];
      };

      const [
        clients,
        leads,
        tasks,
        projects,
        tickets,
        invoices,
        proposals,
        estimates,
        calendarEvents,
        emailConversations,
        whatsappConversations,
      ] = await Promise.all([
        safeData<any>(
          db
            .from("clients")
            .select("id,company_name,contact_person,email,phone,status,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["company_name", "contact_person", "email", "phone"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("leads")
            .select("id,first_name,last_name,company_name,email,phone,status,updated_at")
            .eq("company_id", companyId)
            .or(
              buildOr(
                ["first_name", "last_name", "company_name", "email", "phone"],
                normalizedQuery,
              ),
            )
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("tasks")
            .select("id,title,description,status,priority,due_date,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["title", "description", "status", "priority"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("projects")
            .select("id,name,description,status,priority,due_date,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["name", "description", "status", "priority"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("tickets")
            .select("id,ticket_number,subject,description,status,priority,service,updated_at")
            .eq("company_id", companyId)
            .or(
              buildOr(["subject", "description", "status", "priority", "service"], normalizedQuery),
            )
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("invoices")
            .select("id,number,status,total,currency,invoice_data,due_date,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["number", "status", "notes"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("proposals")
            .select("id,number,title,status,amount,currency,valid_until,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["number", "title", "description", "status"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("estimates")
            .select("id,number,title,status,total,currency,expiry_date,updated_at")
            .eq("company_id", companyId)
            .or(buildOr(["title", "status", "notes"], normalizedQuery))
            .order("updated_at", { ascending: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("calendar_events")
            .select("id,title,description,location,type,status,start_at,end_at")
            .eq("company_id", companyId)
            .or(buildOr(["title", "description", "location", "type", "status"], normalizedQuery))
            .order("start_at", { ascending: true })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("email_conversations")
            .select("id,subject,snippet,from_email,to_email,status,last_message_at,updated_at")
            .eq("company_id", companyId)
            .or(
              buildOr(["subject", "snippet", "from_email", "to_email", "status"], normalizedQuery),
            )
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(limit),
        ),
        safeData<any>(
          db
            .from("crm_whatsapp_conversation_list")
            .select(
              "conversation_id,display_name,contact_name,lead_name,business_name,phone,last_message,conversation_status,last_message_at,channel,selected_service",
            )
            .eq("company_id", companyId)
            .or(
              buildOr(
                [
                  "display_name",
                  "contact_name",
                  "lead_name",
                  "business_name",
                  "phone",
                  "last_message",
                  "selected_service",
                ],
                normalizedQuery,
              ),
            )
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(limit),
        ),
      ]);

      if (requestId !== requestIdRef.current) return;

      const nextItems: GlobalSearchItem[] = [
        ...clients.map((client: any) => ({
          id: client.id,
          group: "clients" as const,
          title: client.company_name || "Cliente sin nombre",
          subtitle: joinParts([client.contact_person, client.email, client.phone]) || "Cliente",
          meta: client.status,
          href: `/clients?clientId=${encodeURIComponent(client.id)}`,
          searchText: joinParts([
            client.company_name,
            client.contact_person,
            client.email,
            client.phone,
            client.status,
          ]),
          updatedAt: client.updated_at,
        })),
        ...leads.map((lead: any) => ({
          id: lead.id,
          group: "leads" as const,
          title:
            joinParts([lead.first_name, lead.last_name]) || lead.company_name || "Lead sin nombre",
          subtitle: joinParts([lead.company_name, lead.email, lead.phone]) || "Lead",
          meta: lead.status,
          href: `/leads?leadId=${encodeURIComponent(lead.id)}`,
          searchText: joinParts([
            lead.first_name,
            lead.last_name,
            lead.company_name,
            lead.email,
            lead.phone,
            lead.status,
          ]),
          updatedAt: lead.updated_at,
        })),
        ...tasks.map((task: any) => ({
          id: task.id,
          group: "tasks" as const,
          title: task.title || "Tarea sin titulo",
          subtitle: joinParts([
            task.status,
            task.priority,
            task.due_date ? `vence ${task.due_date}` : null,
          ]),
          meta: "Tarea",
          href: `/tasks?taskId=${encodeURIComponent(task.id)}`,
          searchText: joinParts([task.title, task.description, task.status, task.priority]),
          updatedAt: task.updated_at,
        })),
        ...projects.map((project: any) => ({
          id: project.id,
          group: "projects" as const,
          title: project.name || "Proyecto sin nombre",
          subtitle: joinParts([
            project.status,
            project.priority,
            project.due_date ? `vence ${project.due_date}` : null,
          ]),
          meta: "Proyecto",
          href: `/projects?projectId=${encodeURIComponent(project.id)}`,
          searchText: joinParts([
            project.name,
            project.description,
            project.status,
            project.priority,
          ]),
          updatedAt: project.updated_at,
        })),
        ...tickets.map((ticket: any) => ({
          id: ticket.id,
          group: "tickets" as const,
          title: ticket.subject || "Ticket sin asunto",
          subtitle: joinParts([
            ticket.ticket_number ? `#${ticket.ticket_number}` : null,
            ticket.status,
            ticket.priority,
            ticket.service,
          ]),
          meta: "Soporte",
          href: `/tickets?ticketId=${encodeURIComponent(ticket.id)}`,
          searchText: joinParts([
            ticket.ticket_number,
            ticket.subject,
            ticket.description,
            ticket.status,
            ticket.priority,
            ticket.service,
          ]),
          updatedAt: ticket.updated_at,
        })),
        ...invoices.map((invoice: any) => ({
          id: invoice.id,
          group: "invoices" as const,
          title: invoice.number ? `Factura ${invoice.number}` : "Factura",
          subtitle: joinParts([
            invoice.status,
            formatMoney(invoice.total, invoice.currency || invoice.invoice_data?.currency),
            invoice.due_date ? `vence ${invoice.due_date}` : null,
          ]),
          meta: "Factura",
          href: `/invoices?invoiceId=${encodeURIComponent(invoice.id)}`,
          searchText: joinParts([invoice.number, invoice.status, invoice.total, invoice.due_date]),
          updatedAt: invoice.updated_at,
        })),
        ...proposals.map((proposal: any) => ({
          id: proposal.id,
          group: "proposals" as const,
          title: proposal.title || (proposal.number ? `Propuesta ${proposal.number}` : "Propuesta"),
          subtitle: joinParts([
            proposal.number,
            proposal.status,
            formatMoney(proposal.amount, proposal.currency),
          ]),
          meta: "Propuesta",
          href: `/proposals?proposalId=${encodeURIComponent(proposal.id)}`,
          searchText: joinParts([
            proposal.number,
            proposal.title,
            proposal.status,
            proposal.amount,
            proposal.valid_until,
          ]),
          updatedAt: proposal.updated_at,
        })),
        ...estimates.map((estimate: any) => ({
          id: estimate.id,
          group: "estimates" as const,
          title:
            estimate.title || (estimate.number ? `Cotizacion ${estimate.number}` : "Cotizacion"),
          subtitle: joinParts([
            estimate.number,
            estimate.status,
            formatMoney(estimate.total, estimate.currency),
          ]),
          meta: "Cotizacion",
          href: `/estimates?estimateId=${encodeURIComponent(estimate.id)}`,
          searchText: joinParts([
            estimate.number,
            estimate.title,
            estimate.status,
            estimate.total,
            estimate.expiry_date,
          ]),
          updatedAt: estimate.updated_at,
        })),
        ...calendarEvents.map((event: any) => ({
          id: event.id,
          group: "calendar" as const,
          title: event.title || "Evento sin titulo",
          subtitle: joinParts([event.type, event.location, dateMeta(event.start_at)]),
          meta: event.status || "Evento",
          href: `/calendar?eventId=${encodeURIComponent(event.id)}`,
          searchText: joinParts([
            event.title,
            event.description,
            event.location,
            event.type,
            event.status,
          ]),
          updatedAt: event.start_at,
        })),
        ...emailConversations.map((conversation: any) => ({
          id: conversation.id,
          group: "email" as const,
          title: conversation.subject || "Correo sin asunto",
          subtitle: joinParts([
            conversation.from_email,
            conversation.to_email,
            conversation.snippet,
          ]),
          meta: dateMeta(conversation.last_message_at) || conversation.status || "Email",
          href: `/email?conversationId=${encodeURIComponent(conversation.id)}`,
          searchText: joinParts([
            conversation.subject,
            conversation.snippet,
            conversation.from_email,
            conversation.to_email,
            conversation.status,
          ]),
          updatedAt: conversation.last_message_at || conversation.updated_at,
        })),
        ...whatsappConversations
          .filter((conversation: any) => conversation.conversation_id)
          .map((conversation: any) => ({
            id: conversation.conversation_id,
            group: "conversations" as const,
            title:
              conversation.display_name ||
              conversation.contact_name ||
              conversation.lead_name ||
              conversation.business_name ||
              conversation.phone ||
              "Conversacion",
            subtitle: joinParts([
              conversation.channel || "WhatsApp",
              conversation.selected_service,
              conversation.last_message,
            ]),
            meta: dateMeta(conversation.last_message_at) || conversation.conversation_status,
            href: `/whatsapp?conversationId=${encodeURIComponent(conversation.conversation_id)}`,
            searchText: joinParts([
              conversation.display_name,
              conversation.contact_name,
              conversation.lead_name,
              conversation.business_name,
              conversation.phone,
              conversation.last_message,
              conversation.selected_service,
              conversation.conversation_status,
            ]),
            updatedAt: conversation.last_message_at,
          })),
      ];
      setItems(sortSearchItems(nextItems, normalizedQuery));
      setActiveIndex(0);
      setLoading(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [koreMode, normalizedQuery, profile?.company_id]);

  const openItem = (item: GlobalSearchItem) => {
    setOpen(false);
    setKoreMode(false);
    setQuery("");
    setItems([]);
    if (DIRECT_DETAIL_GROUPS.has(item.group)) {
      window.dispatchEvent(
        new CustomEvent("corevix:open-global-detail", {
          detail: {
            group: item.group,
            id: item.id,
            href: item.href,
          },
        }),
      );
      return;
    }
    void navigate({ to: item.href as any });
  };

  const openQuickCreate = (type: QuickCreateType) => {
    setOpen(false);
    setKoreMode(false);
    if (type === "task") {
      openGlobalTaskCreate({
        initialValues: {
          title: normalizedQuery,
          description: "",
        },
      });
      setQuery("");
      setItems([]);
      return;
    }
    setQuickCreateType(type);
  };

  const activateKoreMode = () => {
    setKoreMode((value) => !value);
    setOpen(true);
    setItems([]);
  };

  const submitKoreMessage = () => {
    const message = query.trim();
    if (!message) {
      setKoreMode(true);
      setOpen(true);
      return;
    }

    try {
      window.sessionStorage.setItem("corevix.autopilot.pendingPrompt", message);
      window.sessionStorage.removeItem("corevix.autopilot.pendingCaseKey");
      window.sessionStorage.removeItem("corevix.autopilot.pendingCaseTitle");
    } catch {
      // Si sessionStorage falla, navegamos igual al chat.
    }

    setOpen(false);
    setKoreMode(false);
    setQuery("");
    setItems([]);
    void navigate({ to: "/ai-assistant?source=global_search" as any });
  };

  const quickCreateContext = useMemo(() => {
    const value = normalizedQuery;
    if (!quickCreateType) return undefined;

    if (quickCreateType === "client") {
      return {
        sourceType: "manual" as const,
        prefill: {
          company_name: value,
          contact_person: "",
        },
      };
    }

    if (quickCreateType === "lead") {
      return {
        sourceType: "manual" as const,
        prefill: {
          name: value,
          company_name: value,
        },
      };
    }

    if (quickCreateType === "proposal") {
      return {
        sourceType: "manual" as const,
        prefill: {
          title: value ? `Propuesta - ${value}` : "",
          currency: "USD",
        },
      };
    }

    return {
      sourceType: "manual" as const,
      prefill: {
        title: value,
        description: "",
      },
    };
  }, [normalizedQuery, quickCreateType]);

  const handleQuickCreated = (args: { type: QuickCreateType; record: any }) => {
    const id = String(args.record?.id || "");
    setQuickCreateType(null);
    setQuery("");
    setItems([]);
    if (!id) return;
    const hrefByType: Record<QuickCreateType, string> = {
      client: `/clients?clientId=${encodeURIComponent(id)}`,
      lead: `/leads?leadId=${encodeURIComponent(id)}`,
      task: `/tasks?taskId=${encodeURIComponent(id)}`,
      proposal: `/proposals?proposalId=${encodeURIComponent(id)}`,
    };
    void navigate({ to: hrefByType[args.type] as any });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setKoreMode(false);
      return;
    }
    if (koreMode) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitKoreMessage();
      }
      return;
    }
    if (!visibleItems.length) {
      if (event.key === "Enter" && normalizedQuery.length >= 2) {
        event.preventDefault();
        openQuickCreate(contextualQuickActions[0]?.type || "task");
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleItems.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + visibleItems.length) % visibleItems.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openItem(visibleItems[activeIndex] || visibleItems[0]);
    }
  };

  const showResults = !koreMode && (normalizedQuery.length >= 2 || loading);
  const showPanel = panelMounted;
  const showNoResults = showResults && !loading && visibleItems.length === 0;

  return (
    <>
      <div
        ref={wrapperRef}
        className={
          launcherOnly
            ? "fixed left-0 top-0 z-[60] h-0 w-0 overflow-visible md:hidden"
            : "relative flex-1 min-w-0 max-w-xl"
        }
      >
        <Search
          className={cn(
            "absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400",
            launcherOnly && "hidden",
          )}
        />
        <Input
          data-corevix-global-search-input="true"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={searchPlaceholder}
          className={cn(
            "h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-base shadow-none placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-1 focus-visible:ring-slate-200 sm:text-sm",
            open && showPanel && "sm:rounded-b-none sm:border-b-transparent",
            launcherOnly && "sr-only",
          )}
          role="combobox"
          aria-expanded={open}
          aria-label="Buscar en todo el CRM"
        />

        {showPanel && (
          <div
            className={cn(
              "fixed inset-y-0 left-0 right-0 z-[70] mt-0 w-[100dvw] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:absolute sm:inset-auto sm:left-0 sm:right-auto sm:top-full sm:mt-0 sm:w-full sm:rounded-b-lg sm:rounded-t-none sm:border sm:border-t-0 sm:border-slate-200 sm:shadow-none",
              open
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0 sm:translate-y-0",
            )}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:hidden">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={mobileInputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-9 pr-3 text-base focus-visible:ring-1"
                  role="combobox"
                  aria-expanded={open}
                  aria-label="Buscar en todo el CRM"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Cerrar búsqueda"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="hidden items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 sm:flex">
              <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Busqueda global</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={activateKoreMode}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition",
                    koreMode
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                  )}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Preguntale a Kore
                </button>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
            </div>

            <div className="h-[calc(100dvh-73px)] max-h-none overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:h-auto sm:max-h-[68vh] sm:p-2">
              {koreMode ? null : loading && visibleItems.length === 0 ? (
                <div className="space-y-2 px-1 py-1">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {(!showResults || showNoResults) && (
                <div className="py-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <Plus className="h-3.5 w-3.5" />
                    {showNoResults ? "Crear desde esta búsqueda" : "Acciones rápidas"}
                  </div>
                  {showNoResults ? (
                    <div className="px-2 pb-2">
                      <p className="text-sm font-semibold text-slate-900">
                        No encontré “{normalizedQuery}”
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Usa una acción rápida para crearlo sin salir de esta pantalla.
                      </p>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {contextualQuickActions.map((action, actionIndex) => {
                      const Icon = action.icon;
                      const copy = quickActionCopy(action, normalizedQuery);
                      return (
                        <button
                          key={action.type}
                          type="button"
                          onClick={() => openQuickCreate(action.type)}
                          className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950">
                              {copy.label}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {actionIndex === 0 && normalizedQuery
                                ? "Sugerida para esta búsqueda"
                                : copy.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showResults && !(loading && visibleItems.length === 0) ? (
                !loading && visibleItems.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-slate-400">
                    Enter usa la primera acción sugerida.
                  </div>
                ) : (
                  groupedItems.map((entry) => {
                    const groupMeta = GROUP_META[entry.group];
                    const Icon = groupMeta.icon;
                    return (
                      <div key={entry.group} className="py-1">
                        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <Icon className="h-3.5 w-3.5" />
                          {groupMeta.label}
                        </div>
                        <div className="space-y-1">
                          {entry.items.map((item) => {
                            const flatIndex = visibleItems.findIndex(
                              (candidate) => itemKey(candidate) === itemKey(item),
                            );
                            const isActive = flatIndex === activeIndex;
                            return (
                              <button
                                key={itemKey(item)}
                                type="button"
                                onMouseEnter={() => setActiveIndex(flatIndex)}
                                onClick={() => openItem(item)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                                  isActive ? "bg-slate-100" : "hover:bg-slate-50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                    groupMeta.tone,
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-950">
                                    {item.title}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {item.subtitle || groupMeta.label}
                                  </span>
                                </span>
                                {item.meta && (
                                  <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 sm:inline-flex">
                                    {item.meta}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                <div className="px-4 py-5 text-center text-xs text-slate-500">
                  Escribe para buscar en todo el CRM o usa una acción rápida.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {quickCreateType ? (
        <QuickCreateDialog
          type={quickCreateType}
          open={Boolean(quickCreateType)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setQuickCreateType(null);
          }}
          context={quickCreateContext}
          onCreated={handleQuickCreated}
        />
      ) : null}
    </>
  );
}
