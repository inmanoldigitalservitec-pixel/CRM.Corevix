#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="agent-ready-patch/investigation-autopilot-$(date +%Y%m%d%H%M%S)"
mkdir -p "$OUT_DIR"

echo "📁 Output: $OUT_DIR"

run() {
  local name="$1"
  shift
  echo ""
  echo "============================================================"
  echo "▶ $name"
  echo "============================================================"
  {
    echo "## $name"
    echo "\`\`\`"
    "$@" 2>&1 || true
    echo "\`\`\`"
  } | tee "$OUT_DIR/$name.md"
}

run "01-git-status" git status --short

run "02-agent-component-files" find src/components/agent -maxdepth 2 -type f | sort

run "03-agent-client-routes" grep -R \
  "AGENT_URL\|agent/chat\|operating-context\|widget_contract\|fetchAgentWidgetContract\|fetchAgentPromptPayload\|refresh" \
  -n src/lib src/components/agent src/components/dashboard-v2 2>/dev/null

run "04-widget-buttons-and-selected-plan" grep -R \
  "Resolver con Autopilot\|Actualizar ahora\|selectedPlan\|availablePlans\|onResolve\|onRefresh\|primary\|button" \
  -n src/components/agent src/components/dashboard-v2 2>/dev/null

run "05-plan-steps-usage-frontend" grep -R \
  "plan_steps\|recommended_steps\|steps\|planSteps\|step.title\|step.description\|diagnosis\|message" \
  -n src/components/agent src/lib/agentClient.ts src/components/dashboard-v2 2>/dev/null

run "06-agent-command-widget-full" sed -n '1,340p' src/components/agent/AgentCommandWidget.tsx

run "07-agent-command-widget-connected-full" sed -n '1,260p' src/components/agent/AgentCommandWidgetConnected.tsx

run "08-agent-payload-adapter-full" sed -n '1,340p' src/components/agent/agentPromptPayloadAdapter.ts

run "09-agent-client-full" sed -n '1,280p' src/lib/agentClient.ts

run "10-dashboard-agent-integration" grep -R \
  "AgentCommandWidget\|fetchAgentWidgetContract\|refreshAgentPromptPayload\|agentPromptPayload\|setAgentPromptPayload" \
  -n src/components/dashboard-v2 src/pages src/app 2>/dev/null

run "11-dashboard-v2-relevant" sed -n '1,260p' src/components/dashboard-v2/dashboard-v2.tsx

run "12-worker-routes" grep -R \
  "url.pathname\|handleAgentChat\|handleAgentOperatingContextRefresh\|handleTodayAgentOperatingContext\|handle.*Agent\|/agent/" \
  -n apps/agent-worker/src/index.ts apps/agent-worker/src 2>/dev/null

run "13-worker-chat-openclaw-flow" sed -n '360,590p' apps/agent-worker/src/index.ts

run "14-worker-tool-execution-flow" grep -R \
  "function parseToolCall\|function executeTool\|async function executeTool\|AVAILABLE_TOOLS\|getToolsForScope\|buildSystemPrompt\|buildFinalResponsePrompt" \
  -n apps/agent-worker/src 2>/dev/null

run "15-worker-tool-execution-details-index" sed -n '590,860p' apps/agent-worker/src/index.ts

run "16-worker-contract-builder" sed -n '1,380p' apps/agent-worker/src/agent-widget-contract.ts

run "17-worker-operating-context-refresh" sed -n '430,560p' apps/agent-worker/src/agent-operating-context.ts

run "18-worker-types" sed -n '1,180p' apps/agent-worker/src/types.ts

run "19-package-scripts" sh -c 'cat package.json && echo "\n--- agent-worker ---" && cat apps/agent-worker/package.json'

run "20-current-contract-reader-hints" grep -R \
  "agent_widget_contracts\|contract_json\|recovery_plans\|AgentWidgetContract" \
  -n src apps/agent-worker/src 2>/dev/null

cat > "$OUT_DIR/SUMMARY.md" <<'SUMMARY'
# Investigación Autopilot Widget Execution

Revisar en este orden:

1. `04-widget-buttons-and-selected-plan.md`
   - Identificar qué hace “Resolver con Autopilot”.
   - Identificar qué hace “Actualizar ahora”.

2. `05-plan-steps-usage-frontend.md`
   - Ver si `plan_steps` llega al frontend.
   - Ver si se renderiza o se pierde en adapter/componente.

3. `08-agent-payload-adapter-full.md`
   - Confirmar mapping:
     - recovery_plans[].plan_steps
     - recommended_steps
     - actions
     - requires_confirmation

4. `13-worker-chat-openclaw-flow.md`
   - Reutilizar flujo actual de OpenClaw.
   - No crear integración nueva.

5. `14-worker-tool-execution-flow.md` y `15-worker-tool-execution-details-index.md`
   - Ver cómo se detectan tool calls.
   - Ver cómo se ejecutan tools.
   - Definir cómo enviar un plan seleccionado a ese mismo flujo.

6. `16-worker-contract-builder.md`
   - Confirmar estructura final de recovery_plan.

Objetivo del próximo patch:

- Mostrar bullets del plan en el widget.
- Mantener botón principal como “Resolver con Autopilot”.
- Revisar/decidir si “Actualizar ahora” queda como refresh secundario.
- Crear o conectar ruta para ejecutar el recovery_plan seleccionado usando el mismo sistema de `/agent/chat`.
SUMMARY

echo ""
echo "✅ Investigación completada."
echo "📁 Carpeta creada: $OUT_DIR"
echo ""
echo "Para ver resumen:"
echo "cat $OUT_DIR/SUMMARY.md"
echo ""
echo "Para empaquetar y compartir si hace falta:"
echo "zip -r ${OUT_DIR}.zip $OUT_DIR"
