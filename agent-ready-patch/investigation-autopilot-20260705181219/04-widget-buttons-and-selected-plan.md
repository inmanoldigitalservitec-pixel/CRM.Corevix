## 04-widget-buttons-and-selected-plan
```
src/components/agent/AgentCommandWidget.css:84:.agent-primary-btn {
src/components/agent/AgentCommandWidget.css:102:.agent-primary-btn:disabled {
src/components/agent/AgentCommandWidget.css:114:.agent-primary-btn {
src/components/agent/AgentCommandWidget.css:121:.agent-primary-btn:hover {
src/components/agent/AgentCommandWidget.tsx:247:  const availablePlans = plans && plans.length > 0 ? plans : [];
src/components/agent/AgentCommandWidget.tsx:248:  const hasPlans = availablePlans.length > 0;
src/components/agent/AgentCommandWidget.tsx:256:  const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || {
src/components/agent/AgentCommandWidget.tsx:278:  const theme = useMemo(() => getPlanTheme(selectedPlan), [selectedPlan]);
src/components/agent/AgentCommandWidget.tsx:279:  const impactPills = useMemo(() => getImpactPills(selectedPlan), [selectedPlan]);
src/components/agent/AgentCommandWidget.tsx:280:  const stream = useMemo(() => buildExecutionStream(selectedPlan), [selectedPlan]);
src/components/agent/AgentCommandWidget.tsx:292:    if (availablePlans.length <= 1) return;
src/components/agent/AgentCommandWidget.tsx:299:        setSelectedIndex((current) => (current + 1) % availablePlans.length);
src/components/agent/AgentCommandWidget.tsx:305:  }, [availablePlans.length, mode]);
src/components/agent/AgentCommandWidget.tsx:335:    onSelectPlan?.(selectedPlan);
src/components/agent/AgentCommandWidget.tsx:362:    await onApprovePlan?.(selectedPlan);
src/components/agent/AgentCommandWidget.tsx:365:  const result = selectedPlan.result || {
src/components/agent/AgentCommandWidget.tsx:369:      { label: "Caso", value: selectedPlan.severity },
src/components/agent/AgentCommandWidget.tsx:370:      { label: "Acciones", value: String(selectedPlan.suggested_actions.length) },
src/components/agent/AgentCommandWidget.tsx:395:        <button className="agent-analyze-btn" type="button" onClick={handleAnalyzeNow} disabled={isAnalyzing || isLoading}>
src/components/agent/AgentCommandWidget.tsx:397:        </button>
src/components/agent/AgentCommandWidget.tsx:405:            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
src/components/agent/AgentCommandWidget.tsx:427:                <h3 className="agent-event-title">{selectedPlan.title}</h3>
src/components/agent/AgentCommandWidget.tsx:431:              <p className="agent-event-message">{selectedPlan.message || selectedPlan.diagnosis}</p>
src/components/agent/AgentCommandWidget.tsx:433:              <div className="agent-promise">{selectedPlan.diagnosis}</div>
src/components/agent/AgentCommandWidget.tsx:444:                <button className="agent-primary-btn" type="button" onClick={handleStartExecution} disabled={!hasPlans}>
src/components/agent/AgentCommandWidget.tsx:445:                  {selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}
src/components/agent/AgentCommandWidget.tsx:446:                </button>
src/components/agent/AgentCommandWidget.tsx:447:                <button className="agent-secondary-btn" type="button" onClick={handleTogglePlan} disabled={!hasPlans}>
src/components/agent/AgentCommandWidget.tsx:449:                </button>
src/components/agent/AgentCommandWidget.tsx:465:            {selectedPlan.plan_steps.map((step, index) => (
src/components/agent/AgentCommandWidget.tsx:511:              <button className="agent-primary-btn" type="button" onClick={() => setMode("review")}>
src/components/agent/AgentCommandWidget.tsx:513:              </button>
src/components/agent/AgentCommandWidget.tsx:514:              <button className="agent-secondary-btn" type="button" onClick={() => setMode("compact")}>
src/components/agent/AgentCommandWidget.tsx:516:              </button>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:37:  button: string;
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:115:    button: "Ver factura",
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:124:    button: "Abrir lead",
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:133:    button: "Responder",
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:142:    button: "Crear propuesta",
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:151:    button: "Ver proyecto",
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:247:    <button
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:248:      type="button"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:257:    </button>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:339:                    <button
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:340:                      type="button"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:346:                      {item.button}
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:347:                    </button>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:563:                    <button
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:565:                      type="button"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:606:                    </button>
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:612:            <button
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:613:              type="button"
src/components/dashboard-v2/dashboard-v2.tsx.bak_language_real_fix:620:            </button>
src/components/dashboard-v2/dashboard-v2.tsx:46:  button: string;
src/components/dashboard-v2/dashboard-v2.tsx:154:    button: "Ver factura",
src/components/dashboard-v2/dashboard-v2.tsx:163:    button: "Abrir lead",
src/components/dashboard-v2/dashboard-v2.tsx:172:    button: "Responder",
src/components/dashboard-v2/dashboard-v2.tsx:181:    button: "Crear propuesta",
src/components/dashboard-v2/dashboard-v2.tsx:190:    button: "Ver proyecto",
src/components/dashboard-v2/dashboard-v2.tsx:362:    const primary = kpis[0];
src/components/dashboard-v2/dashboard-v2.tsx:365:        title={primary?.label || "Indicador"}
src/components/dashboard-v2/dashboard-v2.tsx:366:        value={primary?.value || "0"}
src/components/dashboard-v2/dashboard-v2.tsx:367:        helper={primary?.helper || "Sin datos"}
src/components/dashboard-v2/dashboard-v2.tsx:368:        icon={primary?.icon || DollarSign}
src/components/dashboard-v2/dashboard-v2.tsx:369:        tone={primary?.tone || "blue"}
src/components/dashboard-v2/dashboard-v2.tsx:391:    <button
src/components/dashboard-v2/dashboard-v2.tsx:392:      type="button"
src/components/dashboard-v2/dashboard-v2.tsx:401:    </button>
src/components/dashboard-v2/dashboard-v2.tsx:509:            items.slice(0, visibleLimit).map(([primary, secondary, badge, itemTone, itemHref]) => (
src/components/dashboard-v2/dashboard-v2.tsx:510:              <button
src/components/dashboard-v2/dashboard-v2.tsx:511:                key={`${title}-${primary}-${secondary}`}
src/components/dashboard-v2/dashboard-v2.tsx:512:                type="button"
src/components/dashboard-v2/dashboard-v2.tsx:522:                      {primary}
src/components/dashboard-v2/dashboard-v2.tsx:536:              </button>
src/components/dashboard-v2/dashboard-v2.tsx:577:  const primary = metrics[0];
src/components/dashboard-v2/dashboard-v2.tsx:583:        value={primary?.[1] || "$0"}
src/components/dashboard-v2/dashboard-v2.tsx:584:        helper={primary?.[2] || "Sin datos"}
src/components/dashboard-v2/dashboard-v2.tsx:586:        tone={primary?.[3] || "blue"}
src/components/dashboard-v2/dashboard-v2.tsx:722:            <button
src/components/dashboard-v2/dashboard-v2.tsx:724:              type="button"
src/components/dashboard-v2/dashboard-v2.tsx:736:            </button>
src/components/dashboard-v2/dashboard-v2.tsx:786:            <button
src/components/dashboard-v2/dashboard-v2.tsx:788:              type="button"
src/components/dashboard-v2/dashboard-v2.tsx:798:            </button>
src/components/dashboard-v2/dashboard-v2.tsx:825:                <button
src/components/dashboard-v2/dashboard-v2.tsx:827:                  type="button"
src/components/dashboard-v2/dashboard-v2.tsx:852:                </button>
src/components/dashboard-v2/dashboard-v2.tsx:903:                <button
src/components/dashboard-v2/dashboard-v2.tsx:905:                  type="button"
src/components/dashboard-v2/dashboard-v2.tsx:921:                </button>
src/components/dashboard-v2/dashboard-v2.tsx:939:                <button
src/components/dashboard-v2/dashboard-v2.tsx:941:                  type="button"
src/components/dashboard-v2/dashboard-v2.tsx:957:                </button>
src/components/dashboard-v2/dashboard-v2.tsx:1077:                <button
src/components/dashboard-v2/dashboard-v2.tsx:1078:                  type="button"
src/components/dashboard-v2/dashboard-v2.tsx:1084:                  {item.button}
src/components/dashboard-v2/dashboard-v2.tsx:1085:                </button>
src/components/dashboard-v2/dashboard-v2.tsx:1405:                  <button
src/components/dashboard-v2/dashboard-v2.tsx:1407:                    type="button"
src/components/dashboard-v2/dashboard-v2.tsx:1448:                  </button>
src/components/dashboard-v2/dashboard-v2.tsx:1454:        <button
src/components/dashboard-v2/dashboard-v2.tsx:1455:          type="button"
src/components/dashboard-v2/dashboard-v2.tsx:1462:        </button>
src/components/dashboard-v2/dashboard-card.tsx:52:    <button
src/components/dashboard-v2/dashboard-card.tsx:53:      type="button"
src/components/dashboard-v2/dashboard-card.tsx:67:    </button>
```
