import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function ProjectTicketsPanel({ projectId }: { projectId: string }) {
  const [tickets, setTickets] = useState<ProjectTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const ticketsUrl = `/tickets?projectId=${encodeURIComponent(projectId)}`;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tickets")
      .select("id,ticket_number,subject,description,status,priority,department,service,last_reply_at,created_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los tickets del proyecto.");
      setLoading(false);
      return;
    }

    setTickets(data || []);
    setLoading(false);
  }, [projectId]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900">Project Tickets</h3>
          <p className="text-sm font-medium text-slate-500">
            {summary.total} total · {summary.open} open · {summary.closed} closed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchTickets()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href={ticketsUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open tickets
            </a>
          </Button>
          <Button asChild>
            <a href={ticketsUrl}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="min-w-[280px]">Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Last Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    Loading tickets...
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
                    <TableCell><span className={`font-bold ${priorityClass(ticket.priority)}`}>{ticket.priority}</span></TableCell>
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
                      <div className="font-bold text-slate-900">No project tickets yet</div>
                      <p className="text-sm font-medium text-slate-500">
                        Crea el primer ticket relacionado a este proyecto desde el panel de soporte.
                      </p>
                      <Button asChild size="sm" className="mt-2">
                        <a href={ticketsUrl}>Create ticket</a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
