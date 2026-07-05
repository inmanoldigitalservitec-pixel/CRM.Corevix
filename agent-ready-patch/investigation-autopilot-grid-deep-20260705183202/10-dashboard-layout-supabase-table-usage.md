## 10-dashboard-layout-supabase-table-usage
```
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:438:        ...(stored?.layout || {}),
src/components/dashboard-builder/dashboard-builder.tsx:208:  const normalizedPreferences = useMemo(
src/components/dashboard-builder/dashboard-builder.tsx:212:  const visiblePreferences = normalizedPreferences.filter(
src/components/dashboard-builder/dashboard-builder.tsx:216:    () => toGridLayouts(normalizedPreferences, renderableIds),
src/components/dashboard-builder/dashboard-builder.tsx:217:    [normalizedPreferences, renderableIds],
src/components/dashboard-builder/dashboard-builder.tsx:231:      mergeLayoutsIntoPreferences(normalizedPreferences, _currentLayout, allLayouts),
src/components/dashboard-builder/dashboard-builder.tsx:242:    const nextPreferences = normalizedPreferences.map((preference) =>
src/components/dashboard-builder/dashboard-builder.tsx:279:              preferences={normalizedPreferences}
src/components/dashboard-builder/widget-registry.ts:438:        ...(stored?.layout || {}),
src/components/dashboard-builder/use-dashboard-layout.ts:74:        .from("dashboard_layouts")
src/components/dashboard-builder/use-dashboard-layout.ts:89:      const remotePreferences = Array.isArray(data?.widgets)
src/components/dashboard-builder/use-dashboard-layout.ts:93:      const nextPreferences = normalizeDashboardWidgetPreferences(remotePreferences);
src/components/dashboard-builder/use-dashboard-layout.ts:117:      const { error: saveError } = await (supabase as any).from("dashboard_layouts").upsert(
```
