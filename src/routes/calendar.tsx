import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
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
  eventType?: string | null;
  tone: "blue" | "violet" | "amber" | "sky" | "emerald" | "orange" | "slate";
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

const TONE_STYLES: Record<CalendarItem["tone"], string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

const DOT_STYLES: Record<CalendarItem["tone"], string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
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

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getCalendarEventTone(type?: string | null): CalendarItem["tone"] {
  if (type === "demo") return "violet";
  if (type === "reminder") return "amber";
  if (type === "call") return "sky";
  if (type === "meeting") return "emerald";
  if (type === "task") return "blue";
  return "slate";
}

function CalendarPage() {
  const { user, profile } = useAuth();
  const db = supabase as any;

  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [search, setSearch] = useState("");
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
        eventType: e.type,
        tone: getCalendarEventTone(e.type),
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
        tone: "blue" as const,
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
        tone: "orange" as const,
      })),
      ...(proposals || []).map((p: any) => ({
        id: `proposal-${p.id}`,
        relatedId: p.id,
        source: "proposal" as const,
        title: `Propuesta vence: ${p.number || p.title}`,
        start: p.valid_until,
        allDay: true,
        status: p.status,
        tone: "emerald" as const,
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
        tone: "violet" as const,
      })),
    ];

    setEvents(combined);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      if (filter !== "all" && event.source !== filter) return false;
      if (!query) return true;

      return [
        event.title,
        event.description,
        event.location,
        event.status,
        event.eventType,
        EVENT_TYPE_LABELS[event.source],
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [events, filter, search]);

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

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    return events.filter((event) => event.start >= now || event.allDay).slice(0, 7);
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
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f7fb] p-3 text-[#111827] lg:p-5">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-4">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-[#eef1f6] bg-gradient-to-r from-white via-[#fbfcff] to-[#eef5ff] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#111827] text-white shadow-lg">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-[-0.04em] text-[#111827] lg:text-3xl">
                    Calendario Corevix
                  </h1>
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    FullCalendar
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-sm font-semibold text-[#667085]">
                  Gestiona citas, demos, llamadas, recordatorios, tareas, proyectos, propuestas y facturas desde una agenda visual.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void fetchEvents()} className="h-10 gap-2 rounded-2xl border-[#dce3ef] bg-white">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button onClick={() => openCreateModal()} className="h-10 gap-2 rounded-2xl bg-[#111827] px-4 font-black text-white hover:bg-[#020617]">
                <Plus className="h-4 w-4" />
                Crear evento
              </Button>
            </div>
          </div>

          <div className="grid min-h-[780px] gap-0 xl:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="border-b border-[#eef1f6] bg-[#fbfcff] p-4 xl:border-b-0 xl:border-r">
              <div className="space-y-4">
                <Card className="border border-[#edf1f7] bg-white shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#98a2b3]">Resumen</p>
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Total", counters.total, "slate"],
                        ["Hoy", counters.today, "blue"],
                        ["Semana", counters.week, "emerald"],
                        ["Vencidos", counters.overdue, "orange"],
                      ].map(([label, value, tone]) => (
                        <div key={label} className="rounded-2xl border border-[#edf1f7] bg-[#f8fafc] p-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-[#98a2b3]">{label}</p>
                          <p className={`mt-1 text-2xl font-black ${tone === "orange" ? "text-orange-600" : "text-[#111827]"}`}>
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-[#edf1f7] bg-white shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar en calendario..."
                        className="h-11 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="space-y-1">
                      {[
                        ["all", "Todos", "slate"],
                        ["calendar_event", "Eventos", "sky"],
                        ["task", "Tareas", "blue"],
                        ["invoice", "Facturas", "orange"],
                        ["proposal", "Propuestas", "emerald"],
                        ["project", "Proyectos", "violet"],
                      ].map(([value, label, tone]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFilter(value as CalendarFilter)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-black transition ${
                            filter === value
                              ? "bg-[#111827] text-white shadow-sm"
                              : "text-[#344054] hover:bg-[#f3f6fb]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${DOT_STYLES[tone as CalendarItem["tone"]]}`} />
                            {label}
                          </span>
                          {filter === value ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-[#edf1f7] bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#98a2b3]">Próximos</p>
                    {upcoming.length === 0 ? (
                      <p className="rounded-2xl bg-[#f8fafc] p-3 text-sm font-semibold text-[#667085]">
                        No hay eventos próximos.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {upcoming.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className="group w-full rounded-2xl border border-[#edf1f7] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-start gap-2">
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_STYLES[event.tone]}`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-[#111827]">{event.title}</p>
                                <p className="mt-1 text-xs font-bold text-[#667085]">
                                  {formatDate(event.start)} · {event.allDay ? "Todo el día" : formatTime(event.start)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </aside>

            <main className="min-w-0 bg-white p-3 lg:p-5">
              {filteredEvents.length === 0 ? (
                <div className="mb-4">
                  <EmptyState
                    icon={<CalendarClock className="h-6 w-6" />}
                    title="No hay eventos para este filtro"
                    description="Crea una cita, recordatorio o demo para verla en el calendario."
                  />
                </div>
              ) : null}

              <div className="corevix-calendar-shell overflow-hidden rounded-[24px] border border-[#edf1f7] bg-white p-3 shadow-sm">
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
                      <div className={`corevix-calendar-event ${TONE_STYLES[item.tone]}`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[item.tone]}`} />
                          <span className="truncate">{arg.event.title}</span>
                        </div>
                        <div className="truncate text-[10px] font-black opacity-70">{EVENT_TYPE_LABELS[item.source]}</div>
                      </div>
                    );
                  }}
                />
              </div>
            </main>
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl rounded-3xl border-0 p-0 shadow-2xl">
          <div className="border-b bg-gradient-to-r from-white to-blue-50 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-[-0.03em]">Crear evento</DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-sm font-semibold text-[#667085]">
              Programa una cita, demo, llamada o recordatorio dentro del CRM.
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Título</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 text-sm font-semibold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                placeholder="Ej: Demo CRM con Juan Pérez"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Tipo</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FormType }))}
                  className="h-12 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 text-sm font-bold outline-none"
                >
                  <option value="event">Evento</option>
                  <option value="reminder">Recordatorio</option>
                  <option value="call">Llamada</option>
                  <option value="meeting">Reunión</option>
                  <option value="demo">Demo</option>
                  <option value="task">Tarea</option>
                </select>
              </div>

              <label className="flex items-end gap-2 rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 py-3 text-sm font-black">
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
                  className="h-12 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Fin</label>
                <input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.end_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Lugar</label>
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 text-sm font-semibold outline-none"
                placeholder="Oficina, Zoom, llamada, WhatsApp..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">Descripción</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-24 w-full resize-none rounded-2xl border border-[#e5eaf2] bg-[#fbfcff] px-4 py-3 text-sm font-semibold outline-none"
                placeholder="Notas internas del evento..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-2xl">
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent} disabled={saving || !form.title.trim()} className="rounded-2xl bg-[#111827] font-black">
                {saving ? "Guardando..." : "Crear evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg rounded-3xl border-0 p-0 shadow-2xl">
          <div className="border-b bg-gradient-to-r from-white to-slate-50 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span className="text-xl font-black tracking-[-0.03em]">Detalle del evento</span>
                <button onClick={() => setSelectedEvent(null)} className="rounded-xl p-1 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </DialogTitle>
            </DialogHeader>
          </div>

          {selectedEvent ? (
            <div className="space-y-4 p-6">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${TONE_STYLES[selectedEvent.tone]}`}>
                {EVENT_TYPE_LABELS[selectedEvent.source]}
              </span>

              <div>
                <p className="text-xl font-black tracking-[-0.03em]">{selectedEvent.title}</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#667085]">
                  <Clock className="h-4 w-4" />
                  {formatDate(selectedEvent.start)} · {selectedEvent.allDay ? "Todo el día" : formatTime(selectedEvent.start)}
                </p>
              </div>

              {selectedEvent.location ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
                  <MapPin className="h-4 w-4 text-[#667085]" />
                  {selectedEvent.location}
                </p>
              ) : null}

              {selectedEvent.description ? (
                <p className="whitespace-pre-wrap rounded-2xl bg-[#f8fafc] p-4 text-sm font-semibold text-[#344054]">
                  {selectedEvent.description}
                </p>
              ) : null}

              {selectedEvent.status ? <StatusBadge status={selectedEvent.status} /> : null}

              {selectedEvent.amount != null ? (
                <p className="rounded-2xl bg-orange-50 p-4 text-sm font-black text-orange-700">
                  Monto: ${Number(selectedEvent.amount).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <style>{`
        .corevix-calendar-shell .fc {
          --fc-border-color: #edf1f7;
          --fc-today-bg-color: rgba(29, 98, 249, 0.06);
          --fc-now-indicator-color: #ef4444;
          font-family: inherit;
        }

        .corevix-calendar-shell .fc-toolbar {
          gap: 12px;
          margin-bottom: 18px !important;
        }

        .corevix-calendar-shell .fc-toolbar-title {
          font-size: 1.2rem;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #111827;
        }

        .corevix-calendar-shell .fc-button {
          height: 38px !important;
          border-radius: 999px !important;
          border: 1px solid #dce3ef !important;
          background: #fff !important;
          color: #111827 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          box-shadow: none !important;
          text-transform: capitalize !important;
          padding: 0 14px !important;
        }

        .corevix-calendar-shell .fc-button-active,
        .corevix-calendar-shell .fc-button:hover {
          background: #111827 !important;
          border-color: #111827 !important;
          color: #fff !important;
        }

        .corevix-calendar-shell .fc-scrollgrid {
          overflow: hidden;
          border-radius: 18px;
          border-color: #edf1f7 !important;
        }

        .corevix-calendar-shell .fc-col-header-cell {
          background: #fbfcff;
          padding: 10px 0;
        }

        .corevix-calendar-shell .fc-col-header-cell-cushion,
        .corevix-calendar-shell .fc-daygrid-day-number {
          color: #111827;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .corevix-calendar-shell .fc-timegrid-slot-label-cushion {
          color: #98a2b3;
          font-size: 11px;
          font-weight: 800;
        }

        .corevix-calendar-shell .fc-timegrid-axis-cushion,
        .corevix-calendar-shell .fc-timegrid-slot-label {
          color: #98a2b3;
        }

        .corevix-calendar-shell .fc-event {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          cursor: pointer;
        }

        .corevix-calendar-event {
          width: 100%;
          min-height: 30px;
          border-radius: 12px;
          border-width: 1px;
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.15;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .corevix-calendar-shell .fc-day-today .fc-daygrid-day-frame {
          background: rgba(29, 98, 249, 0.035);
        }

        .corevix-calendar-shell .fc-highlight {
          background: rgba(29, 98, 249, 0.12) !important;
          border-radius: 12px;
        }

        @media (max-width: 900px) {
          .corevix-calendar-shell .fc-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .corevix-calendar-shell .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
