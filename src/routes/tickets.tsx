import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/crm/page-header";
import { LoadingTable } from "@/components/crm/loading-state";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { CrmDetailLineButton, CrmDetailSelectTrigger } from "@/components/crm/crm-detail-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { statusKey, useT } from "@/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  validateSearch: (search: Record<string, unknown>): { projectId?: string; ticketId?: string } => ({
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
    ticketId: typeof search.ticketId === "string" ? search.ticketId : undefined,
  }),
  component: TicketsPage,
  head: () => ({ meta: [{ title: "Tickets de soporte — Corevix CRM" }] }),
});

const STATUSES = ["Open", "In Progress", "Answered", "On Hold", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const NONE = "none";
const ALL = "all";

type TicketRow = {
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
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  author_type: string;
  author_profile_id: string | null;
  contact_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ContactRow = {
  id: string;
  client_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
};
type ProjectRow = { id: string; name: string; client_id: string | null };
type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

type TicketForm = {
  subject: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  service: string;
  client_id: string;
  contact_id: string;
  project_id: string;
  assigned_to: string;
};

function defaultForm(): TicketForm {
  return {
    subject: "",
    description: "",
    status: "Open",
    priority: "Medium",
    department: "Support",
    service: "",
    client_id: NONE,
    contact_id: NONE,
    project_id: NONE,
    assigned_to: NONE,
  };
}

function readProjectFilterFromUrl() {
  if (typeof window === "undefined") return ALL;
  return new URLSearchParams(window.location.search).get("projectId") || ALL;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === "urgent") return "text-rose-600";
  if (p === "high") return "text-orange-600";
  if (p === "medium") return "text-blue-600";
  return "text-slate-500";
}

type TicketKpiTone = "neutral" | "success" | "warning" | "danger" | "info";

function ticketRiskTone(value: number, warningAt: number, dangerAt: number): TicketKpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function TicketKpi({
  label,
  value,
  tone = "neutral",
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: TicketKpiTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClass: Record<TicketKpiTone, string> = {
    neutral: "text-slate-950",
    success: "text-emerald-600",
    warning: "text-orange-500",
    danger: "text-rose-600",
    info: "text-blue-600",
  };

  const content = (
    <>
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-2 truncate text-xl font-normal ${toneClass[tone]}`}>{value}</div>
    </>
  );

  if (!onClick) {
    return <div className="min-w-0 border-b border-slate-100 pb-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 border-b pb-3 text-left transition hover:border-slate-300 ${
        active ? "border-blue-500" : "border-slate-100"
      }`}
    >
      {content}
    </button>
  );
}

function contactName(contact?: ContactRow | null) {
  if (!contact) return "—";
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email || "—";
}

function optionLabel(value: string, t: (key: string) => string) {
  const key = statusKey(value);
  const label = t(key);
  return label === key ? value : label;
}

function TicketsPage() {
  const { profile } = useAuth();
  const routeSearch = Route.useSearch();
  const { can } = usePermissions();
  const { t } = useT();
  const db = supabase as any;

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(readProjectFilterFromUrl);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [editTicket, setEditTicket] = useState<TicketRow | null>(null);
  const [form, setForm] = useState<TicketForm>(defaultForm);
  const [reply, setReply] = useState("");
  const [replyInternal, setReplyInternal] = useState(false);
  const [saving, setSaving] = useState(false);

  const canCreateTickets = can("tickets.create");
  const labelFor = useCallback((value: string) => optionLabel(value, t), [t]);

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const contactById = useMemo(() => new Map(contacts.map((item) => [item.id, item])), [contacts]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);
  const activeProject = projectFilter !== ALL ? projectById.get(projectFilter) || null : null;

  const fetchTickets = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [ticketRes, clientRes, contactRes, projectRes, profileRes] = await Promise.all([
      db
        .from("tickets")
        .select("*")
        .eq("company_id", cid)
        .order("updated_at", { ascending: false })
        .limit(500),
      db
        .from("clients")
        .select("id,company_name,contact_person")
        .eq("company_id", cid)
        .order("company_name", { ascending: true })
        .limit(1000),
      db
        .from("contacts")
        .select("id,client_id,first_name,last_name,email")
        .eq("company_id", cid)
        .order("first_name", { ascending: true })
        .limit(1000),
      db
        .from("projects")
        .select("id,name,client_id")
        .eq("company_id", cid)
        .order("updated_at", { ascending: false })
        .limit(1000),
      db
        .from("profiles")
        .select("id,user_id,full_name,email,is_active")
        .eq("company_id", cid)
        .order("full_name", { ascending: true })
        .limit(1000),
    ]);

    const firstError =
      ticketRes.error ||
      clientRes.error ||
      contactRes.error ||
      projectRes.error ||
      profileRes.error;
    if (firstError) {
      toast.error(firstError.message || "No se pudieron cargar los tickets.");
      setLoading(false);
      return;
    }

    setTickets(ticketRes.data || []);
    setClients(clientRes.data || []);
    setContacts(contactRes.data || []);
    setProjects(projectRes.data || []);
    setProfiles(profileRes.data || []);
    setLoading(false);
  }, [db, profile?.company_id]);

  const fetchMessages = useCallback(
    async (ticketId: string) => {
      const { data, error } = await db
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error(error.message || "No se pudieron cargar los mensajes.");
        return;
      }
      setMessages(data || []);
    },
    [db],
  );

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const ticketId = routeSearch.ticketId;
    if (!ticketId) return;
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) return;
    setSelectedTicket(ticket);
  }, [routeSearch.ticketId, tickets]);

  useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([]);
      return;
    }
    void fetchMessages(selectedTicket.id);
  }, [fetchMessages, selectedTicket?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (projectFilter === ALL) url.searchParams.delete("projectId");
    else url.searchParams.set("projectId", projectFilter);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [projectFilter]);

  const kpis = useMemo(() => {
    const scoped =
      projectFilter === ALL
        ? tickets
        : tickets.filter((ticket) => ticket.project_id === projectFilter);
    const active = scoped.filter((ticket) => ticket.status !== "Closed");
    const today = new Date().toISOString();
    return {
      total: scoped.length,
      active: active.length,
      open: scoped.filter((ticket) => ticket.status === "Open").length,
      progress: scoped.filter((ticket) => ticket.status === "In Progress").length,
      answered: scoped.filter((ticket) => ticket.status === "Answered").length,
      hold: scoped.filter((ticket) => ticket.status === "On Hold").length,
      closed: scoped.filter((ticket) => ticket.status === "Closed").length,
      urgent: active.filter((ticket) => ticket.priority === "Urgent" || ticket.priority === "High")
        .length,
      unassigned: active.filter((ticket) => !ticket.assigned_to).length,
      overdue: active.filter((ticket) => {
        const due = ticket.resolution_due_at || ticket.first_response_due_at;
        return !!due && String(due) < today;
      }).length,
    };
  }, [projectFilter, tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const client = ticket.client_id ? clientById.get(ticket.client_id) : null;
      const project = ticket.project_id ? projectById.get(ticket.project_id) : null;
      const contact = ticket.contact_id ? contactById.get(ticket.contact_id) : null;
      const haystack =
        `${ticket.ticket_number || ""} ${ticket.subject} ${ticket.description || ""} ${ticket.department || ""} ${ticket.service || ""} ${client?.company_name || ""} ${project?.name || ""} ${contactName(contact)}`.toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (statusFilter === ALL || ticket.status === statusFilter) &&
        (priorityFilter === ALL || ticket.priority === priorityFilter) &&
        (projectFilter === ALL || ticket.project_id === projectFilter)
      );
    });
  }, [
    clientById,
    contactById,
    priorityFilter,
    projectById,
    projectFilter,
    search,
    statusFilter,
    tickets,
  ]);

  const openNewTicket = () => {
    const project = projectFilter !== ALL ? projectById.get(projectFilter) : null;
    setEditTicket(null);
    setForm({
      ...defaultForm(),
      project_id: project?.id || NONE,
      client_id: project?.client_id || NONE,
    });
    setDialogOpen(true);
  };

  const openEditTicket = (ticket: TicketRow) => {
    setEditTicket(ticket);
    setForm({
      subject: ticket.subject || "",
      description: ticket.description || "",
      status: ticket.status || "Open",
      priority: ticket.priority || "Medium",
      department: ticket.department || "Support",
      service: ticket.service || "",
      client_id: ticket.client_id || NONE,
      contact_id: ticket.contact_id || NONE,
      project_id: ticket.project_id || NONE,
      assigned_to: ticket.assigned_to || NONE,
    });
    setDialogOpen(true);
  };

  const saveTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    if (!form.subject.trim()) return toast.error("El asunto es requerido.");
    setSaving(true);
    const payload = {
      company_id: profile.company_id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      department: form.department.trim() || "Support",
      service: form.service.trim() || null,
      client_id: form.client_id !== NONE ? form.client_id : null,
      contact_id: form.contact_id !== NONE ? form.contact_id : null,
      project_id: form.project_id !== NONE ? form.project_id : null,
      assigned_to: form.assigned_to !== NONE ? form.assigned_to : null,
      created_by: profile.id || null,
    };

    const result = editTicket
      ? await db.from("tickets").update(payload).eq("id", editTicket.id).select("*").single()
      : await db.from("tickets").insert(payload).select("*").single();

    setSaving(false);
    if (result.error) return toast.error(result.error.message || "No se pudo guardar el ticket.");
    toast.success(editTicket ? "Ticket actualizado." : "Ticket creado.");
    setDialogOpen(false);
    setEditTicket(null);
    await fetchTickets();
    if (!editTicket) setSelectedTicket(result.data);
  };

  const updateTicketStatus = async (ticket: TicketRow, status: string) => {
    const { error, data } = await db
      .from("tickets")
      .update({ status })
      .eq("id", ticket.id)
      .select("*")
      .single();
    if (error) return toast.error(error.message || "No se pudo actualizar el estado.");
    setTickets((current) => current.map((item) => (item.id === ticket.id ? data : item)));
    setSelectedTicket((current) => (current?.id === ticket.id ? data : current));
    toast.success("Estado actualizado.");
  };

  const addMessage = async () => {
    if (!selectedTicket || !profile?.company_id || !reply.trim()) return;
    const { error } = await db.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      company_id: profile.company_id,
      author_type: "staff",
      author_profile_id: profile.id || null,
      body: reply.trim(),
      is_internal: replyInternal,
    });
    if (error) return toast.error(error.message || "No se pudo agregar el mensaje.");
    setReply("");
    setReplyInternal(false);
    await Promise.all([fetchMessages(selectedTicket.id), fetchTickets()]);
    toast.success(replyInternal ? "Nota interna agregada." : "Respuesta agregada.");
  };

  if (loading) return <LoadingTable />;

  const mobileStatusFilters = [
    { value: ALL, label: t("tickets.allStatuses") },
    ...STATUSES.map((status) => ({ value: status, label: labelFor(status) })),
  ];
  const mobilePriorityFilters = [
    { value: ALL, label: t("tickets.allPriorities") },
    ...PRIORITIES.map((priority) => ({ value: priority, label: labelFor(priority) })),
  ];

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div className="hidden md:block">
        <PageHeader
          title={
            activeProject ? `${t("tickets.title")} · ${activeProject.name}` : t("tickets.title")
          }
          subtitle={t("tickets.subtitle")}
        />
      </div>

      <GlobalKpiStrip
        title={activeProject ? activeProject.name : t("tickets.title")}
        subtitle="Soporte, respuestas y casos abiertos"
        actionLabel={canCreateTickets ? t("tickets.new") : undefined}
        onAction={canCreateTickets ? openNewTicket : undefined}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
        items={[
          {
            key: "tickets-summary",
            label: "Activos",
            value: kpis.active,
            helper: `${filtered.length} visibles de ${kpis.total} tickets`,
            icon: Ticket,
            tone: kpis.overdue > 0 || kpis.urgent > 0 ? "red" : "blue",
            meta: [
              { label: "Urgentes", value: kpis.urgent, tone: "red" },
              { label: "Sin asignar", value: kpis.unassigned, tone: "orange" },
              { label: "Vencidos", value: kpis.overdue, tone: "red" },
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
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobilePriorityFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="hidden grid-cols-5 gap-x-8 gap-y-4 md:grid">
        <TicketKpi
          label={labelFor("Open")}
          value={kpis.open}
          tone={ticketRiskTone(kpis.open, 3, 8)}
          active={statusFilter === "Open"}
          onClick={() => setStatusFilter(statusFilter === "Open" ? ALL : "Open")}
        />
        <TicketKpi
          label={labelFor("In Progress")}
          value={kpis.progress}
          tone="success"
          active={statusFilter === "In Progress"}
          onClick={() => setStatusFilter(statusFilter === "In Progress" ? ALL : "In Progress")}
        />
        <TicketKpi
          label={labelFor("Answered")}
          value={kpis.answered}
          tone="info"
          active={statusFilter === "Answered"}
          onClick={() => setStatusFilter(statusFilter === "Answered" ? ALL : "Answered")}
        />
        <TicketKpi
          label={labelFor("On Hold")}
          value={kpis.hold}
          tone={ticketRiskTone(kpis.hold, 2, 5)}
          active={statusFilter === "On Hold"}
          onClick={() => setStatusFilter(statusFilter === "On Hold" ? ALL : "On Hold")}
        />
        <TicketKpi
          label={labelFor("Closed")}
          value={kpis.closed}
          tone="success"
          active={statusFilter === "Closed"}
          onClick={() => setStatusFilter(statusFilter === "Closed" ? ALL : "Closed")}
        />
      </div>

      <div className="mt-4 border-y border-slate-100 bg-white p-0 shadow-none md:mt-0">
        <div className="hidden flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTickets ? (
              <CrmDetailLineButton
                className="h-9 border-blue-600 bg-blue-600 px-3 text-white hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                icon={<Plus className="h-4 w-4" />}
                onClick={openNewTicket}
              >
                {t("tickets.new")}
              </CrmDetailLineButton>
            ) : null}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tickets..."
              className="h-9 w-72 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Proyecto" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("tickets.allProjects")}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("tickets.table.status")} />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("tickets.allStatuses")}</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelFor(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("tickets.table.priority")} />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("tickets.allPriorities")}</SelectItem>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {labelFor(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid gap-2.5 border-0 bg-white p-0 md:hidden">
            {filtered.length ? (
              filtered.map((ticket) => {
                const client = ticket.client_id ? clientById.get(ticket.client_id) : null;
                const contact = ticket.contact_id ? contactById.get(ticket.contact_id) : null;
                const project = ticket.project_id ? projectById.get(ticket.project_id) : null;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full border-b border-slate-100 bg-white px-4 py-3 text-left transition-colors active:scale-[0.992] hover:bg-slate-50/40"
                  >
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-blue-700">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="truncate text-[15px] font-normal leading-5 text-slate-950">
                          {ticket.subject}
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] font-normal leading-4 text-slate-500">
                          #{ticket.ticket_number || "—"} ·{" "}
                          {client?.company_name || t("tickets.noClient")}
                        </div>
                      </div>
                      <StatusBadge
                        status={ticket.status}
                        className="min-h-6 max-w-[92px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
                      <div className="min-w-0">
                        <div className="text-[10px] font-normal uppercase text-slate-400">
                          Prioridad
                        </div>
                        <div
                          className={`mt-1 truncate text-[12.5px] font-normal ${priorityClass(ticket.priority)}`}
                        >
                          {labelFor(ticket.priority)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-normal uppercase text-slate-400">
                          Contacto
                        </div>
                        <div className="mt-1 truncate text-[12.5px] font-normal text-slate-600">
                          {contactName(contact)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-1.5 text-[12.5px] font-normal text-slate-500">
                      <div className="truncate">
                        {project ? `${project.name} · ` : ""}
                        {ticket.department || "—"}
                        {ticket.service ? ` · ${ticket.service}` : ""}
                      </div>
                      <div className="text-[12px] text-slate-400">
                        {formatDateTime(ticket.last_reply_at || ticket.created_at)}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="border-y border-dashed border-slate-200 bg-white p-6 text-center text-sm font-normal text-slate-500">
                {t("tickets.emptyFiltered")}
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="min-w-[320px]">{t("tickets.table.subject")}</TableHead>
                  <TableHead>{t("tickets.table.department")}</TableHead>
                  <TableHead>{t("tickets.table.status")}</TableHead>
                  <TableHead>{t("tickets.table.priority")}</TableHead>
                  <TableHead>{t("tickets.table.lastReply")}</TableHead>
                  <TableHead className="text-right">{t("tickets.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((ticket) => {
                    const client = ticket.client_id ? clientById.get(ticket.client_id) : null;
                    const contact = ticket.contact_id ? contactById.get(ticket.contact_id) : null;
                    const project = ticket.project_id ? projectById.get(ticket.project_id) : null;
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer align-top hover:bg-slate-50"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <TableCell className="font-normal text-slate-500">
                          {ticket.ticket_number || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-normal text-slate-900">{ticket.subject}</div>
                          <div className="mt-1 line-clamp-1 text-xs font-normal text-slate-500">
                            {client?.company_name || t("tickets.noClient")}
                            {project ? ` · ${project.name}` : ""}
                            {contact ? ` · ${contactName(contact)}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{ticket.department || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <span className={`font-normal ${priorityClass(ticket.priority)}`}>
                            {labelFor(ticket.priority)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(ticket.last_reply_at || ticket.created_at)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <CrmDetailLineButton
                            className="h-8 bg-transparent hover:bg-transparent"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            {t("tickets.view")}
                          </CrmDetailLineButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      {t("tickets.emptyFiltered")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editTicket ? t("tickets.edit") : t("tickets.new")}
        size="md"
      >
        <form className="space-y-6" onSubmit={saveTicket}>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>{t("tickets.subject")}</Label>
            <Input
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className={crmFormStyles.input}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>{t("tickets.description")}</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className={crmFormStyles.textarea}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TicketSelect
              label={t("tickets.table.status")}
              value={form.status}
              onChange={(value) => setForm((current) => ({ ...current, status: value }))}
              options={STATUSES.map((value) => ({ label: labelFor(value), value }))}
              hideNone
            />
            <TicketSelect
              label={t("tickets.table.priority")}
              value={form.priority}
              onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
              options={PRIORITIES.map((value) => ({ label: labelFor(value), value }))}
              hideNone
            />
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>{t("tickets.department")}</Label>
              <Input
                value={form.department}
                onChange={(event) =>
                  setForm((current) => ({ ...current, department: event.target.value }))
                }
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>{t("tickets.service")}</Label>
              <Input
                value={form.service}
                onChange={(event) =>
                  setForm((current) => ({ ...current, service: event.target.value }))
                }
                className={crmFormStyles.input}
              />
            </div>
            <TicketSelect
              label="Cliente"
              value={form.client_id}
              onChange={(value) =>
                setForm((current) => ({ ...current, client_id: value, contact_id: NONE }))
              }
              options={clients.map((item) => ({ label: item.company_name, value: item.id }))}
              noneLabel={t("tickets.noClient")}
            />
            <TicketSelect
              label={t("tickets.table.contact")}
              value={form.contact_id}
              onChange={(value) => setForm((current) => ({ ...current, contact_id: value }))}
              options={contacts
                .filter((item) => form.client_id === NONE || item.client_id === form.client_id)
                .map((item) => ({ label: contactName(item), value: item.id }))}
              noneLabel={t("tickets.noContact")}
            />
            <TicketSelect
              label="Proyecto"
              value={form.project_id}
              onChange={(value) => setForm((current) => ({ ...current, project_id: value }))}
              options={projects.map((item) => ({ label: item.name, value: item.id }))}
              noneLabel={t("tickets.noProject")}
            />
            <TicketSelect
              label="Asignado a"
              value={form.assigned_to}
              onChange={(value) => setForm((current) => ({ ...current, assigned_to: value }))}
              options={profiles
                .filter((item) => item.is_active !== false)
                .map((item) => ({
                  label: item.full_name || item.email || item.id,
                  value: item.id,
                }))}
              noneLabel={t("tickets.unassigned")}
            />
          </div>
          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => setDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={saving}>
              {saving ? t("tickets.saving") : t("tickets.save")}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <TicketDetailDialog
        ticket={selectedTicket}
        messages={messages}
        clientName={
          selectedTicket
            ? clientById.get(selectedTicket.client_id || "")?.company_name || t("tickets.noClient")
            : t("tickets.noClient")
        }
        projectName={
          selectedTicket
            ? projectById.get(selectedTicket.project_id || "")?.name || t("tickets.noProject")
            : t("tickets.noProject")
        }
        assignedName={
          selectedTicket
            ? profileById.get(selectedTicket.assigned_to || "")?.full_name ||
              t("tickets.unassigned")
            : t("tickets.unassigned")
        }
        profileById={profileById}
        reply={reply}
        replyInternal={replyInternal}
        labelFor={labelFor}
        t={t}
        canEdit
        onClose={() => setSelectedTicket(null)}
        onStatusChange={updateTicketStatus}
        onEdit={openEditTicket}
        onReplyChange={setReply}
        onReplyInternalChange={setReplyInternal}
        onAddMessage={addMessage}
      />
    </div>
  );
}

function TicketSelect({
  label,
  value,
  onChange,
  options,
  noneLabel = "None",
  hideNone = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  noneLabel?: string;
  hideNone?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={crmFormStyles.label}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={crmFormStyles.select}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hideNone ? null : <SelectItem value={NONE}>{noneLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TicketDetailDialog({
  ticket,
  messages,
  clientName,
  projectName,
  assignedName,
  profileById,
  reply,
  replyInternal,
  labelFor,
  t,
  canEdit = true,
  onClose,
  onStatusChange,
  onEdit,
  onReplyChange,
  onReplyInternalChange,
  onAddMessage,
}: {
  ticket: TicketRow | null;
  messages: TicketMessage[];
  clientName: string;
  projectName: string;
  assignedName: string;
  profileById: Map<string, ProfileRow>;
  reply: string;
  replyInternal: boolean;
  labelFor: (value: string) => string;
  t: (key: string) => string;
  canEdit?: boolean;
  onClose: () => void;
  onStatusChange: (ticket: TicketRow, status: string) => void | Promise<void>;
  onEdit: (ticket: TicketRow) => void;
  onReplyChange: (value: string) => void;
  onReplyInternalChange: (value: boolean) => void;
  onAddMessage: () => void | Promise<void>;
}) {
  return (
    <Dialog open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-white p-0 shadow-none md:h-[88vh] md:w-[calc(100vw-24px)] md:max-w-4xl md:border md:border-slate-200">
        {ticket ? (
          <div className="flex h-full min-h-0 flex-col">
            <header className="border-b border-slate-100 bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-100 bg-white text-slate-600">
                      <Ticket className="h-4 w-4" />
                    </span>
                    <h2 className="min-w-0 text-lg font-normal text-slate-950 md:text-xl">
                      #{ticket.ticket_number || "—"} · {ticket.subject}
                    </h2>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    {clientName} · {projectName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <CrmDetailLineButton
                      key={status}
                      className={
                        ticket.status === status ? "h-8 border-slate-950 text-slate-950" : "h-8"
                      }
                      onClick={() => void onStatusChange(ticket, status)}
                    >
                      {labelFor(status)}
                    </CrmDetailLineButton>
                  ))}
                  {canEdit ? (
                    <CrmDetailLineButton className="h-8" onClick={() => onEdit(ticket)}>
                      {t("tickets.editAction")}
                    </CrmDetailLineButton>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
              <main className="min-h-0 overflow-y-auto p-5">
                <div className="mb-5 border-b border-slate-100 pb-4 text-sm font-normal leading-6 text-slate-500">
                  {ticket.description || t("tickets.noDescription")}
                </div>
                <div className="divide-y divide-slate-100 border-y border-slate-100">
                  {messages.length ? (
                    messages.map((message) => {
                      const author = message.author_profile_id
                        ? profileById.get(message.author_profile_id)
                        : null;
                      return (
                        <div
                          key={message.id}
                          className={message.is_internal ? "py-4 text-amber-800" : "py-4"}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-normal text-slate-500">
                            <span>
                              {message.is_internal
                                ? "Nota interna"
                                : message.author_type === "customer"
                                  ? "Respuesta del cliente"
                                  : "Respuesta del equipo"}{" "}
                              · {author?.full_name || author?.email || "Sistema"}
                            </span>
                            <span>{formatDateTime(message.created_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm font-normal leading-6 text-slate-700">
                            {message.body}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-sm font-normal text-slate-500">
                      {t("tickets.noMessages")}
                    </div>
                  )}
                </div>
              </main>

              <aside className="border-t border-slate-100 bg-white p-4 lg:border-l lg:border-t-0">
                <div className="space-y-3 text-sm">
                  <Info label={t("tickets.table.priority")} value={labelFor(ticket.priority)} />
                  <Info label={t("tickets.department")} value={ticket.department} />
                  <Info label={t("tickets.service")} value={ticket.service || "—"} />
                  <Info label="Asignado" value={assignedName} />
                  <Info label="Creado" value={formatDateTime(ticket.created_at)} />
                  <Info
                    label={t("tickets.table.lastReply")}
                    value={formatDateTime(ticket.last_reply_at)}
                  />
                </div>
                <div className="mt-5 space-y-2">
                  <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    {t("tickets.replyLabel")}
                  </Label>
                  <Textarea
                    rows={5}
                    value={reply}
                    onChange={(event) => onReplyChange(event.target.value)}
                    placeholder={t("tickets.replyPlaceholder")}
                    className={crmFormStyles.textarea}
                  />
                  <label className="flex items-center gap-2 text-xs font-normal text-slate-500">
                    <input
                      type="checkbox"
                      checked={replyInternal}
                      onChange={(event) => onReplyInternalChange(event.target.checked)}
                    />
                    {t("tickets.internalNote")}
                  </label>
                  <CrmDetailLineButton
                    className="w-full"
                    onClick={() => void onAddMessage()}
                    disabled={!reply.trim()}
                  >
                    {replyInternal ? t("tickets.addInternalNote") : t("tickets.sendReply")}
                  </CrmDetailLineButton>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-2">
      <div className="text-xs font-normal text-slate-500">{label}</div>
      <div className="mt-0.5 font-normal text-slate-950">{value}</div>
    </div>
  );
}
