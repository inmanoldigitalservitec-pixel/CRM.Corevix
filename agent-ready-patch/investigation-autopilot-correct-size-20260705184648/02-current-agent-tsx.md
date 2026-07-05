## 02-current-agent-tsx
```
    nextLine();

    await onApprovePlan?.(selectedPlan);
  }

  const result = selectedPlan.result || {
    title: "Plan listo",
    message: "El agente preparó el plan de sanación. La ejecución real requiere confirmación.",
    data: [
      { label: "Caso", value: selectedPlan.severity },
      { label: "Acciones", value: String(selectedPlan.suggested_actions.length) },
      { label: "Estado", value: "Pendiente" },
    ],
  };

  return (
    <section
      className={rootClassName}
      style={
        {
          "--agent-accent": theme.color,
          "--agent-soft": theme.soft,
        } as React.CSSProperties
      }
    >
      <div className="agent-widget-top">
        <div className="agent-brand-row">
          <h2>Corevix Autopilot</h2>
          <span className={`agent-active-pill ${isActive ? "is-active" : "is-paused"}`}>
            <span className="agent-active-dot" />
            {isActive ? "Activo" : "Pausado"}
          </span>
          <span className="agent-last-check">{lastAnalysisLabel}</span>
        </div>

        <button className="agent-analyze-btn" type="button" onClick={handleAnalyzeNow} disabled={isAnalyzing || isLoading}>
          {isAnalyzing || isLoading ? "Revisando actividad..." : "Analizar ahora"}
        </button>
      </div>

      <div className="agent-headline">
        {hasPlans ? (
          <>
            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
          </>
        ) : (
          <>No hay acciones pendientes para resolver ahora.</>
        )}
      </div>

      <div className="agent-review-mode">
        <article className="agent-main-card">
          <div className={`agent-event-shell ${isTransitioning ? "slide-out" : ""}`}>
            <div className="agent-event-icon">
              <Icon name={theme.icon} />
            </div>

            <div>
              <div className="agent-label">Corevix Autopilot</div>

              <div className="agent-event-title-row">
                <h3 className="agent-event-title">{selectedPlan.title}</h3>
                <span className="agent-severity">{theme.label}</span>
              </div>

              <p className="agent-event-message">{selectedPlan.message || selectedPlan.diagnosis}</p>

              <div className="agent-promise">{selectedPlan.diagnosis}</div>

              <div className="agent-impact-row">
                {impactPills.map((item) => (
                  <span className="agent-impact-pill" key={item}>
                    {item}
                  </span>
                ))}
              </div>

              <div className="agent-action-row">
                <button className="agent-primary-btn" type="button" onClick={handleStartExecution} disabled={!hasPlans}>
                  Resolver con Autopilot
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="agent-execution-mode">
        <div className="agent-stream-panel">
          <div className="agent-stream-header">
            <div className="agent-stream-mark" />
            <div>
              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
              <p className="agent-stream-subtitle">El agente irá mostrando lo que está haciendo en tiempo real.</p>
            </div>
          </div>

          <div className="agent-stream-body">
            {streamLines.map((line, index) => (
              <div className={`agent-stream-line ${line.type || ""}`} key={`${line.text}-${index}`}>
                {line.text}
              </div>
            ))}
            {mode === "executing" ? <span className="agent-cursor" /> : null}
          </div>

          <div className={`agent-result-mini ${showResult ? "visible" : ""}`}>
            <div className="agent-result-title">{result.title}</div>
            <p className="agent-result-copy">{result.message}</p>

            <div className="agent-result-data">
              {result.data.map((item) => (
                <div className="agent-data-chip" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="agent-action-row">
              <button className="agent-primary-btn" type="button" onClick={() => setMode("review")}>
                Volver al widget
              </button>
              <button className="agent-secondary-btn" type="button" onClick={() => setMode("compact")}>
                Ocultar plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgentCommandWidget;
```
