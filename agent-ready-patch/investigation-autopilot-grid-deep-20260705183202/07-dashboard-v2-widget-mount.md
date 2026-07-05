## 07-dashboard-v2-widget-mount
```
              "/tasks",
            ] as WorkCenterItem,
        ),
      projects: resolvedProjectRisks.map(
        ([title, subtitle, badge, tone, href]) =>
          [title, subtitle, badge, tone as DashboardV2Tone, href] as WorkCenterItem,
      ),
      tickets: [],
      inbox: communications.map(
        ([channel, name, preview, count, tone, href]) =>
          [
            `${channel}: ${name}`,
            preview,
            Number(count) > 0 ? `${count} nuevo` : "Abierto",
            tone as DashboardV2Tone,
            href,
          ] as WorkCenterItem,
      ),
      calendar: schedule.map(
        ([when, title, subtitle, tone]) =>
          [
            title,
            `${when} · ${subtitle}`,
            when,
            tone as DashboardV2Tone,
            "/calendar",
          ] as WorkCenterItem,
      ),
    } satisfies WorkCenterData);
  const resolvedTodoItems =
    todoItems ??
    ({
      pending: actions
        .filter((action) => action.href === "/tasks")
        .map(
          (action) =>
            [
              action.title,
              `${action.relatedTo} · ${action.due}`,
              action.tone,
              "/tasks",
            ] as TodoItem,
        ),
      completed: [],
    } satisfies TodoWidgetData);

  return (
    <DashboardBuilder
      widgets={[
        {
          id: "agent.autopilot",
          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
        },
        {
          id: "sales.quick-kpis",
          render: ({ mode }) => <DashboardKpiStripWidget kpis={kpis} mode={mode} />,
        },
        {
          id: "tasks.my-work",
          render: ({ mode }) => <DashboardActionPrioritiesWidget actions={actions} mode={mode} />,
        },
        {
          id: "leads.attention",
          render: ({ mode }) => (
            <DashboardListWidget
              title="Leads por atender"
              question="¿Qué prospectos necesitan seguimiento?"
              emptyLabel="No hay leads urgentes."
              href="/leads"
              icon={Users}
              items={resolvedLeadAttention}
```
