import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
  lg: 12,
  md: 6,
  sm: 6,
  xs: 1,
};

const breakpoints: Record<DashboardBreakpoint, number> = {
  lg: 1200,
  md: 900,
  sm: 640,
  xs: 0,
};

function toGridLayouts(preferences: DashboardWidgetPreference[], renderableIds: Set<string>) {
  const layouts: ResponsiveLayouts<DashboardBreakpoint> = {};

  (Object.keys(cols) as DashboardBreakpoint[]).forEach((breakpoint) => {
    layouts[breakpoint] = preferences
      .filter((preference) => preference.enabled && renderableIds.has(preference.widgetId))
      .map((preference) =>
        preference.mode === "mini"
          ? resizeLayoutForMode(preference, preference.mode)[breakpoint]
          : preference.layout[breakpoint],
      )
      .filter(Boolean)
      .map((item) => ({ ...item })) as LayoutItem[];
  });

  return layouts;
}

function mergeLayoutsIntoPreferences(
  preferences: DashboardWidgetPreference[],
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
) {
  return preferences.map((preference) => {
    const nextLayout = { ...preference.layout };

    (Object.keys(cols) as DashboardBreakpoint[]).forEach((breakpoint) => {
      const item = layouts[breakpoint]?.find((layoutItem) => layoutItem.i === preference.widgetId);
      if (!item) return;

      nextLayout[breakpoint] = {
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
      } satisfies DashboardGridLayoutItem;
    });

    return {
      ...preference,
      layout: nextLayout,
    };
  });
}

function resizeLayoutForMode(
  preference: DashboardWidgetPreference,
  mode: DashboardWidgetMode,
): DashboardWidgetPreference["layout"] {
  const definition = getDashboardWidgetDefinition(preference.widgetId);
  const nextLayout = { ...preference.layout };

  (Object.keys(cols) as DashboardBreakpoint[]).forEach((breakpoint) => {
    const current = nextLayout[breakpoint] || definition?.defaultLayout[breakpoint];
    if (!current) return;

    const breakpointCols = cols[breakpoint];
    const standard = definition?.defaultLayout[breakpoint] || current;
    const size =
      mode === "mini"
        ? {
            w: breakpoint === "xs" ? 1 : Math.min(3, breakpointCols),
            h: 1,
            minW: breakpoint === "xs" ? 1 : Math.min(2, breakpointCols),
            minH: 1,
          }
        : mode === "advanced"
          ? {
              w: breakpoint === "xs" ? 1 : Math.min(breakpoint === "lg" ? 8 : 6, breakpointCols),
              h: preference.widgetId === "sales.quick-kpis" ? 2 : 6,
              minW: breakpoint === "xs" ? 1 : Math.min(4, breakpointCols),
              minH: 3,
            }
          : {
              w: Math.min(standard.w, breakpointCols),
              h: standard.h,
              minW: standard.minW,
              minH: standard.minH,
            };

    const w = Math.max(1, Math.min(size.w, breakpointCols));
    const x = Math.min(current.x, Math.max(0, breakpointCols - w));

    nextLayout[breakpoint] = {
      ...current,
      x,
      w,
      h: size.h,
      minW: size.minW,
      minH: size.minH,
      maxW: current.maxW,
      maxH: current.maxH,
      static: current.static,
    };
  });

  return nextLayout;
}

function DashboardGridItemShell({ children }: { children: ReactNode }) {
  return <div className="h-full min-h-0 overflow-hidden">{children}</div>;
}

function DashboardOptionsPanel({
  preferences,
  renderableIds,
  saving,
  onEnabledChange,
}: {
  preferences: DashboardWidgetPreference[];
  renderableIds: Set<string>;
  saving: boolean;
  onEnabledChange: (widgetId: string, enabled: boolean) => void;
}) {
  const options = preferences.filter((preference) => renderableIds.has(preference.widgetId));
  const enabledCount = options.filter((preference) => preference.enabled).length;

  return (
    <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[460px]">
      <SheetHeader className="border-b border-slate-200 px-5 py-4">
        <SheetTitle>Dashboard Options</SheetTitle>
        <SheetDescription>Activa los widgets que quieres ver en tu dashboard.</SheetDescription>
      </SheetHeader>

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Widgets visibles</span>
        <Badge variant="outline" className="bg-white text-slate-600">
          {enabledCount}/{options.length}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
        {options.map((preference) => {
          const definition = getDashboardWidgetDefinition(preference.widgetId);
          const Icon = definition?.icon || SlidersHorizontal;

          return (
            <div
              key={preference.widgetId}
              className={cn(
                "rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition",
                !preference.enabled && "opacity-70",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {definition?.title || preference.widgetId}
                      </h3>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                        {definition?.description || "Widget del dashboard personalizado."}
                      </p>
                    </div>

                    <Switch
                      checked={preference.enabled}
                      disabled={saving}
                      onCheckedChange={(checked) => onEnabledChange(preference.widgetId, checked)}
                      aria-label={`Mostrar ${definition?.title || preference.widgetId}`}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-slate-600">
                      {definition?.module || "dashboard"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SheetContent>
  );
}

export function DashboardBuilder({ widgets }: { widgets: DashboardWidgetRenderItem[] }) {
  const { preferences, loading, saving, error, savePreferences, resetPreferences } =
    useDashboardLayout();
  const { containerRef, mounted, width } = useContainerWidth({
    initialWidth: 1280,
    measureBeforeMount: false,
  });
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
  const layouts = useMemo(
    () => toGridLayouts(normalizedPreferences, renderableIds),
    [normalizedPreferences, renderableIds],
  );
  const gridWidth = mounted && width > 0 ? width : 1280;

  const handleLayoutChange = (
    _currentLayout: Layout,
    allLayouts: ResponsiveLayouts<DashboardBreakpoint>,
  ) => {
    if (!layoutChangeReadyRef.current) {
      layoutChangeReadyRef.current = true;
      return;
    }

    void savePreferences(mergeLayoutsIntoPreferences(normalizedPreferences, allLayouts), {
      silent: true,
    });
  };

  const updateWidgetPreference = (
    widgetId: string,
    patch: Partial<Pick<DashboardWidgetPreference, "enabled" | "mode">>,
  ) => {
    const nextPreferences = normalizedPreferences.map((preference) =>
      preference.widgetId === widgetId ? { ...preference, ...patch } : preference,
    );

    void savePreferences(nextPreferences, { silent: true });
  };

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center p-6 text-sm font-medium text-slate-500">
        Cargando dashboard...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-0 bg-[#f8fafc]">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#f8fafc]/95 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
            Dashboard
          </h1>
          <p className="truncate text-[12px] font-medium text-slate-500">
            Arrastra desde el icono lateral o redimensiona widgets. Los cambios se guardan
            automáticamente.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" size="sm" variant="outline">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Opciones
              </Button>
            </SheetTrigger>
            <DashboardOptionsPanel
              preferences={normalizedPreferences}
              renderableIds={renderableIds}
              saving={saving}
              onEnabledChange={(widgetId, enabled) => updateWidgetPreference(widgetId, { enabled })}
            />
          </Sheet>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void resetPreferences();
            }}
            disabled={saving}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mx-3 mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
          {error}
        </div>
      ) : null}

      {visiblePreferences.length === 0 ? (
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
              disabled={saving}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar widgets
            </Button>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          width={gridWidth}
          className="dashboard-builder-grid p-3"
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={92}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          dragConfig={{
            enabled: true,
            handle: ".dashboard-widget-drag-grip",
            threshold: 3,
            bounded: false,
          }}
          resizeConfig={{
            enabled: true,
            handles: ["se"],
          }}
          onLayoutChange={handleLayoutChange}
        >
          {visiblePreferences.map((preference) => {
            const widget = widgetById.get(preference.widgetId);
            const definition = getDashboardWidgetDefinition(preference.widgetId);
            if (!widget) return null;

            return (
              <div key={preference.widgetId} className="relative min-h-0 pl-6">
                <button
                  type="button"
                  className="dashboard-widget-drag-grip absolute left-0 top-4 z-10 hidden cursor-grab place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing sm:grid"
                  aria-label={`Mover ${definition?.title || preference.widgetId}`}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <DashboardGridItemShell>
                  {widget.render
                    ? widget.render({ mode: preference.mode, settings: preference.settings })
                    : widget.content}
                </DashboardGridItemShell>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
