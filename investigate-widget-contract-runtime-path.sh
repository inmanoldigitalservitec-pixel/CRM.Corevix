#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "INVESTIGACION: Runtime path del widget contract"
echo "============================================================"

echo ""
echo "============================================================"
echo "01 - Confirmar worker vivo y health"
echo "============================================================"
curl -s http://127.0.0.1:8787/health || true
echo ""

echo ""
echo "============================================================"
echo "02 - Confirmar env frontend"
echo "============================================================"
grep -n "VITE_AGENT_URL" .env.local || true

echo ""
echo "============================================================"
echo "03 - Confirmar env worker sin secretos"
echo "============================================================"
if [ -f apps/agent-worker/.dev.vars ]; then
  sed -E \
    -e 's/(SUPABASE_SERVICE_ROLE_KEY=).+/\1***MASKED***/' \
    -e 's/(OPENCLAW_GATEWAY_TOKEN=).+/\1***MASKED***/' \
    apps/agent-worker/.dev.vars
else
  echo "No existe apps/agent-worker/.dev.vars"
fi

echo ""
echo "============================================================"
echo "04 - Rutas del worker registradas"
echo "============================================================"
grep -n -C 4 \
  "agent/operating-context/refresh\|agent_widget_contract\|askOpenClawForWidgetContract\|writeAgentWidgetContractPayload\|writeAgentWidgetContractFromDailyPlans" \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/agent-operating-context.ts \
  apps/agent-worker/src/agent-widget-contract.ts || true

echo ""
echo "============================================================"
echo "05 - Ver bloque completo handleAgentOperatingContextRefresh"
echo "============================================================"
grep -n "async function handleAgentOperatingContextRefresh" apps/agent-worker/src/index.ts || true
sed -n '330,395p' apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "06 - Ver askOpenClawForWidgetContract completo"
echo "============================================================"
grep -n "async function askOpenClawForWidgetContract" apps/agent-worker/src/index.ts || true
sed -n '680,735p' apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "07 - Ver validateOpenClawWidgetContract completo"
echo "============================================================"
grep -n "function validateOpenClawWidgetContract" apps/agent-worker/src/index.ts || true
sed -n '740,825p' apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "08 - Buscar si hay más de una validate/ask/build prompt"
echo "============================================================"
grep -RIn \
  "function validateOpenClawWidgetContract\|async function askOpenClawForWidgetContract\|function buildWidgetContractPrompt\|function compactAgentContextForWidget" \
  apps/agent-worker/src \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "09 - Buscar si se sigue usando actions en vez de suggested_actions"
echo "============================================================"
grep -RIn \
  "\"actions\"\|\\.actions\|suggested_actions\|source_context_excerpt\|source_records\|context_refs" \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/agent-widget-contract.ts \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "10 - Ver contract writer completo"
echo "============================================================"
grep -n "export async function writeAgentWidgetContractPayload" apps/agent-worker/src/agent-widget-contract.ts || true
sed -n '380,465p' apps/agent-worker/src/agent-widget-contract.ts || true

echo ""
echo "============================================================"
echo "11 - Ver si TypeScript realmente compila worker con errores"
echo "============================================================"
cd apps/agent-worker
npx tsc --noEmit || true
cd ../..

echo ""
echo "============================================================"
echo "12 - Probar refresh directo con debug y guardar respuesta"
echo "============================================================"
echo "Necesita token real del frontend. Si no hay token, este paso puede fallar."
echo "Abre DevTools > Application > Local Storage y copia access_token si quieres probar manual."
echo "Saltando llamada autenticada automática."

echo ""
echo "============================================================"
echo "13 - Buscar logs debug disponibles en worker"
echo "============================================================"
grep -RIn \
  "console.log\|logPromptStats\|openclaw_widget_contract\|promptStats\|debugEnabled" \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/agent-widget-contract.ts \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "14 - Ver diffs activos relevantes"
echo "============================================================"
git diff -- \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/agent-widget-contract.ts \
  src/components/agent/agentWidgetContract.ts \
  src/components/agent/agentPromptPayloadAdapter.ts \
  src/components/agent/AgentCommandWidget.tsx \
  src/lib/agentClient.ts | sed -n '1,360p'

echo ""
echo "============================================================"
echo "RESUMEN"
echo "============================================================"
echo "Pégame especialmente:"
echo "- 05 handleAgentOperatingContextRefresh"
echo "- 06 askOpenClawForWidgetContract"
echo "- 07 validateOpenClawWidgetContract"
echo "- 10 writeAgentWidgetContractPayload"
echo "- 11 typecheck worker"
echo ""
echo "✅ Investigación terminada. No modificó archivos."
