import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  max as maxDate,
  min as minDate,
  startOfDay,
  subDays,
} from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Diamond,
  GanttChartSquare,
  ListFilter,
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  isClosedTaskStatusValue,
  isDoneTaskStatusValue,
  isInProgressTaskStatusValue,
  normalizeStatus,
} from "@/lib/crm/status";
import { cn } from "@/lib/utils";

type ProjectGanttProject = {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  start_date: string | null;
  due_date: string | null;
};

type ProjectGanttTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
};

type ProjectMilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: "planned" | "in_progress" | "completed" | "blocked" | "cancelled" | string;
  progress_pct: number | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string | null;
};

type TimelineFilter = "all" | "tasks" | "milestones" | "pending" | "overdue";
type TimelineScale = "week" | "month";

type TimelineItem = {
  id: string;
  type: "task" | "milestone";
  title: string;
  description: string | null;
  status: string;
  date: Date | null;
  rawDate: string | null;
  isClosed: boolean;
  isDone: boolean;
  isInProgress: boolean;
  isOverdue: boolean;
  progress: number | null;
};

const FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "tasks", label: "Tareas" },
  { value: "milestones", label: "Hitos" },
  { value: "pending", label: "Pendientes" },
  { value: "overdue", label: "Vencidos" },
];

const STATUS_LABELS: Record<string, string> = {
  not_started: "No iniciado",
  in_progress: "En progreso",
  on_hold: "En pausa",
  completed: "Completado",
  done: "Completado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  to_do: "Por hacer",
  planned: "Planificado",
  blocked: "Bloqueado",
};

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(date: Date | null) {
  if (!date) return "Sin fecha";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function statusLabel(status: string) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] ?? status;
}

function isCompletedMilestone(status: string) {
  return normalizeStatus(status) === "completed";
}

function isClosedMilestone(status: string) {
  const normalized = normalizeStatus(status);
  return normalized === "completed" || normalized === "cancelled" || normalized === "canceled";
}

function getItemTone(item: TimelineItem) {
  if (item.isOverdue) return "border-rose-200 bg-rose-50 text-rose-700";
  if (item.isDone) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalizeStatus(item.status) === "blocked")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (item.isInProgress) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-white text-slate-600";
}

function buildDays(start: Date, end: Date) {
  const count = Math.max(0, differenceInCalendarDays(end, start));
  return Array.from({ length: count + 1 }, (_, index) => addDays(start, index));
}

function clampProgress(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value || 0)));
}

export function ProjectGanttPanel({
  project,
  tasks,
}: {
  project: ProjectGanttProject;
  tasks: ProjectGanttTask[];
}) {
  const { profile } = useAuth();
  const [milestones, setMilestones] = useState<ProjectMilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [scale, setScale] = useState<TimelineScale>("week");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  const loadMilestones = useCallback(async () => {
    if (!profile?.company_id) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("project_milestones")
      .select(
        "id,title,description,target_date,status,progress_pct,sort_order,created_at,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("project_id", project.id)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los hitos del proyecto.");
      setMilestones([]);
      setLoading(false);
      return;
    }

    setMilestones((data || []) as ProjectMilestoneRow[]);
    setLoading(false);
  }, [profile?.company_id, project.id]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const projectStart = parseLocalDate(project.start_date);
  const projectDue = parseLocalDate(project.due_date);
  const projectHasWindow = Boolean(projectStart && projectDue);
  const projectProgress = clampProgress(project.progress);

  const allItems = useMemo<TimelineItem[]>(() => {
    const taskItems = tasks.map((task) => {
      const date = parseLocalDate(task.due_date);
      const closed = isClosedTaskStatusValue(task.status);
      const done = isDoneTaskStatusValue(task.status);
      return {
        id: task.id,
        type: "task" as const,
        title: task.title,
        description: task.description,
        status: task.status,
        date,
        rawDate: task.due_date,
        isClosed: closed,
        isDone: done,
        isInProgress: isInProgressTaskStatusValue(task.status),
        isOverdue: Boolean(date && isBefore(date, today) && !closed),
        progress: null,
      };
    });

    const milestoneItems = milestones.map((milestone) => {
      const date = parseLocalDate(milestone.target_date);
      const closed = isClosedMilestone(milestone.status);
      const done = isCompletedMilestone(milestone.status);
      return {
        id: milestone.id,
        type: "milestone" as const,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        date,
        rawDate: milestone.target_date,
        isClosed: closed,
        isDone: done,
        isInProgress: normalizeStatus(milestone.status) === "in_progress",
        isOverdue: Boolean(date && isBefore(date, today) && !closed),
        progress: milestone.progress_pct,
      };
    });

    return [...milestoneItems, ...taskItems].sort((a, b) => {
      if (a.date && b.date) return a.date.getTime() - b.date.getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [milestones, tasks, today]);

  const visibleItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filter === "tasks") return item.type === "task";
      if (filter === "milestones") return item.type === "milestone";
      if (filter === "pending") return !item.isClosed;
      if (filter === "overdue") return item.isOverdue;
      return true;
    });
  }, [allItems, filter]);

  const datedItems = visibleItems.filter((item) => item.date);
  const unscheduledItems = visibleItems.filter((item) => !item.date);

  const { days, timelineStart, timelineEnd } = useMemo(() => {
    const dates = [today, projectStart, projectDue, ...allItems.map((item) => item.date)].filter(
      Boolean,
    ) as Date[];
    const baseStart = subDays(minDate(dates), 2);
    let baseEnd = addDays(maxDate(dates), 2);

    if (differenceInCalendarDays(baseEnd, baseStart) < 20) {
      baseEnd = addDays(baseStart, 20);
    }

    return {
      days: buildDays(baseStart, baseEnd),
      timelineStart: baseStart,
      timelineEnd: baseEnd,
    };
  }, [allItems, projectDue, projectStart, today]);

  const dayWidth = scale === "week" ? 54 : 36;
  const labelWidth = 260;
  const gridWidth = labelWidth + days.length * dayWidth;
  const todayOffset = differenceInCalendarDays(today, timelineStart) * dayWidth + dayWidth / 2;
  const showToday = today >= timelineStart && today <= timelineEnd;

  const scrollToToday = () => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({
      left: Math.max(0, todayOffset - scrollerRef.current.clientWidth / 2),
      behavior: "smooth",
    });
  };

  const groupedMobileItems = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    datedItems.forEach((item) => {
      if (!item.date) return;
      const key = format(item.date, "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [datedItems]);

  const counts = useMemo(
    () => ({
      tasks: allItems.filter((item) => item.type === "task").length,
      milestones: allItems.filter((item) => item.type === "milestone").length,
      overdue: allItems.filter((item) => item.isOverdue).length,
      pending: allItems.filter((item) => !item.isClosed).length,
    }),
    [allItems],
  );

  const hasVisibleContent =
    projectHasWindow || datedItems.length > 0 || unscheduledItems.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            Gantt operativo
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Línea de tiempo con la ventana del proyecto, hitos y vencimientos reales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as TimelineFilter)}>
            <SelectTrigger className="h-9 w-[150px] rounded-full border-slate-200 text-xs font-semibold shadow-none">
              <ListFilter className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex h-9 rounded-full border border-slate-200 bg-white p-1">
            {(["week", "month"] as TimelineScale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setScale(item)}
                className={cn(
                  "rounded-full px-3 text-xs font-bold text-slate-500 transition",
                  scale === item && "bg-slate-900 text-white",
                )}
              >
                {item === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={scrollToToday}
            className="h-9 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
          >
            <TimerReset className="mr-1.5 h-3.5 w-3.5" />
            Hoy
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void loadMilestones()}
            disabled={loading}
            aria-label="Actualizar hitos"
            className="h-9 w-9 rounded-full"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <TimelineMetric label="Tareas" value={counts.tasks} />
        <TimelineMetric label="Hitos" value={counts.milestones} />
        <TimelineMetric label="Pendientes" value={counts.pending} />
        <TimelineMetric label="Vencidos" value={counts.overdue} danger={counts.overdue > 0} />
      </div>

      {!hasVisibleContent && !loading ? (
        <EmptyState
          icon={<GanttChartSquare className="h-5 w-5" />}
          title="Sin planificación visible"
          description="No hay fechas de proyecto, hitos ni tareas para el filtro seleccionado."
        />
      ) : (
        <>
          <div className="hidden rounded-xl border border-slate-200 bg-white lg:block">
            <div ref={scrollerRef} className="overflow-x-auto">
              <div className="relative" style={{ width: gridWidth }}>
                <TimelineHeader days={days} dayWidth={dayWidth} labelWidth={labelWidth} />
                {showToday ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-rose-500/80"
                    style={{ left: labelWidth + todayOffset }}
                  >
                    <span className="absolute -top-1 left-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Hoy
                    </span>
                  </div>
                ) : null}
                <div>
                  <ProjectTimelineRow
                    project={project}
                    projectStart={projectStart}
                    projectDue={projectDue}
                    projectProgress={projectProgress}
                    timelineStart={timelineStart}
                    dayWidth={dayWidth}
                    labelWidth={labelWidth}
                    gridWidth={gridWidth}
                    hasWindow={projectHasWindow}
                  />
                  <TimelineGroupTitle title="Hitos" labelWidth={labelWidth} gridWidth={gridWidth} />
                  {datedItems.filter((item) => item.type === "milestone").length ? (
                    datedItems
                      .filter((item) => item.type === "milestone")
                      .map((item) => (
                        <TimelineItemRow
                          key={`${item.type}-${item.id}`}
                          item={item}
                          timelineStart={timelineStart}
                          dayWidth={dayWidth}
                          labelWidth={labelWidth}
                          gridWidth={gridWidth}
                        />
                      ))
                  ) : (
                    <TimelineEmptyRow label="Sin hitos fechados" gridWidth={gridWidth} />
                  )}
                  <TimelineGroupTitle
                    title="Tareas"
                    labelWidth={labelWidth}
                    gridWidth={gridWidth}
                  />
                  {datedItems.filter((item) => item.type === "task").length ? (
                    datedItems
                      .filter((item) => item.type === "task")
                      .map((item) => (
                        <TimelineItemRow
                          key={`${item.type}-${item.id}`}
                          item={item}
                          timelineStart={timelineStart}
                          dayWidth={dayWidth}
                          labelWidth={labelWidth}
                          gridWidth={gridWidth}
                        />
                      ))
                  ) : (
                    <TimelineEmptyRow label="Sin tareas fechadas" gridWidth={gridWidth} />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    Proyecto
                  </p>
                  <h4 className="mt-1 truncate text-base font-extrabold text-slate-950">
                    {project.name}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {projectHasWindow
                      ? `${formatDateLabel(projectStart)} - ${formatDateLabel(projectDue)}`
                      : "Sin ventana planificada"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {statusLabel(project.status)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={projectProgress} className="h-2 flex-1" />
                <span className="text-xs font-extrabold text-slate-700">{projectProgress}%</span>
              </div>
            </div>

            {groupedMobileItems.length ? (
              groupedMobileItems.map(([dateKey, items]) => {
                const date = parseLocalDate(dateKey);
                return (
                  <div key={dateKey} className="relative pl-5">
                    <div className="absolute bottom-0 left-1.5 top-6 w-px bg-slate-200" />
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {formatDateLabel(date)}
                      </h4>
                      {date && isSameDay(date, today) ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          Hoy
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2 pb-3">
                      {items.map((item) => (
                        <MobileTimelineItem key={`${item.type}-${item.id}`} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
                No hay elementos con fecha para este filtro.
              </div>
            )}
          </div>

          {unscheduledItems.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                <h4 className="text-sm font-extrabold text-slate-900">Sin fecha</h4>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {unscheduledItems.map((item) => (
                  <MobileTimelineItem key={`${item.type}-${item.id}-unscheduled`} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function TimelineMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className={cn("mt-1 text-lg font-extrabold text-slate-900", danger && "text-rose-700")}>
        {value}
      </p>
    </div>
  );
}

function TimelineHeader({
  days,
  dayWidth,
  labelWidth,
}: {
  days: Date[];
  dayWidth: number;
  labelWidth: number;
}) {
  return (
    <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white">
      <div
        className="sticky left-0 z-40 flex h-12 items-center border-r border-slate-200 bg-white px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-400"
        style={{ width: labelWidth }}
      >
        Elemento
      </div>
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={cn(
            "flex h-12 shrink-0 flex-col items-center justify-center border-r border-slate-100 text-[11px] font-bold text-slate-500",
            isSameDay(day, new Date()) && "bg-rose-50 text-rose-700",
          )}
          style={{ width: dayWidth }}
        >
          <span className="leading-none">{formatDayLabel(day)}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectTimelineRow({
  project,
  projectStart,
  projectDue,
  projectProgress,
  timelineStart,
  dayWidth,
  labelWidth,
  gridWidth,
  hasWindow,
}: {
  project: ProjectGanttProject;
  projectStart: Date | null;
  projectDue: Date | null;
  projectProgress: number;
  timelineStart: Date;
  dayWidth: number;
  labelWidth: number;
  gridWidth: number;
  hasWindow: boolean;
}) {
  const startOffset =
    projectStart && differenceInCalendarDays(projectStart, timelineStart) * dayWidth;
  const width =
    projectStart && projectDue
      ? Math.max(dayWidth, (differenceInCalendarDays(projectDue, projectStart) + 1) * dayWidth)
      : 0;

  return (
    <div
      className="relative flex min-h-[74px] border-b border-slate-100"
      style={{ width: gridWidth }}
    >
      <div
        className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-4"
        style={{ width: labelWidth }}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-950">{project.name}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {hasWindow
              ? `${formatDateLabel(projectStart)} - ${formatDateLabel(projectDue)}`
              : "Sin ventana planificada"}
          </div>
        </div>
      </div>
      <div className="relative flex-1 bg-slate-50/40">
        {hasWindow && startOffset !== null ? (
          <div
            className="absolute top-5 h-8 overflow-hidden rounded-full border border-blue-200 bg-blue-100"
            style={{ left: startOffset, width }}
          >
            <div
              className="h-full rounded-full bg-blue-500/80"
              style={{ width: `${projectProgress}%` }}
            />
          </div>
        ) : (
          <div className="absolute left-4 top-5 rounded-full border border-dashed border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
            Sin fechas de inicio y entrega
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineGroupTitle({
  title,
  labelWidth,
  gridWidth,
}: {
  title: string;
  labelWidth: number;
  gridWidth: number;
}) {
  return (
    <div className="flex border-b border-slate-100 bg-slate-50" style={{ width: gridWidth }}>
      <div
        className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500"
        style={{ width: labelWidth }}
      >
        {title}
      </div>
      <div className="flex-1" />
    </div>
  );
}

function TimelineItemRow({
  item,
  timelineStart,
  dayWidth,
  labelWidth,
  gridWidth,
}: {
  item: TimelineItem;
  timelineStart: Date;
  dayWidth: number;
  labelWidth: number;
  gridWidth: number;
}) {
  const left = item.date
    ? differenceInCalendarDays(item.date, timelineStart) * dayWidth + dayWidth / 2
    : 0;
  const Icon = item.type === "milestone" ? Diamond : CircleDot;

  return (
    <div
      className="relative flex min-h-[58px] border-b border-slate-100"
      style={{ width: gridWidth }}
    >
      <div
        className="sticky left-0 z-10 flex min-w-0 items-center gap-3 border-r border-slate-200 bg-white px-4"
        style={{ width: labelWidth }}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            item.type === "milestone" ? "text-indigo-500" : "text-blue-500",
          )}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{item.title}</div>
          <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {item.type === "milestone" ? "Hito" : "Tarea"} · {statusLabel(item.status)}
          </div>
        </div>
      </div>
      <div className="relative flex-1 bg-white">
        <div
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border",
            item.type === "milestone" ? "rotate-45 rounded-[3px]" : "rounded-full",
            getItemTone(item),
          )}
          style={{ left }}
          title={`${item.title} · ${formatDateLabel(item.date)}`}
        />
      </div>
    </div>
  );
}

function TimelineEmptyRow({ label, gridWidth }: { label: string; gridWidth: number }) {
  return (
    <div
      className="border-b border-slate-100 px-4 py-5 text-sm font-semibold text-slate-400"
      style={{ width: gridWidth }}
    >
      {label}
    </div>
  );
}

function MobileTimelineItem({ item }: { item: TimelineItem }) {
  const Icon = item.type === "milestone" ? Diamond : CheckCircle2;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center border",
            item.type === "milestone" ? "rotate-45 rounded-[7px]" : "rounded-full",
            getItemTone(item),
          )}
        >
          <Icon className={cn("h-4 w-4", item.type === "milestone" && "-rotate-45")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h5 className="min-w-0 truncate text-sm font-extrabold text-slate-950">{item.title}</h5>
            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {item.type === "milestone" ? "Hito" : "Tarea"}
            </span>
          </div>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
              {item.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
            <span>{statusLabel(item.status)}</span>
            <span>·</span>
            <span>{formatDateLabel(item.date)}</span>
            {item.isOverdue ? (
              <>
                <span>·</span>
                <span className="text-rose-700">Vencido</span>
              </>
            ) : null}
          </div>
          {item.type === "milestone" && item.progress !== null ? (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={clampProgress(item.progress)} className="h-1.5 flex-1" />
              <span className="text-[11px] font-extrabold text-slate-600">
                {clampProgress(item.progress)}%
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
