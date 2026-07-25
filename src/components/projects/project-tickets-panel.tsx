import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { CrmDetailLineButton } from "@/components/crm/crm-detail-layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_LABELS: Record<string, string> = {
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
};

type ProjectTicketRow = {
  id: string;
  ticket_number: number | null;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  department: string;
  service: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectContext = {
  id: string;
  client_id: string | null;
};

function defaultForm() {
  return {
    subject: "",
    description: "",
    priority: "Medium",
    department: "Support",
    service: "",
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
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
  const value = priority.toLowerCase();
  if (value === "urgent") return "text-rose-600";
  if (value === "high") return "text-orange-600";
  if (value === "medium") return "text-blue-600";
  return "text-slate-500";
}

function priorityLabel(priority: string) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function ProjectTicketsPanel({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<ProjectTicketRow[]>([]);
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const ticketsUrl = `/tickets?projectId=${encodeURIComponent(projectId)}`;

  const fetchTickets = useCallback(async () => {
    if (!profile?.company_id) {
      setTickets([]);
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [projectRes, ticketsRes] = await Promise.all([
      (supabase as any)
        .from("projects")
        .select("id,client_id")
        .eq("company_id", profile.company_id)
        .eq("id", projectId)
        .maybeSingle(),
      (supabase as any)
        .from("tickets")
        .select(
          "id,ticket_number,subject,description,status,priority,department,service,last_reply_at,created_at,updated_at",
        )
        .eq("company_id", profile.company_id)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    const firstError = projectRes.error || ticketsRes.error;
    if (firstError) {
      toast.error(firstError.message || "No se pudieron cargar los tickets del proyecto.");
      setLoading(false);
      return;
    }

    setProject(projectRes.data || null);
    setTickets(ticketsRes.data || []);
    setLoading(false);
  }, [profile?.company_id, projectId]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const summary = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status !== "Closed").length,
      closed: tickets.filter((ticket) => ticket.status === "Closed").length,
    };
  }, [tickets]);

  const openNewTicket = () => {
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const saveTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    if (!form.subject.trim()) return toast.error("El asunto es requerido.");

    setSaving(true);
    const { error } = await (supabase as any).from("tickets").insert({
      company_id: profile.company_id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: "Open",
      priority: form.priority,
      department: form.department.trim() || "Support",
      service: form.service.trim() || null,
      project_id: projectId,
      client_id: project?.client_id || null,
      created_by: profile.id || null,
    });

    setSaving(false);
    if (error) return toast.error(error.message || "No se pudo crear el ticket.");

    toast.success("Ticket creado.");
    setDialogOpen(false);
    setForm(defaultForm());
    await fetchTickets();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
            Tickets del proyecto
          </h3>
          <p className="mt-1 text-sm font-normal text-slate-500">
            {summary.total} total · {summary.open} abiertos · {summary.closed} cerrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CrmDetailLineButton
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void fetchTickets()}
            disabled={loading}
          >
            Actualizar
          </CrmDetailLineButton>
          <CrmDetailLineButton
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() => {
              window.location.href = ticketsUrl;
            }}
          >
            Abrir tickets
          </CrmDetailLineButton>
          <CrmDetailLineButton icon={<Plus className="h-4 w-4" />} onClick={openNewTicket}>
            Nuevo ticket
          </CrmDetailLineButton>
        </div>
      </div>

      <div className="border-y border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white">
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="min-w-[280px]">Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Última respuesta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    Cargando tickets...
                  </TableCell>
                </TableRow>
              ) : tickets.length ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="align-top">
                    <TableCell className="font-normal text-slate-500">
                      {ticket.ticket_number || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-normal text-slate-950">{ticket.subject}</div>
                      <div className="mt-1 line-clamp-1 text-xs font-normal text-slate-500">
                        {ticket.description || ticket.service || "Sin descripción"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <span className={`font-normal ${priorityClass(ticket.priority)}`}>
                        {priorityLabel(ticket.priority)}
                      </span>
                    </TableCell>
                    <TableCell>{ticket.department || "-"}</TableCell>
                    <TableCell>
                      {formatDateTime(ticket.last_reply_at || ticket.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-100 bg-white text-slate-500">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <div className="font-normal text-slate-950">
                        Este proyecto todavía no tiene tickets
                      </div>
                      <p className="text-sm font-normal text-slate-500">
                        Crea el primer ticket relacionado a este proyecto sin salir del workspace.
                      </p>
                      <CrmDetailLineButton className="mt-2" onClick={openNewTicket}>
                        Crear ticket
                      </CrmDetailLineButton>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nuevo ticket del proyecto"
        size="sm"
      >
        <form className="space-y-6" onSubmit={saveTicket}>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Asunto</Label>
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
            <Label className={crmFormStyles.label}>Descripción</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className={crmFormStyles.textarea}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className={crmFormStyles.label}>Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className={crmFormStyles.label}>Departamento</Label>
              <Input
                value={form.department}
                onChange={(event) =>
                  setForm((current) => ({ ...current, department: event.target.value }))
                }
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className={crmFormStyles.label}>Servicio</Label>
              <Input
                value={form.service}
                onChange={(event) =>
                  setForm((current) => ({ ...current, service: event.target.value }))
                }
                className={crmFormStyles.input}
              />
            </div>
          </div>
          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton} disabled={saving}>
              {saving ? "Creando..." : "Crear ticket"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>
    </div>
  );
}
