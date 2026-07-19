import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Filter, Plus } from "lucide-react";

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
  dateOnly,
  filterCalendarItems,
  type CalendarFilter,
  type CalendarItem,
} from "@/lib/crm/calendar-items";

const monthFormatter = new Intl.DateTimeFormat("es", { month: "long" });
const shortMonthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
const yearFormatter = new Intl.DateTimeFormat("es", { year: "numeric" });
const weekdayLabels = ["D", "L", "M", "M", "J", "V", "S"];

const eventToneClasses: Record<CalendarItem["tone"], string> = {
  blue: "bg-blue-100 text-blue-900",
  violet: "bg-violet-100 text-violet-900",
  amber: "bg-amber-100 text-amber-900",
  sky: "bg-sky-100 text-sky-900",
  emerald: "bg-emerald-100 text-emerald-900",
  orange: "bg-orange-100 text-orange-900",
  slate: "bg-slate-100 text-slate-900",
};

export function MobileCalendarMonthView({
  events,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onEventClick,
  onCreate,
}: {
  events: CalendarItem[];
  filter: CalendarFilter;
  search: string;
  onFilterChange: (filter: CalendarFilter) => void;
  onSearchChange: (search: string) => void;
  onEventClick: (event: CalendarItem) => void;
  onCreate: () => void;
}) {
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const filteredEvents = useMemo(
    () => filterCalendarItems(events, filter, search),
    [events, filter, search],
  );

  const todayKey = dateOnly(new Date().toISOString());
  const visibleYear = visibleDate.getFullYear();
  const visibleMonth = visibleDate.getMonth();
  const monthTitle = monthFormatter.format(visibleDate);
  const yearTitle = yearFormatter.format(visibleDate);
  const activeFilter = CALENDAR_FILTER_OPTIONS.find((option) => option.value === filter);
  const monthWindow = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => new Date(visibleYear, visibleMonth - 2 + index, 1)),
    [visibleMonth, visibleYear],
  );
  const yearWindow = useMemo(
    () => Array.from({ length: 5 }, (_, index) => visibleYear - 2 + index),
    [visibleYear],
  );

  const eventsByDay = useMemo(() => {
    return filteredEvents.reduce<Record<string, CalendarItem[]>>((acc, event) => {
      const key = dateOnly(event.start);
      acc[key] = acc[key] ? [...acc[key], event] : [event];
      return acc;
    }, {});
  }, [filteredEvents]);

  const selectMonth = (year: number, month: number) => {
    setVisibleDate(new Date(year, month, 1));
    setViewMode("month");
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setViewMode((current) => (current === "year" ? "month" : "year"))}
            className="h-12 rounded-full bg-white px-3 text-lg font-light"
          >
            {viewMode === "year" ? <ChevronLeft className="h-6 w-6" /> : null}
            {yearTitle}
          </Button>

          <div className="flex items-center gap-2 rounded-full bg-white p-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label="Filtrar calendario"
                >
                  <Filter className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                {CALENDAR_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onFilterChange(option.value)}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", DOT_STYLES[option.tone])} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCreate}
              className="h-10 w-10 rounded-full"
              aria-label="Crear evento"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={cn(
                "capitalize leading-none tracking-normal",
                viewMode === "year"
                  ? "text-[54px] font-light text-red-500"
                  : "text-[38px] font-light text-black",
              )}
            >
              {viewMode === "year" ? yearTitle : monthTitle}
            </h2>
            <p className="mt-2 text-xs font-light uppercase tracking-wide text-slate-400">
              {viewMode === "year"
                ? "Selecciona un mes"
                : `${activeFilter?.label || "Todos"} · ${filteredEvents.length} elementos`}
            </p>
          </div>
        </div>

        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="mt-4 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-light text-blue-700"
          >
            Limpiar filtro de busqueda
          </button>
        ) : null}
      </div>

      {viewMode === "year" ? (
        <YearPickerView
          years={yearWindow}
          visibleYear={visibleYear}
          visibleMonth={visibleMonth}
          todayKey={todayKey}
          eventsByDay={eventsByDay}
          onShiftYear={(offset) =>
            setVisibleDate((current) => new Date(current.getFullYear() + offset, 0, 1))
          }
          onSelectMonth={selectMonth}
        />
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-7 border-b border-slate-200 bg-white">
            {weekdayLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="py-2 text-center text-sm font-light text-slate-400"
              >
                {label}
              </div>
            ))}
          </div>
          <MonthScrollView
            months={monthWindow}
            visibleYear={visibleYear}
            visibleMonth={visibleMonth}
            todayKey={todayKey}
            eventsByDay={eventsByDay}
            onShiftMonth={(offset) =>
              setVisibleDate(
                (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
              )
            }
            onEventClick={onEventClick}
          />
        </>
      )}
    </div>
  );
}

function MonthScrollView({
  months,
  visibleYear,
  visibleMonth,
  todayKey,
  eventsByDay,
  onShiftMonth,
  onEventClick,
}: {
  months: Date[];
  visibleYear: number;
  visibleMonth: number;
  todayKey: string;
  eventsByDay: Record<string, CalendarItem[]>;
  onShiftMonth: (offset: number) => void;
  onEventClick: (event: CalendarItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);
  const activeKey = `${visibleYear}-${visibleMonth}`;

  useEffect(() => {
    const element = scrollRef.current;
    const activeMonth = element?.querySelector<HTMLElement>(`[data-month-key="${activeKey}"]`);
    if (!element || !activeMonth) return;

    element.scrollTop = activeMonth.offsetTop;
  }, [activeKey]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || lockRef.current) return;

    const nearTop = element.scrollTop < 80;
    const nearBottom = element.scrollTop + element.clientHeight > element.scrollHeight - 80;
    if (!nearTop && !nearBottom) return;

    lockRef.current = true;
    onShiftMonth(nearTop ? -1 : 1);
    window.requestAnimationFrame(() => {
      lockRef.current = false;
    });
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-white"
    >
      <div className="space-y-6">
        {months.map((monthDate) => (
          <section
            key={monthDate.toISOString()}
            data-month-key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
            className="min-w-0 border-b border-slate-200 bg-white"
          >
            <h3 className="px-4 pb-3 pt-5 capitalize text-[30px] font-light leading-none text-slate-500">
              {monthFormatter.format(monthDate)}
            </h3>
            <MonthGrid
              monthDate={monthDate}
              todayKey={todayKey}
              eventsByDay={eventsByDay}
              onEventClick={onEventClick}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  monthDate,
  todayKey,
  eventsByDay,
  onEventClick,
}: {
  monthDate: Date;
  todayKey: string;
  eventsByDay: Record<string, CalendarItem[]>;
  onEventClick: (event: CalendarItem) => void;
}) {
  const monthYear = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const days = useMemo(() => {
    const firstOfMonth = new Date(monthYear, month, 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month, monthYear]);

  return (
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const key = dateOnly(day.toISOString());
        const dayEvents = eventsByDay[key] || [];
        const visibleEvents = dayEvents.slice(0, 2);
        const hiddenCount = Math.max(0, dayEvents.length - visibleEvents.length);
        const isToday = key === todayKey;
        const isCurrentMonth = day.getMonth() === month;

        return (
          <div key={key} className="min-h-[104px] min-w-0 border-t border-slate-200 px-1.5 py-2">
            <div
              className={cn(
                "mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full text-[18px] font-light leading-none",
                isToday
                  ? "bg-red-500 text-white"
                  : isCurrentMonth
                    ? "text-black"
                    : "text-slate-400",
              )}
            >
              {day.getDate()}
            </div>

            <div className="space-y-1">
              {visibleEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "block h-6 w-full truncate rounded-md px-1.5 text-left text-[11px] font-light leading-6",
                    eventToneClasses[event.tone],
                  )}
                >
                  {event.title}
                </button>
              ))}
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onEventClick(dayEvents[2])}
                  className="h-5 w-full text-center text-xs font-light text-slate-400"
                >
                  +{hiddenCount}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearPickerView({
  years,
  visibleYear,
  visibleMonth,
  todayKey,
  eventsByDay,
  onShiftYear,
  onSelectMonth,
}: {
  years: number[];
  visibleYear: number;
  visibleMonth: number;
  todayKey: string;
  eventsByDay: Record<string, CalendarItem[]>;
  onShiftYear: (offset: number) => void;
  onSelectMonth: (year: number, month: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || lockRef.current) return;

    const nearTop = element.scrollTop < 80;
    const nearBottom = element.scrollTop + element.clientHeight > element.scrollHeight - 80;
    if (!nearTop && !nearBottom) return;

    lockRef.current = true;
    onShiftYear(nearTop ? -1 : 1);
    window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop =
          scrollRef.current.scrollHeight / 2 - scrollRef.current.clientHeight / 2;
      }
      lockRef.current = false;
    });
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4"
    >
      <div className="space-y-10">
        {years.map((year) => (
          <section key={year} className="min-w-0 border-b border-slate-100 pb-8 last:border-b-0">
            <h3
              className={cn(
                "mb-5 text-[44px] font-light leading-none tracking-normal",
                year === visibleYear ? "text-red-500" : "text-slate-300",
              )}
            >
              {year}
            </h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-9">
              {Array.from({ length: 12 }, (_, month) => {
                const monthDate = new Date(year, month, 1);
                const isActiveMonth = year === visibleYear && month === visibleMonth;

                return (
                  <button
                    key={monthDate.toISOString()}
                    type="button"
                    onClick={() => onSelectMonth(year, month)}
                    className="min-w-0 overflow-hidden text-left"
                  >
                    <h4
                      className={cn(
                        "mb-2 text-[22px] font-light leading-none tracking-normal",
                        isActiveMonth ? "text-red-500" : "text-black",
                      )}
                    >
                      {shortMonthFormatter.format(monthDate)}
                    </h4>
                    <MiniMonth
                      monthDate={monthDate}
                      todayKey={todayKey}
                      eventsByDay={eventsByDay}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MiniMonth({
  monthDate,
  todayKey,
  eventsByDay,
}: {
  monthDate: Date;
  todayKey: string;
  eventsByDay: Record<string, CalendarItem[]>;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstOfMonth.getDay();
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="grid w-full grid-cols-7 gap-y-1 text-center">
      {cells.map((day, index) => {
        if (!day) return <span key={`blank-${index}`} className="h-3.5" />;

        const key = dateOnly(new Date(year, month, day).toISOString());
        const hasEvents = Boolean(eventsByDay[key]?.length);
        const isToday = key === todayKey;

        return (
          <span
            key={key}
            className={cn(
              "relative mx-auto grid h-3.5 w-3.5 place-items-center rounded-full text-[10px] font-light leading-none text-black",
              isToday && "bg-red-500 text-white",
            )}
          >
            {day}
            {hasEvents && !isToday ? (
              <span className="absolute -bottom-1 h-0.5 w-0.5 rounded-full bg-blue-500" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
