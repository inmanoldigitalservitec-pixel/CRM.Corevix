import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { CorevixCalendarView } from "@/components/crm/corevix-calendar-view";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { MobileCalendarMonthView } from "@/components/calendar/mobile-calendar-month-view";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CALENDAR_FILTER_OPTIONS,
  DOT_STYLES,
  EVENT_TYPE_LABELS,
  FORM_TYPE_LABELS,
  buildCalendarItems,
  dateOnly,
  filterCalendarItems,
  formatDate,
  formatTime,
  fromInputValue,
  toDateInputValue,
  toLocalInputValue,
  type CalendarFilter,
  type CalendarItem,
  type FormType,
} from "@/lib/crm/calendar-items";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>): { eventId?: string } => ({
    eventId: typeof search.eventId === "string" ? search.eventId : undefined,
  }),
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Corevix CRM" }] }),
});

type EventForm = {
  title: string;
  type: FormType;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
};

const desktopMonthFormatter = new Intl.DateTimeFormat("es", { month: "long" });
const desktopShortMonthFormatter = new Intl.DateTimeFormat("es", { month: "short" });

function CalendarKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : tone === "info"
            ? "text-blue-600"
            : "text-slate-950";

  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <div className="truncate text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-normal leading-none", toneClass)}>{value}</div>
    </div>
  );
}

function DesktopMonthNavigator({
  year,
  month,
  eventsByDay,
  onChange,
}: {
  year: number;
  month: number;
  eventsByDay: Record<string, CalendarItem[]>;
  onChange: (date: Date) => void;
}) {
  return (
    <section className="border-b border-slate-100 pb-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(new Date(year - 1, month, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-950"
          aria-label="Año anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[40px] font-light leading-none text-rose-500">{year}</div>
        <button
          type="button"
          onClick={() => onChange(new Date(year + 1, month, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-950"
          aria-label="Año siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        {Array.from({ length: 12 }, (_, index) => {
          const monthDate = new Date(year, index, 1);
          const isActive = index === month;
          const monthEvents = Object.keys(eventsByDay).filter((key) =>
            key.startsWith(`${year}-${String(index + 1).padStart(2, "0")}`),
          ).length;

          return (
            <button
              key={monthDate.toISOString()}
              type="button"
              onClick={() => onChange(monthDate)}
              className="min-w-0 text-left"
            >
              <span
                className={cn(
                  "block truncate text-[18px] font-light capitalize leading-none",
                  isActive ? "text-rose-500" : "text-slate-950",
                )}
              >
                {desktopShortMonthFormatter.format(monthDate)}
              </span>
              <span className="mt-2 flex items-center gap-1">
                {Array.from({ length: Math.min(4, monthEvents) }, (_, dot) => (
                  <span key={dot} className="h-1 w-1 rounded-full bg-blue-500" />
                ))}
                {monthEvents > 4 ? (
                  <span className="text-[10px] font-light text-slate-400">+{monthEvents - 4}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarPage() {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const routeSearch = Route.useSearch();
  const db = supabase as any;

  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [desktopFocusDate, setDesktopFocusDate] = useState<Date | null>(null);
  const [desktopVisibleDate, setDesktopVisibleDate] = useState(() => new Date());
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

    const [
      { data: calendarEvents },
      { data: tasks },
      { data: invoices },
      { data: proposals },
      { data: projects },
      { data: estimates },
      { data: subscriptions },
      { data: contracts },
      { data: tickets },
      { data: payments },
    ] = await Promise.all([
      db
        .from("calendar_events")
        .select(
          "id,title,description,location,type,status,start_at,end_at,all_day,related_task_id,created_at",
        )
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
        .select("id,number,due_date,status,total,currency,base_currency")
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
      db
        .from("estimates")
        .select("id,number,title,expiry_date,status,total,currency,base_currency")
        .eq("company_id", cid)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true }),
      db
        .from("subscriptions")
        .select("id,name,next_billing_date,status,amount,currency,base_currency,billing_cycle")
        .eq("company_id", cid)
        .not("next_billing_date", "is", null)
        .order("next_billing_date", { ascending: true }),
      db
        .from("contracts")
        .select("id,contract_number,subject,end_date,status,contract_value,currency,base_currency")
        .eq("company_id", cid)
        .not("end_date", "is", null)
        .order("end_date", { ascending: true }),
      db
        .from("tickets")
        .select("id,ticket_number,subject,status,priority,first_response_due_at,resolution_due_at")
        .eq("company_id", cid)
        .limit(500),
      db
        .from("payments")
        .select("id,payment_number,reference,payment_date,status,amount,currency,base_currency")
        .eq("company_id", cid)
        .not("payment_date", "is", null)
        .order("payment_date", { ascending: true }),
    ]);

    const combined: CalendarItem[] = buildCalendarItems({
      calendarEvents,
      tasks,
      invoices,
      proposals,
      projects,
      estimates,
      subscriptions,
      contracts,
      tickets,
      payments,
    });

    setEvents(combined);
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return filterCalendarItems(events, filter, search);
  }, [events, filter, search]);

  const filteredEventsByDay = useMemo(() => {
    return filteredEvents.reduce<Record<string, CalendarItem[]>>((acc, event) => {
      const key = dateOnly(event.start);
      acc[key] = acc[key] ? [...acc[key], event] : [event];
      return acc;
    }, {});
  }, [filteredEvents]);

  const counters = useMemo(() => {
    const today = dateOnly(new Date().toISOString());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndText = dateOnly(weekEnd.toISOString());

    return {
      total: events.length,
      today: events.filter((event) => dateOnly(event.start) === today).length,
      week: events.filter((event) => {
        const date = dateOnly(event.start);
        return date >= today && date <= weekEndText;
      }).length,
      overdue: events.filter(
        (event) => dateOnly(event.start) < today && event.status !== "completed",
      ).length,
    };
  }, [events]);

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    const today = dateOnly(now);
    return events
      .filter((event) => (event.allDay ? dateOnly(event.start) >= today : event.start >= now))
      .slice(0, 7);
  }, [events]);

  function openCreateModal(selection?: {
    start?: Date | string;
    end?: Date | string;
    allDay?: boolean;
  }) {
    const allDay = Boolean(selection?.allDay);
    setForm({
      title: "",
      type: "event",
      description: "",
      location: "",
      start_at: allDay
        ? toDateInputValue(selection?.start)
        : toLocalInputValue(selection?.start || new Date()),
      end_at: selection?.end
        ? allDay
          ? toDateInputValue(selection.end)
          : toLocalInputValue(selection.end)
        : "",
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

  async function handleEventDrop(info: EventDropArg | EventResizeDoneArg) {
    const item = info.event.extendedProps as CalendarItem;
    const newStart = info.event.start;
    const newEnd = info.event.end;

    if (!newStart || !profile?.company_id) return;

    const newDate = dateOnly(newStart.toISOString());

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
        await db
          .from("tasks")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "project") {
        await db
          .from("projects")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "proposal") {
        await db
          .from("proposals")
          .update({ valid_until: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "invoice") {
        await db
          .from("invoices")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "estimate") {
        await db
          .from("estimates")
          .update({ expiry_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "subscription") {
        await db
          .from("subscriptions")
          .update({ next_billing_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "contract") {
        await db
          .from("contracts")
          .update({ end_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "ticket") {
        await db
          .from("tickets")
          .update(
            item.id.startsWith("ticket-first-response-")
              ? { first_response_due_at: newStart.toISOString() }
              : { resolution_due_at: newStart.toISOString() },
          )
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
      }

      if (item.source === "payment") {
        const { error } = await db.rpc("reschedule_pending_payment", {
          p_payment_id: item.relatedId,
          p_payment_date: newDate,
        });

        if (error) throw error;
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

  useEffect(() => {
    const eventId = routeSearch.eventId;
    if (!eventId) return;
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    setSelectedEvent(event);
  }, [events, routeSearch.eventId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-56px)] bg-white p-4 md:p-6">
        <LoadingMetrics count={4} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] max-w-full overflow-x-hidden bg-white text-slate-950 md:p-5">
      <div className="mx-auto flex max-w-[1540px] min-w-0 flex-col">
        <section className="overflow-hidden bg-white">
          <div className="hidden border-b border-slate-100 bg-white px-1 pb-5 md:flex md:items-end md:justify-between md:gap-6">
            <div className="min-w-0">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                <CalendarDays className="h-4 w-4" />
                Calendario Corevix
              </div>
              <h1 className="capitalize text-[46px] font-light leading-none tracking-normal text-slate-950">
                {desktopMonthFormatter.format(desktopVisibleDate)}
              </h1>
              <p className="mt-2 text-sm font-normal text-slate-500">
                {CALENDAR_FILTER_OPTIONS.find((option) => option.value === filter)?.label ||
                  "Todos"}{" "}
                · {filteredEvents.length} elementos visibles
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 shadow-none hover:bg-slate-50"
                  >
                    <Filter className="h-4 w-4" />
                    Filtro
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  {CALENDAR_FILTER_OPTIONS.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => setFilter(option.value)}>
                      <span className={cn("h-2.5 w-2.5 rounded-full", DOT_STYLES[option.tone])} />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => openCreateModal()}
                className="h-9 gap-2 rounded-full bg-blue-600 px-4 text-sm font-normal text-white shadow-none hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Crear evento
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 min-w-0 gap-0 xl:min-h-[780px] xl:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="hidden min-w-0 overflow-y-auto border-r border-slate-100 bg-white p-4 md:block">
              <div className="min-w-0 space-y-5">
                <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-4">
                  <CalendarKpi label="Total" value={counters.total} />
                  <CalendarKpi label="Hoy" value={counters.today} tone="info" />
                  <CalendarKpi label="Semana" value={counters.week} tone="success" />
                  <CalendarKpi
                    label="Vencidos"
                    value={counters.overdue}
                    tone={counters.overdue > 0 ? "warning" : "success"}
                  />
                </div>

                <div className="relative border-b border-slate-100 pb-4">
                  <Search className="absolute left-0 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar..."
                    className="h-9 w-full rounded-none border-0 border-b border-slate-200 bg-white pl-7 pr-2 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-2 text-xs font-normal text-blue-600 hover:text-blue-700"
                    >
                      Limpiar busqueda
                    </button>
                  ) : null}
                </div>

                <div className="border-b border-slate-100 pb-4">
                  <p className="mb-2 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Filtros
                  </p>
                  <div className="space-y-1">
                    {CALENDAR_FILTER_OPTIONS.map(({ value, label, tone }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value as CalendarFilter)}
                        className={cn(
                          "flex min-w-0 items-center justify-between gap-2 border-b border-transparent px-0 py-2 text-sm font-normal transition hover:border-slate-200",
                          filter === value ? "text-slate-950" : "text-slate-500",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", DOT_STYLES[tone])} />
                          <span className="truncate">{label}</span>
                        </span>
                        {filter === value ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <DesktopMonthNavigator
                  year={desktopVisibleDate.getFullYear()}
                  month={desktopVisibleDate.getMonth()}
                  eventsByDay={filteredEventsByDay}
                  onChange={(date) => {
                    setDesktopVisibleDate(date);
                    setDesktopFocusDate(date);
                  }}
                />

                <div>
                  <p className="mb-3 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Próximos
                  </p>
                  {upcoming.length === 0 ? (
                    <p className="border-b border-slate-100 pb-3 text-sm font-normal text-slate-500">
                      No hay eventos próximos.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {upcoming.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="group w-full bg-white py-3 text-left transition hover:bg-slate-50/50"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                                DOT_STYLES[event.tone],
                              )}
                            />
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="truncate text-sm font-normal text-slate-950">
                                {event.title}
                              </p>
                              <p className="mt-1 text-[11px] font-normal uppercase tracking-wide text-slate-400">
                                {EVENT_TYPE_LABELS[event.source]}
                              </p>
                              <p className="mt-1 text-xs font-normal text-slate-500">
                                {formatDate(event.start)} ·{" "}
                                {event.allDay ? "Todo el día" : formatTime(event.start)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <main className="order-1 min-w-0 bg-white p-0 md:p-4 xl:order-none">
              {filteredEvents.length === 0 ? (
                <div className="mb-4 hidden md:block">
                  <EmptyState
                    icon={<CalendarClock className="h-6 w-6" />}
                    title="No hay eventos para este filtro"
                    description="Crea una cita, recordatorio o demo para verla en el calendario."
                  />
                </div>
              ) : null}

              <div className="h-[calc(100dvh-56px)] min-h-[520px] overflow-hidden border-b border-slate-100 bg-white md:h-[820px] md:border-y md:border-slate-100">
                {isMobile ? (
                  <MobileCalendarMonthView
                    events={events}
                    filter={filter}
                    search={search}
                    onFilterChange={setFilter}
                    onSearchChange={setSearch}
                    onEventClick={setSelectedEvent}
                    onCreate={() => openCreateModal()}
                  />
                ) : (
                  <CorevixCalendarView
                    events={events}
                    initialView="dayGridMonth"
                    height="100%"
                    filter={filter}
                    search={search}
                    focusDate={desktopFocusDate}
                    onFilterChange={setFilter}
                    onDatesSetChange={(arg) => setDesktopVisibleDate(arg.view.currentStart)}
                    onSelect={handleSelect}
                    onEventClick={handleEventClick}
                    onEventDrop={handleEventDrop}
                  />
                )}
              </div>
            </main>
          </div>
        </section>
      </div>

      <CrmCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nuevo evento"
        description="Programa una cita, demo, llamada o recordatorio dentro del CRM."
        size="sm"
      >
        <div className="space-y-5 sm:space-y-4">
          <div>
            <label className={`mb-1 block ${crmFormStyles.label}`}>Título</label>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className={crmFormStyles.input}
              placeholder="Ej: Demo CRM con Juan Pérez"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={`mb-1 block ${crmFormStyles.label}`}>Tipo</label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as FormType }))
                }
                className={`w-full ${crmFormStyles.select}`}
              >
                <option value="event">Evento</option>
                <option value="reminder">Recordatorio</option>
                <option value="call">Llamada</option>
                <option value="meeting">Reunión</option>
                <option value="demo">Demo</option>
                <option value="task">Tarea</option>
              </select>
            </div>

            <label className="flex items-center gap-3 border-b border-slate-200 py-3 text-base font-normal text-slate-700 sm:items-end sm:rounded-xl sm:border sm:px-3 sm:text-sm">
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    all_day: event.target.checked,
                    start_at: event.target.checked
                      ? toDateInputValue(prev.start_at)
                      : toLocalInputValue(prev.start_at),
                    end_at: prev.end_at
                      ? event.target.checked
                        ? toDateInputValue(prev.end_at)
                        : toLocalInputValue(prev.end_at)
                      : "",
                  }))
                }
              />
              Todo el día
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={`mb-1 block ${crmFormStyles.label}`}>Inicio</label>
              <input
                type={form.all_day ? "date" : "datetime-local"}
                value={form.start_at}
                onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
                className={crmFormStyles.input}
              />
            </div>
            <div>
              <label className={`mb-1 block ${crmFormStyles.label}`}>Fin</label>
              <input
                type={form.all_day ? "date" : "datetime-local"}
                value={form.end_at}
                onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
                className={crmFormStyles.input}
              />
            </div>
          </div>

          <div>
            <label className={`mb-1 block ${crmFormStyles.label}`}>Lugar</label>
            <input
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              className={crmFormStyles.input}
              placeholder="Oficina, Zoom, llamada, WhatsApp..."
            />
          </div>

          <div>
            <label className={`mb-1 block ${crmFormStyles.label}`}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className={`w-full ${crmFormStyles.textarea}`}
              placeholder="Notas internas del evento..."
            />
          </div>

          <div className={crmFormStyles.footer}>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className={crmFormStyles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={saving || !form.title.trim()}
              className={crmFormStyles.primaryButton}
            >
              {saving ? "Guardando..." : "Crear evento"}
            </Button>
          </div>
        </div>
      </CrmCreationDialog>

      <CalendarEventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
