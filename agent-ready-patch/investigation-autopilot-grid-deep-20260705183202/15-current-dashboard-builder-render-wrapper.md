## 15-current-dashboard-builder-render-wrapper
```
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
```
