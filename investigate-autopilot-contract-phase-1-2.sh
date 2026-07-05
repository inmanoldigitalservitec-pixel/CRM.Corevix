#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "FASE 1-2 INVESTIGATION: Autopilot Case Contract"
echo "============================================================"
echo ""

echo "============================================================"
echo "01 - Worker files map"
echo "============================================================"
find apps/agent-worker/src -maxdepth 3 -type f | sort

echo ""
echo "============================================================"
echo "02 - agent-operating-context.ts completo"
echo "============================================================"
sed -n '1,320p' apps/agent-worker/src/agent-operating-context.ts || true

echo ""
echo "============================================================"
echo "03 - agent-daily-plans.ts completo"
echo "============================================================"
sed -n '1,420p' apps/agent-worker/src/agent-daily-plans.ts || true

echo ""
echo "============================================================"
echo "04 - agent-widget-contract.ts completo"
echo "============================================================"
sed -n '1,420p' apps/agent-worker/src/agent-widget-contract.ts || true

echo ""
echo "============================================================"
echo "05 - index.ts widget contract prompt / validator"
echo "============================================================"
grep -n -C 35 \
  "compactAgentContextForWidget\|buildWidgetContractPrompt\|validateOpenClawWidgetContract\|askOpenClawForWidgetContract\|agent_widget_contract" \
  apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "06 - Types relacionados al agente"
echo "============================================================"
sed -n '1,260p' apps/agent-worker/src/types.ts || true

echo ""
echo "============================================================"
echo "07 - Frontend contract type"
echo "============================================================"
sed -n '1,280p' src/components/agent/agentWidgetContract.ts || true

echo ""
echo "============================================================"
echo "08 - Frontend adapter completo"
echo "============================================================"
sed -n '1,460p' src/components/agent/agentPromptPayloadAdapter.ts || true

echo ""
echo "============================================================"
echo "09 - AgentCommandWidget types y render"
echo "============================================================"
sed -n '1,540p' src/components/agent/AgentCommandWidget.tsx || true

echo ""
echo "============================================================"
echo "10 - agentClient widget/daily/contract fetch"
echo "============================================================"
grep -n -C 35 \
  "fetchAgentWidgetContract\|agent_widget_contracts\|fetchAgentDailyPlans\|syncAgentDailyPlans\|refreshAgentOperatingContext\|executeAgentWidgetPlan" \
  src/lib/agentClient.ts || true

echo ""
echo "============================================================"
echo "11 - Supabase table references"
echo "============================================================"
grep -RIn \
  "agent_operating_context\|agent_daily_plans\|agent_widget_contracts\|dashboard_layouts" \
  apps src supabase \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.wrangler \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "12 - Search for source/evidence/event fields"
echo "============================================================"
grep -RIn \
  "source_context\|source_records\|source_event\|source_events\|source_modules\|source_memory\|detected_cases\|references\|evidence\|excerpt\|snapshot\|metadata\|href\|full_record" \
  apps/agent-worker/src src/components/agent src/lib \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "13 - Tools args summary from worker prompt"
echo "============================================================"
grep -n -A 120 "const TOOL_ARGS" apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "14 - Tool router available tools"
echo "============================================================"
sed -n '1,240p' apps/agent-worker/src/tool-router.ts || true

echo ""
echo "============================================================"
echo "15 - Database migrations related to agent tables"
echo "============================================================"
find supabase -type f | sort | while read -r file; do
  if grep -q "agent_operating_context\|agent_daily_plans\|agent_widget_contracts" "$file"; then
    echo ""
    echo "-------------------- $file --------------------"
    sed -n '1,260p' "$file"
  fi
done

echo ""
echo "============================================================"
echo "16 - Git diff actual"
echo "============================================================"
git diff -- \
  apps/agent-worker/src/agent-operating-context.ts \
  apps/agent-worker/src/agent-daily-plans.ts \
  apps/agent-worker/src/agent-widget-contract.ts \
  apps/agent-worker/src/index.ts \
  src/components/agent/agentWidgetContract.ts \
  src/components/agent/agentPromptPayloadAdapter.ts \
  src/components/agent/AgentCommandWidget.tsx \
  src/lib/agentClient.ts || true

echo ""
echo "============================================================"
echo "17 - Typecheck actual"
echo "============================================================"
npx tsc --noEmit || true

echo ""
echo "============================================================"
echo "RESUMEN PARA PEGARME"
echo "============================================================"
echo "Pégame especialmente las secciones:"
echo "- 03 agent-daily-plans.ts"
echo "- 04 agent-widget-contract.ts"
echo "- 05 index.ts widget contract prompt / validator"
echo "- 07 Frontend contract type"
echo "- 08 Frontend adapter"
echo "- 12 source/evidence/event fields"
echo "- 15 Database migrations"
echo ""
echo "✅ Investigación terminada. No se modificó ningún archivo."
