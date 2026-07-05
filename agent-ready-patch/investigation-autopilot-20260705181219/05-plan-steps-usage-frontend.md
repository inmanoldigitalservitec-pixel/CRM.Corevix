## 05-plan-steps-usage-frontend
```
src/components/agent/agentWidgetContract.ts:39:  message?: string;
src/components/agent/agentWidgetContract.ts:40:  diagnosis: string;
src/components/agent/agentWidgetContract.ts:41:  recommended_steps: AgentWidgetRecommendedStep[];
src/components/agent/agentPromptPayloadAdapter.ts:36:  message?: string | null;
src/components/agent/agentPromptPayloadAdapter.ts:37:  diagnosis?: string | null;
src/components/agent/agentPromptPayloadAdapter.ts:80:  message?: string | null;
src/components/agent/agentPromptPayloadAdapter.ts:81:  diagnosis?: string | null;
src/components/agent/agentPromptPayloadAdapter.ts:82:  recommended_steps?: Array<{
src/components/agent/agentPromptPayloadAdapter.ts:86:  plan_steps?: Array<{
src/components/agent/agentPromptPayloadAdapter.ts:95:    message?: string | null;
src/components/agent/agentPromptPayloadAdapter.ts:205:    message: cleanText(
src/components/agent/agentPromptPayloadAdapter.ts:206:      plan.message,
src/components/agent/agentPromptPayloadAdapter.ts:209:    diagnosis: cleanText(
src/components/agent/agentPromptPayloadAdapter.ts:210:      plan.diagnosis,
src/components/agent/agentPromptPayloadAdapter.ts:213:    plan_steps: (plan.recommended_steps || []).map((step) => ({
src/components/agent/agentPromptPayloadAdapter.ts:214:      title: cleanText(step.title, "Paso"),
src/components/agent/agentPromptPayloadAdapter.ts:215:      description: cleanText(step.description, "Ejecutar este paso con validación."),
src/components/agent/agentPromptPayloadAdapter.ts:227:      message: cleanText(
src/components/agent/agentPromptPayloadAdapter.ts:241:  const steps = plan.plan_steps || plan.recommended_steps || [];
src/components/agent/agentPromptPayloadAdapter.ts:256:    message: cleanText(plan.message, "El agente preparó un plan de sanación para este caso."),
src/components/agent/agentPromptPayloadAdapter.ts:257:    diagnosis: cleanText(plan.diagnosis, "Este caso requiere revisión y una acción controlada."),
src/components/agent/agentPromptPayloadAdapter.ts:258:    plan_steps:
src/components/agent/agentPromptPayloadAdapter.ts:259:      steps.length > 0
src/components/agent/agentPromptPayloadAdapter.ts:260:        ? steps.map((step) => ({
src/components/agent/agentPromptPayloadAdapter.ts:261:            title: cleanText(step.title, "Paso"),
src/components/agent/agentPromptPayloadAdapter.ts:262:            description: cleanText(step.description, "Ejecutar este paso con validación."),
src/components/agent/agentPromptPayloadAdapter.ts:282:          message: cleanText(plan.result.message, "El plan quedó preparado."),
src/components/agent/agentPromptPayloadAdapter.ts:322:    message: cleanText(
src/components/agent/agentPromptPayloadAdapter.ts:323:      detectedCase.message || detectedCase.summary,
src/components/agent/agentPromptPayloadAdapter.ts:326:    diagnosis: cleanText(
src/components/agent/agentPromptPayloadAdapter.ts:327:      detectedCase.diagnosis || detectedCase.reason || detectedCase.summary,
src/components/agent/agentPromptPayloadAdapter.ts:330:    plan_steps: buildStepsFromDetectedCase(detectedCase),
src/components/agent/agentPromptPayloadAdapter.ts:334:      message: "Este plan fue generado localmente desde detected_cases hasta conectar el agente real.",
src/components/agent/AgentCommandWidget.css:238:.agent-event-message {
src/components/agent/AgentCommandWidget.css:331:.agent-step-title {
src/components/agent/AgentCommandWidget.css:374:.agent-command-widget.compact .agent-event-message {
src/components/agent/AgentCommandWidget.css:479:  animation: agentBlink 0.9s steps(2) infinite;
src/components/agent/AgentCommandWidget.tsx:12:  message: string;
src/components/agent/AgentCommandWidget.tsx:13:  diagnosis: string;
src/components/agent/AgentCommandWidget.tsx:14:  plan_steps: Array<{
src/components/agent/AgentCommandWidget.tsx:25:    message: string;
src/components/agent/AgentCommandWidget.tsx:82:    message: "Puedo reorganizar las tareas vencidas y priorizar las que requieren acción inmediata.",
src/components/agent/AgentCommandWidget.tsx:83:    diagnosis: "La agenda tiene tareas vencidas que pueden afectar entregas, seguimiento y cumplimiento con clientes.",
src/components/agent/AgentCommandWidget.tsx:84:    plan_steps: [
src/components/agent/AgentCommandWidget.tsx:116:      message: "El agente dejó organizada una ruta de sanación para las tareas vencidas.",
src/components/agent/AgentCommandWidget.tsx:192:  const text = `${plan.title} ${plan.message} ${plan.diagnosis}`.toLowerCase();
src/components/agent/AgentCommandWidget.tsx:216:  pills.push(`${plan.plan_steps.length} pasos`);
src/components/agent/AgentCommandWidget.tsx:232:    ...plan.plan_steps.map((step) => `paso: ${step.title.toLowerCase()}...`),
src/components/agent/AgentCommandWidget.tsx:260:    message: "No encontré acciones pendientes que requieran intervención del agente.",
src/components/agent/AgentCommandWidget.tsx:261:    diagnosis: "El agente no tiene contratos activos para mostrar en este momento.",
src/components/agent/AgentCommandWidget.tsx:262:    plan_steps: [
src/components/agent/AgentCommandWidget.tsx:271:      message: "No hay planes de recuperación pendientes.",
src/components/agent/AgentCommandWidget.tsx:367:    message: "El agente preparó el plan de sanación. La ejecución real requiere confirmación.",
src/components/agent/AgentCommandWidget.tsx:431:              <p className="agent-event-message">{selectedPlan.message || selectedPlan.diagnosis}</p>
src/components/agent/AgentCommandWidget.tsx:433:              <div className="agent-promise">{selectedPlan.diagnosis}</div>
src/components/agent/AgentCommandWidget.tsx:465:            {selectedPlan.plan_steps.map((step, index) => (
src/components/agent/AgentCommandWidget.tsx:466:              <div className="agent-plan-step" key={`${step.title}-${index}`}>
src/components/agent/AgentCommandWidget.tsx:469:                  <div className="agent-step-title">{step.title}</div>
src/components/agent/AgentCommandWidget.tsx:470:                  <div className="agent-step-copy">{step.description}</div>
src/components/agent/AgentCommandWidget.tsx:499:            <p className="agent-result-copy">{result.message}</p>
src/lib/agentClient.ts:107:  message?: string;
src/lib/agentClient.ts:119:  message?: string;
src/lib/agentClient.ts:137:  const reply = payload.reply || payload.response || payload.message || payload.content;
src/lib/agentClient.ts:149:    throw new Error(sessionResult.error.message);
src/lib/agentClient.ts:162:  message: string,
src/lib/agentClient.ts:187:      message,
src/lib/agentClient.ts:224:      payload.error || payload.message || `Error ${response.status} cargando planes del agente.`,
src/lib/agentClient.ts:232:    message: payload.message || null,
src/lib/agentClient.ts:264:        payload.message ||
src/lib/agentClient.ts:273:    message: payload.message || null,
src/lib/agentClient.ts:360:  error_message?: string | null;
src/lib/agentClient.ts:381:    .select("id, company_id, user_id, cycle_date, schema_version, status, contract_json, source_context_id, generated_by, error_message, created_at, updated_at")
```
