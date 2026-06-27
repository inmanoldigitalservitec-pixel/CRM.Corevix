import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Corevix CRM" }] }),
});

interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: "task" | "invoice" | "proposal" | "project";
  color: string;
  status?: string | null;
  amount?: number | null;
  relatedId: string;
}

function CalendarPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "task" | "invoice" | "proposal" | "project">(
    "all",
  );
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const db = supabase as any;

  const fetchEvents = useCallback(async () => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    setLoading(true);

    const [{ data: tasks }, { data: invoices }, { data: proposals }, { data: projects }] =
      await Promise.all([
        db
          .from("tasks")
          .select("id, title, due_date, status, priority")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date"),
        db
          .from("invoices")
          .select("id, number, due_date, status, total")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date"),
        db
          .from("proposals")
          .select("id, number, title, valid_until, status")
          .eq("company_id", cid)
          .not("valid_until", "is", null)
          .order("valid_until"),
        db
          .from("projects")
          .select("id, name, due_date, status")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date"),
      ]);

    const combined: CalEvent[] = [
      ...(tasks || []).map((t: any) => ({
        id: `task-${t.id}`,
        relatedId: t.id,
        title: t.title,
        date: t.due_date,
        type: "task" as const,
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        status: t.status,
      })),
      ...(invoices || []).map((i: any) => ({
        id: `invoice-${i.id}`,
        relatedId: i.id,
        title: `Factura vence: ${i.number}`,
        date: i.due_date,
        type: "invoice" as const,
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        status: i.status,
        amount: i.total,
      })),
      ...(proposals || []).map((p: any) => ({
        id: `proposal-${p.id}`,
        relatedId: p.id,
        title: `Propuesta vence: ${p.number || p.title}`,
        date: p.valid_until,
        type: "proposal" as const,
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        status: p.status,
      })),
      ...(projects || []).map((p: any) => ({
        id: `project-${p.id}`,
        relatedId: p.id,
        title: `Proyecto: ${p.name}`,
        date: p.due_date,
        type: "project" as const,
        color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
        status: p.status,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    setEvents(combined);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    if (typeFilter === "all") return events;
    return events.filter((event) => event.type === typeFilter);
  }, [events, typeFilter]);

  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const event of filteredEvents) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEvents]);

  const counters = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      .toISOString()
      .slice(0, 10);
    const overdue = events.filter((event) => event.date < today).length;
    const todayCount = events.filter((event) => event.date === today).length;
    const weekCount = events.filter((event) => event.date >= today && event.date < weekEnd).length;
    return { overdue, today: todayCount, week: weekCount };
  }, [events]);

  if (loading)
    return (
      <div className="p-6">
        <LoadingMetrics count={4} />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Fechas importantes de Tasks, Invoices, Proposals y Projects
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={typeFilter === "all" ? "default" : "outline"}
          onClick={() => setTypeFilter("all")}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "task" ? "default" : "outline"}
          onClick={() => setTypeFilter("task")}
        >
          Tasks
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "invoice" ? "default" : "outline"}
          onClick={() => setTypeFilter("invoice")}
        >
          Invoices
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "proposal" ? "default" : "outline"}
          onClick={() => setTypeFilter("proposal")}
        >
          Proposals
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "project" ? "default" : "outline"}
          onClick={() => setTypeFilter("project")}
        >
          Projects
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Vencidos</div>
            <div className="text-xl font-semibold">{counters.overdue}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Hoy</div>
            <div className="text-xl font-semibold">{counters.today}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Esta semana</div>
            <div className="text-xl font-semibold">{counters.week}</div>
          </CardContent>
        </Card>
      </div>
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No upcoming events"
          description="Los eventos con fechas aparecerán aquí."
        />
      ) : (
        <div className="grid gap-3">
          {groupedEvents.map(([date, dayEvents]) => (
            <Card key={date} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[50px]">
                    <div className="text-lg font-bold">{date.split("-")[2]}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {new Date(date + "T00:00").toLocaleString("en", { month: "short" })}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="w-full text-left rounded-md border p-2 hover:bg-muted/40 transition-colors"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{event.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${event.color}`}>
                            {event.type === "task"
                              ? "Task"
                              : event.type === "invoice"
                                ? "Invoice"
                                : event.type === "proposal"
                                  ? "Proposal"
                                  : "Project"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del evento</DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Tipo:</span> {selectedEvent.type}
              </div>
              <div className="text-sm font-medium">{selectedEvent.title}</div>
              <div className="text-sm">
                <span className="text-muted-foreground">Fecha:</span> {selectedEvent.date}
              </div>
              {selectedEvent.status ? (
                <div className="text-sm">
                  <StatusBadge status={selectedEvent.status} />
                </div>
              ) : null}
              {selectedEvent.type === "invoice" && selectedEvent.amount != null ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">Monto:</span> $
                  {Number(selectedEvent.amount).toLocaleString()}
                </div>
              ) : null}
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Cerrar
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
