import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { statusKey, useT } from "@/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
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
    return {
      open: scoped.filter((ticket) => ticket.status === "Open").length,
      progress: scoped.filter((ticket) => ticket.status === "In Progress").length,
      answered: scoped.filter((ticket) => ticket.status === "Answered").length,
      hold: scoped.filter((ticket) => ticket.status === "On Hold").length,
      closed: scoped.filter((ticket) => ticket.status === "Closed").length,
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

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={activeProject ? `${t("tickets.title")} · ${activeProject.name}` : t("tickets.title")}
        subtitle={t("tickets.subtitle")}
        actionLabel={canCreateTickets ? t("tickets.new") : undefined}
        onAction={canCreateTickets ? openNewTicket : undefined}
      />

      <div className="flex flex-wrap gap-2">
        {[
          ["Open", kpis.open, "text-rose-600", AlertCircle],
          ["In Progress", kpis.progress, "text-emerald-600", Clock3],
          ["Answered", kpis.answered, "text-blue-600", MessageSquare],
          ["On Hold", kpis.hold, "text-slate-600", Clock3],
          ["Closed", kpis.closed, "text-sky-600", CheckCircle2],
        ].map(([label, value, tone, Icon]: any) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === label ? ALL : label)}
            className={
              "inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold shadow-sm transition hover:border-slate-300 " +
              (statusFilter === label ? "border-blue-200 bg-blue-50" : "")
            }
          >
            <Icon className={`h-4 w-4 ${tone}`} />
            <span>{value}</span>
            <span className={tone}>{labelFor(label)}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTickets ? (
              <Button onClick={openNewTicket}>
                <Plus className="mr-2 h-4 w-4" />
                {t("tickets.new")}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void fetchTickets()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("profile.workMonitor.refresh")}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="w-full pl-9 sm:w-72"
                placeholder={t("tickets.searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("tickets.table.status")} />
              </SelectTrigger>
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("tickets.table.priority")} />
              </SelectTrigger>
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

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="min-w-[320px]">{t("tickets.table.subject")}</TableHead>
                  <TableHead>{t("tickets.table.department")}</TableHead>
                  <TableHead>{t("tickets.table.service")}</TableHead>
                  <TableHead>{t("tickets.table.contact")}</TableHead>
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
                        <TableCell className="font-semibold text-slate-500">
                          {ticket.ticket_number || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{ticket.subject}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {client?.company_name || t("tickets.noClient")}
                            {project ? ` · ${project.name}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{ticket.department || "—"}</TableCell>
                        <TableCell>{ticket.service || "—"}</TableCell>
                        <TableCell>{contactName(contact)}</TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${priorityClass(ticket.priority)}`}>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            {t("tickets.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                      {t("tickets.emptyFiltered")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTicket ? t("tickets.edit") : t("tickets.new")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveTicket}>
            <div className="space-y-1.5">
              <Label>{t("tickets.subject")}</Label>
              <Input
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("tickets.description")}</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
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
                <Label>{t("tickets.department")}</Label>
                <Input
                  value={form.department}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, department: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("tickets.service")}</Label>
                <Input
                  value={form.service}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, service: event.target.value }))
                  }
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("tickets.saving") : t("tickets.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="h-[88vh] max-w-4xl overflow-hidden p-0">
          {selectedTicket ? (
            <div className="flex h-full min-h-0 flex-col">
              <header className="border-b p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Ticket className="h-5 w-5 text-blue-600" />
                      <h2 className="text-xl font-extrabold text-slate-950">
                        #{selectedTicket.ticket_number || "—"} · {selectedTicket.subject}
                      </h2>
                      <StatusBadge status={selectedTicket.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {clientById.get(selectedTicket.client_id || "")?.company_name ||
                        t("tickets.noClient")}{" "}
                      · {projectById.get(selectedTicket.project_id || "")?.name || t("tickets.noProject")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selectedTicket.status === status ? "default" : "outline"}
                        onClick={() => void updateTicketStatus(selectedTicket, status)}
                      >
                        {labelFor(status)}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditTicket(selectedTicket)}
                    >
                      {t("tickets.editAction")}
                    </Button>
                  </div>
                </div>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
                <main className="min-h-0 overflow-y-auto p-5">
                  <div className="mb-5 rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedTicket.description || t("tickets.noDescription")}
                  </div>
                  <div className="space-y-3">
                    {messages.length ? (
                      messages.map((message) => {
                        const author = message.author_profile_id
                          ? profileById.get(message.author_profile_id)
                          : null;
                        return (
                          <div
                            key={message.id}
                            className={
                              "rounded-xl border p-4 " +
                              (message.is_internal ? "border-amber-200 bg-amber-50" : "bg-white")
                            }
                          >
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
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
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                              {message.body}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                        {t("tickets.noMessages")}
                      </div>
                    )}
                  </div>
                </main>

                <aside className="border-t bg-slate-50 p-4 lg:border-l lg:border-t-0">
                  <div className="space-y-3 text-sm">
                    <Info label={t("tickets.table.priority")} value={labelFor(selectedTicket.priority)} />
                    <Info label={t("tickets.department")} value={selectedTicket.department} />
                    <Info label={t("tickets.service")} value={selectedTicket.service || "—"} />
                    <Info
                      label="Asignado"
                      value={
                        profileById.get(selectedTicket.assigned_to || "")?.full_name ||
                        t("tickets.unassigned")
                      }
                    />
                    <Info label="Creado" value={formatDateTime(selectedTicket.created_at)} />
                    <Info
                      label={t("tickets.table.lastReply")}
                      value={formatDateTime(selectedTicket.last_reply_at)}
                    />
                  </div>
                  <div className="mt-5 space-y-2">
                    <Label>{t("tickets.replyLabel")}</Label>
                    <Textarea
                      rows={5}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={t("tickets.replyPlaceholder")}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={replyInternal}
                        onChange={(event) => setReplyInternal(event.target.checked)}
                      />
                      {t("tickets.internalNote")}
                    </label>
                    <Button
                      className="w-full"
                      onClick={() => void addMessage()}
                      disabled={!reply.trim()}
                    >
                      {replyInternal ? t("tickets.addInternalNote") : t("tickets.sendReply")}
                    </Button>
                  </div>
                </aside>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
    </div>
  );
}
