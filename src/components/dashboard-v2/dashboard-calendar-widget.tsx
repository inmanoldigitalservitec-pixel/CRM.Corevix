import { useMemo, useState } from "react";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { CalendarDays, Clock, MapPin, X } from "lucide-react";

import { CorevixCalendarView } from "@/components/crm/corevix-calendar-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  EVENT_TYPE_LABELS,
  FORM_TYPE_LABELS,
  TONE_STYLES,
  formatDate,
  formatTime,
  fromInputValue,
  toDateInputValue,
  toLocalInputValue,
  type CalendarFilter,
  type CalendarItem,
  type FormType,
} from "@/lib/crm/calendar-items";
import type { DashboardWidgetMode } from "@/components/dashboard-builder";
import { DashboardCard } from "./dashboard-card";

type EventForm = {
  title: string;
  type: FormType;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
};

function emptyForm(selection?: {
  start?: Date | string;
  end?: Date | string;
  allDay?: boolean;
}): EventForm {
  const allDay = Boolean(selection?.allDay);

  return {
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
  };
}

function MiniCalendarWidget({ events }: { events: CalendarItem[] }) {
  const upcoming = events
    .filter((event) => {
      const status = String(event.status || "").toLowerCase();
      if (status.includes("complete") || status.includes("done") || status.includes("cancel"))
        return false;
      return event.start >= new Date().toISOString() || event.allDay;
    })
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const next = upcoming[0];

  return (
    <DashboardCard className="h-full" bodyClassName="p-4">
      <div className="flex h-full min-h-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-slate-500">
            Calendario
          </span>
          <strong className="mt-0.5 block truncate text-2xl font-semibold tracking-[-0.045em] text-slate-950">
            {upcoming.length}
          </strong>
          <small className="block truncate text-[11px] font-semibold text-blue-600">
            {next ? `${formatDate(next.start)} · ${next.title}` : "Sin eventos próximos"}
          </small>
        </div>
      </div>
    </DashboardCard>
  );
}

export function DashboardCalendarWidget({
  events,
  mode = "standard",
  onRefresh,
}: {
  events: CalendarItem[];
  mode?: DashboardWidgetMode;
  onRefresh?: () => void | Promise<void>;
}) {
  const { user, profile } = useAuth();
  // calendar_events exists in Supabase but is not present in the generated client types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventForm>(() => emptyForm());
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => String(a.start).localeCompare(String(b.start))),
    [events],
  );

  if (mode === "mini") return <MiniCalendarWidget events={sortedEvents} />;

  const refresh = async () => {
    await onRefresh?.();
  };

  const openCreateModal = (selection?: {
    start?: Date | string;
    end?: Date | string;
    allDay?: boolean;
  }) => {
    setForm(emptyForm(selection));
    setCreateOpen(true);
  };

  const handleCreateEvent = async () => {
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
      metadata: { created_from: "dashboard_calendar_widget" },
    });

    if (!error) {
      await db.from("notifications").insert({
        company_id: profile.company_id,
        user_id: user.id,
        title: `${FORM_TYPE_LABELS[form.type]} creado`,
        message: `${form.title.trim()} quedó en el calendario.`,
        type: "calendar",
        link: "/calendar",
        read: false,
      });
      setCreateOpen(false);
      await refresh();
    }

    setSaving(false);
  };

  const handleEventDrop = async (info: EventDropArg | EventResizeDoneArg) => {
    const item = info.event.extendedProps as CalendarItem;
    const newStart = info.event.start;
    const newEnd = info.event.end;

    if (!newStart || !profile?.company_id) return;

    const newDate = newStart.toISOString().slice(0, 10);

    try {
      if (item.source === "calendar_event") {
        const { error } = await db
          .from("calendar_events")
          .update({
            start_at: newStart.toISOString(),
            end_at: newEnd ? newEnd.toISOString() : null,
          })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      }

      if (item.source === "task") {
        const { error } = await db
          .from("tasks")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      }

      if (item.source === "project") {
        const { error } = await db
          .from("projects")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      }

      if (item.source === "proposal") {
        const { error } = await db
          .from("proposals")
          .update({ valid_until: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      }

      if (item.source === "invoice") {
        const { error } = await db
          .from("invoices")
          .update({ due_date: newDate })
          .eq("id", item.relatedId)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      }

      await refresh();
    } catch {
      info.revert();
    }
  };

  return (
    <>
      <DashboardCard className="h-full rounded-[12px]" bodyClassName="p-0">
        <CorevixCalendarView
          events={sortedEvents}
          initialView="dayGridMonth"
          height="100%"
          editable
          selectable
          filter={filter}
          onFilterChange={setFilter}
          onExpand={() => {
            window.location.href = "/calendar";
          }}
          onSelect={(selection: DateSelectArg) =>
            openCreateModal({
              start: selection.start,
              end: selection.end,
              allDay: selection.allDay,
            })
          }
          onEventClick={(info: EventClickArg) =>
            setSelectedEvent(info.event.extendedProps as CalendarItem)
          }
          onEventDrop={handleEventDrop}
        />
      </DashboardCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl rounded-3xl border-0 p-0 shadow-2xl">
          <div className="border-b bg-gradient-to-r from-white to-blue-50 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-[-0.03em]">
                Crear evento
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-sm font-semibold text-[#667085]">
              Programa una cita, demo, llamada o recordatorio dentro del CRM.
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                Título
              </Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="h-12 rounded-2xl border-[#e5eaf2] bg-[#fbfcff] text-sm font-semibold"
                placeholder="Ej: Demo CRM con Juan Pérez"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                  Tipo
                </Label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value as FormType }))
                  }
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
                <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                  Inicio
                </Label>
                <Input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.start_at}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, start_at: event.target.value }))
                  }
                  className="h-12 rounded-2xl border-[#e5eaf2] bg-[#fbfcff] text-sm font-bold"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                  Fin
                </Label>
                <Input
                  type={form.all_day ? "date" : "datetime-local"}
                  value={form.end_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
                  className="h-12 rounded-2xl border-[#e5eaf2] bg-[#fbfcff] text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                Lugar
              </Label>
              <Input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="h-12 rounded-2xl border-[#e5eaf2] bg-[#fbfcff] text-sm font-semibold"
                placeholder="Oficina, Zoom, llamada, WhatsApp..."
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#667085]">
                Descripción
              </Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="min-h-24 resize-none rounded-2xl border-[#e5eaf2] bg-[#fbfcff] text-sm font-semibold"
                placeholder="Notas internas del evento..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-2xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateEvent}
                disabled={saving || !form.title.trim()}
                className="rounded-2xl bg-[#111827] font-black"
              >
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
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-xl p-1 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogTitle>
            </DialogHeader>
          </div>

          {selectedEvent ? (
            <div className="space-y-4 p-6">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${TONE_STYLES[selectedEvent.tone]}`}
              >
                {EVENT_TYPE_LABELS[selectedEvent.source]}
              </span>

              <div>
                <p className="text-xl font-black tracking-[-0.03em]">{selectedEvent.title}</p>
                {selectedEvent.context ? (
                  <p className="mt-2 text-sm font-bold text-[#667085]">{selectedEvent.context}</p>
                ) : null}
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#667085]">
                  <Clock className="h-4 w-4" />
                  {formatDate(selectedEvent.start)} ·{" "}
                  {selectedEvent.allDay ? "Todo el día" : formatTime(selectedEvent.start)}
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

              <div className="flex justify-end">
                <Button asChild className="rounded-2xl bg-[#111827] font-black hover:bg-[#020617]">
                  <a href={selectedEvent.href}>Abrir módulo relacionado</a>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
