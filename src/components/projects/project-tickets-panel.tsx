import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Ticket } from "lucide-react";
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
        .select("id,ticket_number,subject,description,status,priority,department,service,last_reply_at,created_at,updated_at")
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
          <h3 className="font-extrabold text-slate-900">Tickets del proyecto</h3>
          <p className="text-sm font-medium text-slate-500">
            {summary.total} total · {summary.open} abiertos · {summary.closed} cerrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchTickets()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" asChild>
            <a href={ticketsUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir tickets
            </a>
          </Button>
          <Button onClick={openNewTicket}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo ticket
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
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
                    <TableCell className="font-semibold text-slate-500">{ticket.ticket_number || "-"}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{ticket.subject}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {ticket.description || ticket.service || "Sin descripción"}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                    <TableCell><span className={`font-bold ${priorityClass(ticket.priority)}`}>{priorityLabel(ticket.priority)}</span></TableCell>
                    <TableCell>{ticket.department || "-"}</TableCell>
                    <TableCell>{formatDateTime(ticket.last_reply_at || ticket.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border bg-slate-50 text-slate-500">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <div className="font-bold text-slate-900">Este proyecto todavía no tiene tickets</div>
                      <p className="text-sm font-medium text-slate-500">
                        Crea el primer ticket relacionado a este proyecto sin salir del workspace.
                      </p>
                      <Button size="sm" className="mt-2" onClick={openNewTicket}>
                        Crear ticket
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo ticket del proyecto</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveTicket}>
            <div className="space-y-1.5">
              <Label>Asunto</Label>
              <Input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priorityLabel(priority)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Departamento</Label>
                <Input
                  value={form.department}
                  onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Servicio</Label>
                <Input
                  value={form.service}
                  onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear ticket"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
