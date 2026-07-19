import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CALENDAR_FILTER_OPTIONS,
  DOT_STYLES,
  EVENT_TYPE_LABELS,
  filterCalendarItems,
  type CalendarFilter,
  type CalendarItem,
} from "@/lib/crm/calendar-items";

type CalendarViewName = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const viewLabels: Record<CalendarViewName, string> = {
  dayGridMonth: "Mes",
  timeGridWeek: "Semana",
  timeGridDay: "Día",
};

export function CorevixCalendarView({
  events,
  initialView = "dayGridMonth",
  height = "100%",
  compact = false,
  editable = true,
  selectable = true,
  filter = "all",
  search = "",
  focusDate,
  onFilterChange,
  onExpand,
  onDatesSetChange,
  onSelect,
  onEventClick,
  onEventDrop,
}: {
  events: CalendarItem[];
  initialView?: CalendarViewName;
  height?: number | string;
  compact?: boolean;
  editable?: boolean;
  selectable?: boolean;
  filter?: CalendarFilter;
  search?: string;
  focusDate?: Date | string | null;
  onFilterChange?: (filter: CalendarFilter) => void;
  onExpand?: () => void;
  onDatesSetChange?: (arg: DatesSetArg) => void;
  onSelect?: (selection: DateSelectArg) => void;
  onEventClick?: (info: EventClickArg) => void;
  onEventDrop?: (info: EventDropArg | EventResizeDoneArg) => void;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [title, setTitle] = useState("");
  const [activeView, setActiveView] = useState<CalendarViewName>(initialView);
  const activeFilter = CALENDAR_FILTER_OPTIONS.find((option) => option.value === filter);
  const filteredEvents = useMemo(
    () => filterCalendarItems(events, filter, search),
    [events, filter, search],
  );
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

  const calendarApi = () => calendarRef.current?.getApi();
  const changeView = (view: CalendarViewName) => {
    calendarApi()?.changeView(view);
    setActiveView(view);
  };
  const handleDatesSet = (arg: DatesSetArg) => {
    setTitle(arg.view.title);
    setActiveView(arg.view.type as CalendarViewName);
    onDatesSetChange?.(arg);
  };

  useEffect(() => {
    const api = calendarApi();
    if (!api || api.view.type === initialView) return;
    api.changeView(initialView);
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!focusDate) return;
    const api = calendarApi();
    if (!api) return;
    api.gotoDate(focusDate);
  }, [focusDate]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;

    let frame: number | null = null;
    const updateCalendarSize = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        calendarRef.current?.getApi().updateSize();
        frame = null;
      });
    };
    const resizeObserver = new ResizeObserver(updateCalendarSize);

    resizeObserver.observe(element);
    updateCalendarSize();

    return () => {
      resizeObserver.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={cn(
        "corevix-calendar-shell h-full min-h-0 overflow-hidden bg-white",
        compact && "compact",
      )}
    >
      <div className="corevix-calendar-toolbar">
        <div className="corevix-calendar-toolbar-group">
          <Button
            type="button"
            size="icon"
            className="corevix-calendar-button"
            onClick={() => calendarApi()?.prev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="corevix-calendar-button"
            onClick={() => calendarApi()?.next()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            className="corevix-calendar-button text-button"
            onClick={() => calendarApi()?.today()}
          >
            Hoy
          </Button>
          {onExpand ? (
            <Button
              type="button"
              className="corevix-calendar-button text-button expand-button"
              onClick={onExpand}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="expand-label">Expand</span>
            </Button>
          ) : null}
        </div>

        <h2 className="corevix-calendar-title">{title}</h2>

        <div className="corevix-calendar-toolbar-group right">
          {(Object.keys(viewLabels) as CalendarViewName[]).map((view) => (
            <Button
              key={view}
              type="button"
              className={cn("corevix-calendar-button text-button", activeView === view && "active")}
              onClick={() => changeView(view)}
            >
              {viewLabels[view]}
            </Button>
          ))}

          {onFilterChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" className="corevix-calendar-button text-button filter-button">
                  {activeFilter?.label || "Filtro"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {CALENDAR_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onFilterChange(option.value)}
                  >
                    <span
                      className={cn("mr-2 h-2.5 w-2.5 rounded-full", DOT_STYLES[option.tone])}
                    />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="corevix-calendar-body">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={initialView}
          locale="es"
          timeZone="local"
          height={height}
          nowIndicator
          selectable={selectable}
          editable={editable}
          eventStartEditable={editable}
          eventDurationEditable={editable}
          selectMirror
          weekends
          slotMinTime="06:00:00"
          slotMaxTime="23:59:00"
          allDayText="Todo el día"
          headerToolbar={false}
          buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
          events={fullCalendarEvents}
          datesSet={handleDatesSet}
          select={onSelect}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          eventResize={onEventDrop}
          eventContent={(arg) => {
            const item = arg.event.extendedProps as CalendarItem;
            return (
              <div className={cn("corevix-calendar-event", `calendar-tone-${item.tone}`)}>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "corevix-calendar-event-dot h-1.5 w-1.5 shrink-0 rounded-full",
                      DOT_STYLES[item.tone],
                    )}
                  />
                  <span className="corevix-calendar-event-title truncate">{arg.event.title}</span>
                </div>
                {!compact ? (
                  <div className="corevix-calendar-event-type truncate text-[10px] font-normal">
                    {EVENT_TYPE_LABELS[item.source]}
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>

      <style>{`
        .corevix-calendar-shell .fc {
          --fc-border-color: #eef2f7;
          --fc-today-bg-color: rgba(15, 23, 42, 0.035);
          --fc-now-indicator-color: #ef4444;
          font-family: inherit;
        }

        .corevix-calendar-toolbar {
          align-items: center;
          display: grid;
          grid-template-columns: minmax(0, auto) minmax(120px, 1fr) minmax(0, auto);
          gap: 12px;
          padding: 10px 14px 8px;
        }

        .corevix-calendar-toolbar-group {
          align-items: center;
          display: flex;
          gap: 6px;
          min-width: 0;
        }

        .corevix-calendar-toolbar-group.right {
          justify-content: flex-end;
        }

        .corevix-calendar-title {
          color: #111827;
          font-size: 21px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.1;
          min-width: 0;
          overflow: hidden;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .corevix-calendar-button {
          background: transparent !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 999px !important;
          box-shadow: none !important;
          color: #475569 !important;
          font-size: 12px !important;
          font-weight: 400 !important;
          height: 30px !important;
          width: 30px !important;
        }

        .corevix-calendar-button:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #111827 !important;
        }

        .corevix-calendar-button.text-button {
          gap: 5px;
          min-width: 56px;
          padding: 0 10px !important;
          width: auto !important;
        }

        .corevix-calendar-button.active {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }

        .corevix-calendar-button.filter-button {
          max-width: 112px;
        }

        .corevix-calendar-button.filter-button,
        .corevix-calendar-button.expand-button {
          white-space: nowrap;
        }

        .corevix-calendar-body {
          height: calc(100% - 50px);
          min-height: 0;
          overflow: hidden;
          padding: 0 16px 16px;
        }

        .corevix-calendar-shell .fc-scrollgrid {
          border-color: #eef2f7 !important;
          border-radius: 0;
          overflow: hidden;
        }

        .corevix-calendar-shell .fc-col-header-cell {
          background: #fff;
          padding: 7px 0;
        }

        .corevix-calendar-shell .fc-col-header-cell-cushion,
        .corevix-calendar-shell .fc-daygrid-day-number {
          color: #475569;
          font-size: 13px;
          font-weight: 300;
          text-decoration: none;
        }

        .corevix-calendar-shell .fc-daygrid-day-number {
          color: #a0a9b6;
          padding: 8px;
        }

        .corevix-calendar-shell .fc-day-today .fc-daygrid-day-number {
          align-items: center;
          background: #ef4444;
          border-radius: 999px;
          color: #fff;
          display: inline-flex;
          height: 24px;
          justify-content: center;
          margin: 5px;
          padding: 0;
          width: 24px;
        }

        .corevix-calendar-shell .fc-daygrid-day-frame {
          padding: 1px;
        }

        .corevix-calendar-shell .fc-timegrid-slot-label-cushion,
        .corevix-calendar-shell .fc-timegrid-axis-cushion,
        .corevix-calendar-shell .fc-timegrid-slot-label {
          color: #9ca3af;
          font-size: 11px;
          font-weight: 300;
        }

        .corevix-calendar-shell .fc-event {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          cursor: pointer;
        }

        .corevix-calendar-shell .fc-event-main {
          color: inherit !important;
        }

        .corevix-calendar-event {
          background: #dbeafe !important;
          border: 0 !important;
          border-radius: 6px;
          box-shadow: none;
          color: #1e3a8a !important;
          font-size: 12px;
          font-weight: 300;
          line-height: 1.25;
          min-height: 34px;
          overflow: hidden;
          padding: 6px 9px;
          width: 100%;
        }

        .corevix-calendar-event-title {
          color: inherit;
          font-weight: 300;
        }

        .corevix-calendar-event-type {
          color: inherit;
          font-size: 11px;
          font-weight: 300;
          opacity: 0.86;
        }

        .corevix-calendar-event.calendar-tone-blue {
          background: #dbeafe !important;
          color: #1e3a8a !important;
        }

        .corevix-calendar-event.calendar-tone-violet {
          background: #ede9fe !important;
          color: #4c1d95 !important;
        }

        .corevix-calendar-event.calendar-tone-amber,
        .corevix-calendar-event.calendar-tone-orange {
          background: #ffedd5 !important;
          color: #9a3412 !important;
        }

        .corevix-calendar-event.calendar-tone-sky {
          background: #e0f2fe !important;
          color: #075985 !important;
        }

        .corevix-calendar-event.calendar-tone-emerald {
          background: #d1fae5 !important;
          color: #065f46 !important;
        }

        .corevix-calendar-event.calendar-tone-slate {
          background: #f1f5f9 !important;
          color: #334155 !important;
        }

        .corevix-calendar-event .corevix-calendar-event-dot {
          opacity: 1;
        }

        .corevix-calendar-shell .fc-highlight {
          background: rgba(37, 99, 235, 0.12) !important;
          border-radius: 8px;
        }

        .corevix-calendar-shell.compact .corevix-calendar-toolbar {
          gap: 7px;
          grid-template-columns: minmax(0, 1fr);
          padding: 8px 10px 7px;
        }

        .corevix-calendar-shell.compact .corevix-calendar-title {
          font-size: 18px;
          font-weight: 600;
          order: -1;
        }

        .corevix-calendar-shell.compact .corevix-calendar-toolbar-group {
          flex-wrap: wrap;
          justify-content: center;
        }

        .corevix-calendar-shell.compact .corevix-calendar-button {
          height: 28px !important;
          width: 28px !important;
        }

        .corevix-calendar-shell.compact .corevix-calendar-button.text-button {
          min-width: 54px;
          padding: 0 8px !important;
          width: auto !important;
        }

        .corevix-calendar-shell.compact .expand-button {
          min-width: 30px;
          padding: 0 !important;
          width: 30px !important;
        }

        .corevix-calendar-shell.compact .expand-label {
          display: none;
        }

        .corevix-calendar-shell.compact .filter-button {
          max-width: 88px;
        }

        .corevix-calendar-shell.compact .corevix-calendar-body {
          height: calc(100% - 94px);
          padding: 0 10px 10px;
        }

        .corevix-calendar-shell.compact .fc-col-header-cell-cushion,
        .corevix-calendar-shell.compact .fc-daygrid-day-number {
          font-size: 10.5px;
          font-weight: 500;
        }

        .corevix-calendar-shell.compact .corevix-calendar-event {
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 500;
          min-height: 32px;
          padding: 6px 8px;
        }

        .corevix-calendar-shell.compact .corevix-calendar-event-type {
          display: none;
        }

        @media (max-width: 900px) {
          .corevix-calendar-toolbar {
            grid-template-columns: minmax(0, 1fr);
          }

          .corevix-calendar-title {
            font-size: 20px;
            order: -1;
          }

          .corevix-calendar-toolbar-group,
          .corevix-calendar-toolbar-group.right {
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        @media (max-width: 760px) {
          .corevix-calendar-shell {
            border-radius: 0;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            width: 100%;
          }

          .corevix-calendar-toolbar {
            border-bottom: 1px solid #dbeafe;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 9px 10px;
            width: 100%;
          }

          .corevix-calendar-title {
            flex: 0 0 100%;
            color: #0f172a;
            font-size: 17px;
            font-weight: 700;
            line-height: 1.2;
            order: -1;
            padding: 0 8px;
            text-align: center;
            width: 100%;
          }

          .corevix-calendar-toolbar-group,
          .corevix-calendar-toolbar-group.right {
            flex: 1 1 calc(50% - 4px);
            gap: 6px;
            min-width: 0;
          }

          .corevix-calendar-toolbar-group.right {
            justify-content: flex-end;
            overflow-x: auto;
            padding-bottom: 1px;
          }

          .corevix-calendar-button {
            border-color: #bfdbfe !important;
            border-radius: 8px !important;
            color: #334155 !important;
            height: 32px !important;
            min-width: 32px;
            width: 32px !important;
          }

          .corevix-calendar-button.text-button {
            min-width: 54px;
            padding: 0 10px !important;
          }

          .corevix-calendar-button.active {
            background: #eff6ff !important;
            border-color: #93c5fd !important;
            color: #1d4ed8 !important;
          }

          .corevix-calendar-button.expand-button {
            min-width: 32px;
            padding: 0 !important;
            width: 32px !important;
          }

          .corevix-calendar-button.expand-button .expand-label {
            display: none;
          }

          .corevix-calendar-button.filter-button {
            max-width: 110px;
          }

          .corevix-calendar-body {
            height: calc(100% - 122px);
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            padding: 0;
            width: 100%;
          }

          .corevix-calendar-shell .fc {
            max-width: 100%;
            min-width: 0;
            width: 100% !important;
          }

          .corevix-calendar-shell .fc-view-harness,
          .corevix-calendar-shell .fc-view-harness-active {
            max-width: 100%;
            min-width: 0;
            width: 100% !important;
          }

          .corevix-calendar-shell .fc-scrollgrid {
            border-left: 0 !important;
            border-radius: 0;
            border-right: 0 !important;
          }

          .corevix-calendar-shell .fc-col-header-cell {
            background: #ffffff;
            padding: 6px 0;
          }

          .corevix-calendar-shell .fc-timegrid-slot-label-cushion,
          .corevix-calendar-shell .fc-timegrid-axis-cushion,
          .corevix-calendar-shell .fc-timegrid-slot-label {
            color: #64748b;
            font-size: 10px;
          }

          .corevix-calendar-event {
            border-radius: 7px;
            font-size: 11.5px;
            min-height: 28px;
            padding: 5px 7px;
          }

          .corevix-calendar-event-type {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
