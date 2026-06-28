import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { CalendarClock, CalendarDays, CheckCircle2, Clock, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Corevix CRM" }] }),
});

type EventSourceType = "calendar_event" | "task" | "invoice" | "proposal" | "project";
type CalendarFilter = "all" | EventSourceType;
type FormType = "event" | "reminder" | "call" | "meeting" | "demo" | "task";

type CalendarItem = {
  id: string;
  relatedId: string;
  source: EventSourceType;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string | null;
  description?: string | null;
  location?: string | null;
  amount?: number | null;
  colorClass: string;
};

type EventForm = {
  title: string;
  type: FormType;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  calendar_event: "Evento",
  task: "Tarea",
  invoice: "Factura",
  proposal: "Propuesta",
  project: "Proyecto",
};

const FORM_TYPE_LABELS: Record<FormType, string> = {
  event: "Evento",
  reminder: "Recordatorio",
  call: "Llamada",
  meeting: "Reunión",
  demo: "Demo",
  task: "Tarea",
};

function toLocalInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toDateInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fromInputValue(value: string, allDay: boolean) {
  if (!value) return null;
  if (allDay && value.length === 10) return `${value}T09:00:00`;
  return value;
}

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function CalendarPage() {
  const { user, profile } = useAuth();
  const db = supabase as any;

  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: "",
    type: "event",
    description: "",
    location: "",
    start_at: toLocalInputValue(new Date()),
    end_at: "",
    all_day: false,
  });

  const fetchEvents = useCallback(async () => {
    if (!profile?.company_id) return;

    const cid = profile.company_id;
    setLoading(true);

    const [{ data: calendarEvents }, { data: tasks }, { data: invoices }, { data: proposals }, { data: projects }] =
      await Promise.all([
        db
          .from("calendar_events")
          .select("id,title,description,location,type,status,start_at,end_at,all_day,related_task_id,created_at")
          .eq("company_id", cid)
          .order("start_at", { ascending: true }),
        db
          .from("tasks")
          .select("id,title,description,due_date,status,priority")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true }),
        db
          .from("invoices")
          .select("id,number,due_date,status,total")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true }),
        db
          .from("proposals")
          .select("id,number,title,valid_until,status")
          .eq("company_id", cid)
          .not("valid_until", "is", null)
          .order("valid_until", { ascending: true }),
        db
          .from("projects")
          .select("id,name,description,due_date,status")
          .eq("company_id", cid)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true }),
      ]);

    const combined: CalendarItem[] = [
      ...(calendarEvents || []).map((e: any) => ({
        id: `calendar_event-${e.id}`,
        relatedId: e.id,
        source: "calendar_event" as const,
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        allDay: e.all_day,
        status: e.status,
        description: e.description,
        location: e.location,
        colorClass:
          e.type === "demo"
            ? "bg-violet-100 text-violet-700 border-violet-200"
            : e.type === "reminder"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : e.type === "call"
                ? "bg-sky-100 text-sky-700 border-sky-200"
                : "bg-blue-100 text-blue-700 border-blue-200",
      })),
      ...(tasks || []).map((t: any) => ({
        id: `task-${t.id}`,
        relatedId: t.id,
        source: "task" as const,
        title: t.title,
        start: t.due_date,
        allDay: true,
        status: t.status,
        description: t.description,
        colorClass: "bg-blue-100 text-blue-700 border-blue-200",
      })),
      ...(invoices || []).map((i: any) => ({
        id: `invoice-${i.id}`,
        relatedId: i.id,
        source: "invoice" as const,
        title: `Factura vence: ${i.number}`,
        start: i.due_date,
        allDay: true,
        status: i.status,
        amount: i.total,
        colorClass: "bg-orange-100 text-orange-700 border-orange-200",
      })),
      ...(proposals || []).map((p: any) => ({
        id: `proposal-${p.id}`,
        relatedId: p.id,
        source: "proposal" as const,
        title: `Propuesta vence: ${p.number || p.title}`,
        start: p.valid_until,
        allDay: true,
        status: p.status,
        colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      })),
      ...(projects || []).map((p: any) => ({
        id: `project-${p.id}`,
        relatedId: p.id,
        source: "project" as const,
        title: `Proyecto: ${p.name}`,
        start: p.due_date,
        allDay: true,
        status: p.status,
        description: p.description,
        colorClass: "bg-violet-100 text-violet-700 border-violet-200",
      })),
    ];

    setEvents(combined);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((event) => event.source === filter);
  }, [events, filter]);

  const fullCalendarEvents = useMemo(
    () =>
      filteredEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end || undefined,
        allDay: event.allDay,
        backgroundColor: "transparent",
        borderColor: "transparent",
        textColor: "inherit",
        extendedProps: event,
      })),
    [filteredEvents],
  );

  const counters = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndText = weekEnd.toISOString().slice(0, 10);

    return {
      total: events.length,
      today: events.filter((event) => dateOnly(event.start) === today).length,
      week: events.filter((event) => {
        const date = dateOnly(event.start);
        return date >= today && date <= weekEndText;
      }).length,
      overdue: events.filter((event) => dateOnly(event.start) < today && event.status !== "completed").length,
    };
  }, [events]);

  function openCreateModal(selection?: { start?: Date | string; end?: Date | string; allDay?: boolean }) {
    const allDay = Boolean(selection?.allDay);
    setForm({
      title: "",
      type: "event",
      description: "",
      location: "",
      start_at: allDay ? toDateInputValue(selection?.start) : toLocalInputValue(selection?.start || new Date()),
      end_at: selection?.end ? (allDay ? toDateInputValue(selection.end) : toLocalInputValue(selection.end)) : "",
      all_day: allDay,
    });
    setCreateOpen(true);
  }

  async function createNotification(title: string, message: string, link = "/calendar") {
    if (!user?.id || !profile?.company_id) return;

    await db.from("notifications").insert({
      company_id: profile.company_id,
      user_id: user.id,
      title,
      message,
      type: "calendar",
      link,
      read: false,
    });
  }

  async function handleCreateEvent() {
    if (!profile?.company_id || !user?.id || !form.title.trim()) return;

    const startAt = fromInputValue(form.start_at, form.all_day);
    const endAt = fromInputValue(form.end_at, form.all_day);

    if (!startAt) return;

    setSaving(true);

    const { error } = await db.from("calendar_events").insert({
      company_id: profile.company_id,
      user_id: user.id,
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_at: startAt,
      end_at: endAt,
      all_day: form.all_day,
      status: "scheduled",
      metadata: { created_from: "calendar_ui" },
    });

    if (!error) {
      await createNotification(
        `${FORM_TYPE_LABELS[form.type]} creado`,
        `${form.title.trim()} quedó en el calendario.`,
      );

      setCreateOpen(false);
      await fetchEvents();
    }

    setSaving(false);
  }

  async function handleEventDrop(info: EventDropArg) {
    const item = info.event.extendedProps as CalendarItem;
    const newStart = info.event.start;
    const newEnd = info.event.end;

    if (!newStart || !profile?.company_id) return;

    const newDate = newStart.toISOString().slice(0, 10);

    try {
      if (item.source === "calendar_event") {
        await db
          .from("calendar_events")
          .update({
            start_at: newStart.toISOString(),
            end_at: newEnd ? newEnd.toISOString() : null,
          })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "task") {
        await db.from("tasks").update({ due_date: newDate }).eq("id", item.relatedId).eq("company_id", profile.company_id);
      }

      if (item.source === "project") {
        await db.from("projects").update({ due_date: newDate }).eq("id", item.relatedId).eq("company_id", profile.company_id);
      }

      if (item.source === "proposal") {
        await db.from("proposals").update({ valid_until: newDate }).eq("id", item.relatedId).eq("company_id", profile.company_id);
      }

      if (item.source === "invoice") {
        await db.from("invoices").update({ due_date: newDate }).eq("id", item.relatedId).eq("company_id", profile.company_id);
      }

      await fetchEvents();
    } catch {
      info.revert();
    }
  }

  function handleSelect(selection: DateSelectArg) {
    openCreateModal({ start: selection.start, end: selection.end, allDay: selection.allDay });
  }

  function handleEventClick(info: EventClickArg) {
    setSelectedEvent(info.event.extendedProps as CalendarItem);
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingMetrics count={4} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f8fafc] p-4 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">Calendario</h1>
          <p className="text-sm font-semibold text-[#667085]">
            Citas, recordatorios, tareas, propuestas, proyectos y facturas en un solo lugar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void fetchEvents()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => openCreateModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear evento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#111827]">
                <CalendarDays className="h-4 w-4 text-[#1d62f9]" />
                Resumen
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold text-[#667085]">Total</p>
                  <p className="text-2xl font-black">{counters.total}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold text-[#667085]">Hoy</p>
                  <p className="text-2xl font-black">{counters.today}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold text-[#667085]">Semana</p>
                  <p className="text-2xl font-black">{counters.week}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold text-[#667085]">Vencidos</p>
                  <p className="text-2xl font-black text-red-600">{counters.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">Filtros</p>

              {[
                ["all", "Todos"],
                ["calendar_event", "Eventos"],
                ["task", "Tareas"],
                ["invoice", "Facturas"],
                ["proposal", "Propuestas"],
                ["project", "Proyectos"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as CalendarFilter)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition ${
                    filter === value ? "bg-[#111827] text-white" : "bg-white text-[#374151] hover:bg-[#f1f5f9]"
                  }`}
                >
                  {label}
                  {filter === value ? <CheckCircle2 className="h-4 w-4" /> : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#667085]">Próximos</p>
              {events.length === 0 ? (
                <p className="text-sm text-[#667085]">No hay eventos todavía.</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 6).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="w-full rounded-xl border bg-white p-3 text-left text-sm hover:bg-[#f8fafc]"
                    >
                      <p className="truncate font-black text-[#111827]">{event.title}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">
                        {new Date(event.start).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <Card className="min-h-[760px] overflow-hidden border-0 shadow-sm">
          <CardContent className="calendar-shell h-full p-3 lg:p-4">
            {filteredEvents.length === 0 ? (
              <div className="mb-4">
                <EmptyState
                  icon={<CalendarClock className="h-6 w-6" />}
                  title="No hay eventos para este filtro"
                  description="Crea una cita, recordatorio o demo para verla en el calendario."
                />
              </div>
            ) : null}

            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
              }}
              locale="es"
              timeZone="local"
              height="760px"
              nowIndicator
              selectable
              editable
              eventStartEditable
              eventDurationEditable
              selectMirror
              weekends
              slotMinTime="06:00:00"
              slotMaxTime="23:59:00"
              allDayText="Todo el día"
              events={fullCalendarEvents}
              select={handleSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop as any}
              eventContent={(arg) => {
                const item = arg.event.extendedProps as CalendarItem;
                return (
                  <div className={`w-full rounded-lg border px-2 py-1 text-xs font-bold ${item.colorClass}`}>
                    <div className="truncate">{arg.event.title}</div>
                    <div className="truncate text-[10px] opacity-80">{EVENT_TYPE_LABELS[item.source]}</div>
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Título</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#1d62f9]/20"
                placeholder="Ej: Demo CRM con Juan Pérez"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Tipo</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FormType }))}
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                >
                  <option value="event">Evento</option>
                  <option value="reminder">Recordatorio</option>
                  <option value="call">Llamada</option>
                  <option value="meeting">Reunión</option>
                  <option value="demo">Demo</option>
                  <option value="task">Tarea</option>
                </select>
              </div>

              <label className="flex items-end gap-2 rounded-xl border px-3 py-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      all_day: event.target.checked,
                      start_at: event.target.checked ? toDateInputValue(prev.start_at) : toLocalInputValue(prev.start_at),
                      end_at: prev.end_at ? (event.target.checked ? toDateInputValue(prev.end_at) : toLocalInputValue(prev.end_at)) : "",
                    }))
                  }
                />
                Todo el día
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Inicio</label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.start_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Fin</label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.end_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Lugar</label>
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                placeholder="Oficina, Zoom, llamada, WhatsApp..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Descripción</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-24 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
                placeholder="Notas internas del evento..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent} disabled={saving || !form.title.trim()}>
                {saving ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              Detalle del evento
              <button onClick={() => setSelectedEvent(null)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {selectedEvent ? (
            <div className="space-y-3">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${selectedEvent.colorClass}`}>
                {EVENT_TYPE_LABELS[selectedEvent.source]}
              </span>

              <div>
                <p className="text-lg font-black">{selectedEvent.title}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#667085]">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedEvent.start).toLocaleString()}
                </p>
              </div>

              {selectedEvent.location ? (
                <p className="text-sm">
                  <span className="font-bold">Lugar:</span> {selectedEvent.location}
                </p>
              ) : null}

              {selectedEvent.description ? (
                <p className="whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{selectedEvent.description}</p>
              ) : null}

              {selectedEvent.status ? <StatusBadge status={selectedEvent.status} /> : null}

              {selectedEvent.amount != null ? (
                <p className="text-sm">
                  <span className="font-bold">Monto:</span> ${Number(selectedEvent.amount).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <style>{`
        .calendar-shell .fc {
          --fc-border-color: #e5e7eb;
          --fc-today-bg-color: rgba(29, 98, 249, 0.08);
          font-family: inherit;
        }

        .calendar-shell .fc-toolbar-title {
          font-size: 1.1rem;
          font-weight: 900;
          color: #111827;
        }

        .calendar-shell .fc-button {
          border-radius: 999px !important;
          border: 1px solid #d1d5db !important;
          background: #fff !important;
          color: #111827 !important;
          font-weight: 800 !important;
          box-shadow: none !important;
          text-transform: capitalize !important;
        }

        .calendar-shell .fc-button-active,
        .calendar-shell .fc-button:hover {
          background: #111827 !important;
          color: #fff !important;
        }

        .calendar-shell .fc-col-header-cell-cushion,
        .calendar-shell .fc-daygrid-day-number {
          color: #111827;
          font-weight: 800;
          text-decoration: none;
        }

        .calendar-shell .fc-event {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
