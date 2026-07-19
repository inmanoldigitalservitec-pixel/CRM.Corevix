import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GripVertical, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type {
  DashboardBreakpoint,
  DashboardGridLayoutItem,
  DashboardWidgetMode,
  DashboardWidgetPreference,
  DashboardWidgetRenderItem,
} from "./types";
import {
  getDashboardWidgetDefinition,
  normalizeDashboardWidgetPreferences,
} from "./widget-registry";
import { useDashboardLayout } from "./use-dashboard-layout";

const cols: Record<DashboardBreakpoint, number> = {
  "2xl": 12,
  xl: 12,
  lg: 12,
  md: 8,
  sm: 1,
  xs: 1,
};

const breakpoints: Record<DashboardBreakpoint, number> = {
  "2xl": 1800,
  xl: 1440,
  lg: 1200,
  md: 900,
  sm: 640,
  xs: 0,
};

const miniModeThreshold = {
  w: 3,
  h: 2,
};

const dashboardBreakpoints = Object.keys(cols) as DashboardBreakpoint[];
const breakpointGroups: DashboardBreakpoint[][] = [["2xl", "xl", "lg"], ["md"], ["sm", "xs"]];

function getBreakpointForWidth(width: number): DashboardBreakpoint {
  const orderedBreakpoints = Object.entries(breakpoints).sort(([, a], [, b]) => b - a) as [
    DashboardBreakpoint,
    number,
  ][];

  return orderedBreakpoints.find(([, minWidth]) => width >= minWidth)?.[0] || "xs";
}

function getBreakpointGroup(breakpoint: DashboardBreakpoint) {
  return (
    breakpointGroups.find((group) => group.includes(breakpoint)) ||
    ([breakpoint] as DashboardBreakpoint[])
  );
}

function cloneLayoutItemForBreakpoint(
  item: DashboardGridLayoutItem,
  breakpoint: DashboardBreakpoint,
): DashboardGridLayoutItem {
  const columnCount = cols[breakpoint];
  const minW = Math.min(item.minW || 1, columnCount);
  const w = Math.max(Math.min(item.w, columnCount), minW);
  const maxX = Math.max(columnCount - w, 0);

  return {
    ...item,
    x: Math.min(Math.max(item.x, 0), maxX),
    w,
    minW,
    minH: Math.max(item.minH || 1, 1),
  };
}

function toStoredLayoutItem(item: LayoutItem): DashboardGridLayoutItem {
  return {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static,
    isDraggable: item.isDraggable,
    isResizable: item.isResizable,
  };
}

function sortLayoutItems<T extends { x: number; y: number }>(items: readonly T[]) {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

function toGridLayouts(preferences: DashboardWidgetPreference[], renderableIds: Set<string>) {
  const layouts: ResponsiveLayouts<DashboardBreakpoint> = {};

  dashboardBreakpoints.forEach((breakpoint) => {
    const columnCount = cols[breakpoint];

    layouts[breakpoint] = preferences
      .filter((preference) => preference.enabled && renderableIds.has(preference.widgetId))
      .map((preference) => preference.layout[breakpoint])
      .filter((item): item is DashboardGridLayoutItem => Boolean(item))
      .map((item) => {
        const minW = Math.min(item.minW || 1, columnCount);
        const w = Math.max(Math.min(item.w, columnCount), minW);
        const maxX = Math.max(columnCount - w, 0);
        const x = Math.min(Math.max(item.x, 0), maxX);

        return {
          ...item,
          x,
          w,
          minW,
          minH: Math.max(item.minH || 1, 1),
        };
      }) as LayoutItem[];
  });

  return layouts;
}

function syncBreakpointGroupLayouts(
  preferences: DashboardWidgetPreference[],
  sourceBreakpoint: DashboardBreakpoint,
  currentLayout?: Layout,
) {
  const group = getBreakpointGroup(sourceBreakpoint);

  return preferences.map((preference) => {
    const sourceItemFromCurrent = currentLayout?.find(
      (layoutItem) => layoutItem.i === preference.widgetId,
    );
    const sourceItem = sourceItemFromCurrent
      ? toStoredLayoutItem(sourceItemFromCurrent)
      : preference.layout[sourceBreakpoint];

    if (!sourceItem) return preference;

    const nextLayout = { ...preference.layout };
    group.forEach((breakpoint) => {
      nextLayout[breakpoint] = cloneLayoutItemForBreakpoint(
        {
          ...sourceItem,
          i: preference.widgetId,
        },
        breakpoint,
      );
    });

    return {
      ...preference,
      layout: nextLayout,
    };
  });
}

function mergeLayoutsIntoPreferences(
  preferences: DashboardWidgetPreference[],
  currentLayout: Layout,
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
  activeBreakpoint: DashboardBreakpoint,
) {
  const mergedPreferences = preferences.map((preference) => {
    const nextLayout = { ...preference.layout };
    const currentItem = currentLayout.find((layoutItem) => layoutItem.i === preference.widgetId);

    dashboardBreakpoints.forEach((breakpoint) => {
      const item = layouts[breakpoint]?.find((layoutItem) => layoutItem.i === preference.widgetId);
      if (!item) return;

      nextLayout[breakpoint] = toStoredLayoutItem(item);
    });

    return {
      ...preference,
      mode: currentItem ? inferWidgetMode(currentItem) : preference.mode,
      layout: nextLayout,
    };
  });

  return syncBreakpointGroupLayouts(mergedPreferences, activeBreakpoint, currentLayout);
}

function placeWidgetAtDashboardEnd(
  preferences: DashboardWidgetPreference[],
  renderableIds: Set<string>,
  widgetId: string,
  sourceBreakpoint: DashboardBreakpoint,
) {
  const targetPreference = preferences.find((preference) => preference.widgetId === widgetId);
  if (!targetPreference) return undefined;

  const nextLayout = { ...targetPreference.layout };

  dashboardBreakpoints.forEach((breakpoint) => {
    const currentItem = targetPreference.layout[breakpoint];
    if (!currentItem) return;

    const columnCount = cols[breakpoint];
    const minW = Math.min(currentItem.minW || 1, columnCount);
    const w = Math.max(Math.min(currentItem.w, columnCount), minW);
    const h = Math.max(currentItem.h, currentItem.minH || 1);
    const bottom = preferences.reduce((maxY, preference) => {
      if (
        !preference.enabled ||
        preference.widgetId === widgetId ||
        !renderableIds.has(preference.widgetId)
      ) {
        return maxY;
      }

      const item = preference.layout[breakpoint];
      if (!item) return maxY;

      return Math.max(maxY, item.y + item.h);
    }, 0);

    nextLayout[breakpoint] = {
      ...currentItem,
      x: 0,
      y: bottom,
      w,
      h,
      minW,
      minH: Math.max(currentItem.minH || 1, 1),
      static: false,
    };
  });

  const [syncedPreference] = syncBreakpointGroupLayouts(
    [
      {
        ...targetPreference,
        layout: nextLayout,
      },
    ],
    sourceBreakpoint,
  );

  return syncedPreference?.layout || nextLayout;
}

function inferWidgetMode(item: LayoutItem): DashboardWidgetMode {
  return item.w <= miniModeThreshold.w && item.h <= miniModeThreshold.h ? "mini" : "standard";
}

function DashboardGridItemShell({ children }: { children: ReactNode }) {
  return <div className="h-full min-h-0 overflow-hidden">{children}</div>;
}

export function DashboardBuilder({ widgets }: { widgets: DashboardWidgetRenderItem[] }) {
  const { preferences, loading, saving, error, savePreferences, resetPreferences } =
    useDashboardLayout();
  const [layoutEditing, setLayoutEditing] = useState(false);
  const { containerRef, mounted, width } = useContainerWidth({
    initialWidth: 1280,
    measureBeforeMount: true,
  });
  const gridWidth = mounted && width > 0 ? Math.floor(width) : 0;
  const [activeBreakpoint, setActiveBreakpoint] = useState<DashboardBreakpoint | null>(null);
  const layoutChangeReadyRef = useRef(false);
  const widgetById = useMemo(
    () => new Map(widgets.map((widget) => [widget.id, widget])),
    [widgets],
  );
  const renderableIds = useMemo(() => new Set(widgets.map((widget) => widget.id)), [widgets]);
  const normalizedPreferences = useMemo(
    () => normalizeDashboardWidgetPreferences(preferences),
    [preferences],
  );
  const visiblePreferences = normalizedPreferences.filter(
    (preference) => preference.enabled && renderableIds.has(preference.widgetId),
  );
  const disabledPreferences = normalizedPreferences.filter(
    (preference) => !preference.enabled && renderableIds.has(preference.widgetId),
  );
  const layouts = useMemo(
    () => toGridLayouts(normalizedPreferences, renderableIds),
    [normalizedPreferences, renderableIds],
  );
  const detectedBreakpoint = mounted ? getBreakpointForWidth(gridWidth) : "lg";
  const currentBreakpoint = detectedBreakpoint;

  const handleLayoutChange = (
    _currentLayout: Layout,
    allLayouts: ResponsiveLayouts<DashboardBreakpoint>,
  ) => {
    if (loading || !layoutEditing) return;

    if (!layoutChangeReadyRef.current) {
      layoutChangeReadyRef.current = true;
      return;
    }

    void savePreferences(
      mergeLayoutsIntoPreferences(
        normalizedPreferences,
        _currentLayout,
        allLayouts,
        currentBreakpoint,
      ),
      {
        silent: true,
      },
    );
  };

  const updateWidgetPreference = (
    widgetId: string,
    patch: Partial<Pick<DashboardWidgetPreference, "enabled" | "mode">>,
  ) => {
    if (loading || !layoutEditing) return;

    const nextPreferences = normalizedPreferences.map((preference) =>
      preference.widgetId === widgetId
        ? {
            ...preference,
            ...patch,
            layout:
              patch.enabled === true && !preference.enabled
                ? placeWidgetAtDashboardEnd(
                    normalizedPreferences,
                    renderableIds,
                    widgetId,
                    currentBreakpoint,
                  ) || preference.layout
                : preference.layout,
          }
        : preference,
    );

    void savePreferences(nextPreferences, { silent: true });
  };

  const copyCurrentLayout = async () => {
    const activeLayout = layouts[currentBreakpoint] || [];
    const breakpointLayouts = dashboardBreakpoints.reduce(
      (acc, breakpoint) => {
        acc[breakpoint] = sortLayoutItems(layouts[breakpoint] || []).map((item) => ({
          widgetId: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
        }));
        return acc;
      },
      {} as Record<
        DashboardBreakpoint,
        Array<{
          widgetId: string;
          x: number;
          y: number;
          w: number;
          h: number;
          minW?: number;
          minH?: number;
        }>
      >,
    );
    const report = {
      copiedAt: new Date().toISOString(),
      viewport: {
        windowWidth: typeof window === "undefined" ? null : window.innerWidth,
        windowHeight: typeof window === "undefined" ? null : window.innerHeight,
        dashboardContainerWidth: gridWidth,
        detectedBreakpoint,
        activeBreakpoint,
        currentBreakpoint,
        columns: cols[currentBreakpoint],
      },
      activeLayout: sortLayoutItems(activeLayout).map((item) => ({
        widgetId: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      })),
      breakpointLayouts,
      preferences: normalizedPreferences,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      toast.success("Reporte del dashboard copiado.");
    } catch {
      toast.error("No se pudo copiar el reporte.");
    }
  };

  return (
    <div ref={containerRef} className="min-h-0 w-full bg-[#f8fafc]">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#f8fafc]/95 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
            Dashboard
          </h1>
          <p className="truncate text-[12px] font-medium text-slate-500">
            {layoutEditing
              ? "Modo edición activo. Arrastra, redimensiona o activa widgets; se guarda automáticamente."
              : "Resumen operativo de ventas, tareas, mensajes y proyectos."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant={layoutEditing ? "default" : "outline"}
            aria-label={layoutEditing ? "Finalizar edición del layout" : "Editar layout"}
            title={layoutEditing ? "Finalizar edición" : "Editar layout"}
            disabled={saving || loading}
            onClick={() => setLayoutEditing((editing) => !editing)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {layoutEditing ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Restaurar layout por defecto"
              title="Restaurar layout por defecto"
              onClick={() => {
                void resetPreferences();
              }}
              disabled={saving || loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mx-3 mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
          {error}
        </div>
      ) : null}

      {!mounted ? (
        <div className="m-3 min-h-[360px] rounded-xl bg-white/60" />
      ) : visiblePreferences.length === 0 && !layoutEditing ? (
        <div className="m-3 grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <div className="max-w-sm">
            <h2 className="text-base font-semibold text-slate-950">No hay widgets visibles</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Activa widgets desde Opciones o restaura el layout por defecto.
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => {
                void resetPreferences();
              }}
              disabled={saving || loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar widgets
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveGridLayout
            width={gridWidth}
            breakpoint={currentBreakpoint}
            className="dashboard-builder-grid"
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={92}
            margin={[10, 10]}
            containerPadding={[12, 12]}
            dragConfig={{
              enabled: layoutEditing,
              handle: ".dashboard-widget-drag-grip",
              threshold: 3,
              bounded: false,
            }}
            resizeConfig={{
              enabled: layoutEditing,
              handles: ["se"],
            }}
            autoSize
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={(breakpoint) => {
              setActiveBreakpoint(breakpoint as DashboardBreakpoint);
            }}
          >
            {visiblePreferences.map((preference) => {
              const widget = widgetById.get(preference.widgetId);
              const definition = getDashboardWidgetDefinition(preference.widgetId);
              if (!widget) return null;

              return (
                <div key={preference.widgetId} className="relative min-h-0 pl-6">
                  <button
                    type="button"
                    className={cn(
                      "dashboard-widget-drag-grip absolute left-0 top-4 z-10 grid cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing",
                      !layoutEditing && "pointer-events-none opacity-0",
                    )}
                    aria-label={`Mover ${definition?.title || preference.widgetId}`}
                    tabIndex={layoutEditing ? 0 : -1}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  {layoutEditing ? (
                    <button
                      type="button"
                      className="absolute left-0 top-12 z-10 grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() =>
                        updateWidgetPreference(preference.widgetId, { enabled: false })
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label={`Desactivar ${definition?.title || preference.widgetId}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}

                  <DashboardGridItemShell>
                    {widget.render
                      ? widget.render({ mode: preference.mode, settings: preference.settings })
                      : widget.content}
                  </DashboardGridItemShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>

          {layoutEditing ? (
            <section className="px-3 pb-8 pt-3">
              <div className="flex items-center gap-3 px-6">
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  Widgets desactivados
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/55 p-3 shadow-sm shadow-slate-200/40">
                {disabledPreferences.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {disabledPreferences.map((preference) => {
                      const definition = getDashboardWidgetDefinition(preference.widgetId);
                      const Icon = definition?.icon || Pencil;

                      return (
                        <button
                          key={preference.widgetId}
                          type="button"
                          className="group flex min-h-[68px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm shadow-slate-200/50 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/70"
                          onClick={() =>
                            updateWidgetPreference(preference.widgetId, { enabled: true })
                          }
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-700">
                              {definition?.title || preference.widgetId}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                              Click para activar
                            </span>
                          </span>
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid min-h-[88px] place-items-center rounded-xl bg-white text-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Todos los widgets están activos
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        Usa la X lateral para mandar alguno a esta zona.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
