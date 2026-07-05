## 03-dashboard-builder-grid-config
```
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

const miniModeThreshold = {
  w: 3,
  h: 2,
};

function toGridLayouts(preferences: DashboardWidgetPreference[], renderableIds: Set<string>) {
  const layouts: ResponsiveLayouts<DashboardBreakpoint> = {};

  (Object.keys(cols) as DashboardBreakpoint[]).forEach((breakpoint) => {
    layouts[breakpoint] = preferences
      .filter((preference) => preference.enabled && renderableIds.has(preference.widgetId))
      .map((preference) => preference.layout[breakpoint])
      .filter((item): item is DashboardGridLayoutItem => Boolean(item))
      .map((item) => ({
        ...item,
        minW: Math.min(item.minW || 1, miniModeThreshold.w),
        minH: Math.min(item.minH || 1, 1),
      })) as LayoutItem[];
  });

  return layouts;
}

function mergeLayoutsIntoPreferences(
  preferences: DashboardWidgetPreference[],
  currentLayout: Layout,
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
) {
  return preferences.map((preference) => {
    const nextLayout = { ...preference.layout };
    const currentItem = currentLayout.find((layoutItem) => layoutItem.i === preference.widgetId);

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
      mode: currentItem ? inferWidgetMode(currentItem) : preference.mode,
      layout: nextLayout,
    };
  });
}

function inferWidgetMode(item: LayoutItem): DashboardWidgetMode {
  return item.w <= miniModeThreshold.w && item.h <= miniModeThreshold.h ? "mini" : "standard";
}

```
