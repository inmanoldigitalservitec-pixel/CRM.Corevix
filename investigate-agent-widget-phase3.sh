#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Agent Widget Phase 3 Investigation"
echo "=========================================="
echo ""

OUT_DIR="./agent-ready-patch/phase3-investigation-$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/report.md"

mkdir -p "$OUT_DIR"

echo "# Agent Widget Phase 3 Investigation" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "1) Revisando archivos del widget..."
echo "## Widget Files" >> "$REPORT"
echo "" >> "$REPORT"

FILES=(
  "./src/components/agent/AgentCommandWidget.tsx"
  "./src/components/agent/AgentCommandWidget.css"
  "./src/components/agent/index.ts"
  "./src/components/dashboard-v2/dashboard-v2.tsx"
  "./apps/agent-worker/src/agent-operating-context.ts"
  "./src/lib/agentClient.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "OK: $file"
    echo "- OK: \`$file\`" >> "$REPORT"
  else
    echo "MISSING: $file"
    echo "- MISSING: \`$file\`" >> "$REPORT"
  fi
done

echo "" >> "$REPORT"

echo ""
echo "2) Buscando uso actual del widget..."
echo "## Current Widget Usage" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn "AgentCommandWidget\|AgentCommandWidgetConnected\|DashboardAgentAutopilotWidget" ./src ./apps 2>/dev/null | tee "$OUT_DIR/widget-usage.txt" || true
cat "$OUT_DIR/widget-usage.txt" >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "3) Revisando exports de src/components/agent/index.ts..."
echo "## Agent Index Exports" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/index.ts" ]; then
  cat "./src/components/agent/index.ts" | tee "$OUT_DIR/agent-index.txt"
  echo '```ts' >> "$REPORT"
  cat "./src/components/agent/index.ts" >> "$REPORT"
  echo '```' >> "$REPORT"
else
  echo "No existe ./src/components/agent/index.ts" | tee "$OUT_DIR/agent-index.txt"
fi

echo "" >> "$REPORT"

echo ""
echo "4) Revisando si ya existe agent_prompt_payload..."
echo "## agent_prompt_payload / context_json Search" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn "agent_prompt_payload\|context_json\|detected_cases\|recovery_plans\|suggested_actions" ./src ./apps ./supabase 2>/dev/null | tee "$OUT_DIR/payload-search.txt" || true
cat "$OUT_DIR/payload-search.txt" >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "5) Revisando estructura de agent-operating-context..."
echo "## Agent Operating Context Relevant Blocks" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./apps/agent-worker/src/agent-operating-context.ts" ]; then
  grep -n "schema_version\|detected_cases\|agent_brief\|recovery_plans\|plans:\|contextJson\|buildAgentOperatingContextPayload" ./apps/agent-worker/src/agent-operating-context.ts | tee "$OUT_DIR/operating-context-markers.txt" || true
  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/operating-context-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"

  echo "" >> "$REPORT"
  echo "### Payload block estimate" >> "$REPORT"
  echo '```ts' >> "$REPORT"
  sed -n '360,430p' ./apps/agent-worker/src/agent-operating-context.ts >> "$REPORT" || true
  echo '```' >> "$REPORT"
fi

echo ""
echo "6) Revisando cliente actual del agente..."
echo "## Agent Client" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/lib/agentClient.ts" ]; then
  grep -n "fetchAgent\|AgentDaily\|operating\|context\|daily_plans\|agent_daily_plans" ./src/lib/agentClient.ts | tee "$OUT_DIR/agent-client-markers.txt" || true
  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/agent-client-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "7) Revisando aliases de TypeScript/Vite..."
echo "## Alias Config" >> "$REPORT"
echo "" >> "$REPORT"

for config in tsconfig.json vite.config.ts vite.config.js; do
  if [ -f "$config" ]; then
    echo "### $config" >> "$REPORT"
    echo '```json' >> "$REPORT"
    grep -n "\"@/\\|alias\\|paths\\|baseUrl" "$config" >> "$REPORT" || true
    echo '```' >> "$REPORT"
  fi
done

echo ""
echo "8) Revisando package scripts..."
echo "## Package Scripts" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f package.json ]; then
  node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts||{}, null, 2))" | tee "$OUT_DIR/package-scripts.json"
  echo '```json' >> "$REPORT"
  cat "$OUT_DIR/package-scripts.json" >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "9) Ejecutando chequeo TypeScript/build dry..."
echo "## Build Check" >> "$REPORT"
echo "" >> "$REPORT"

if npm run 2>/dev/null | grep -q "typecheck"; then
  echo "Running npm run typecheck..."
  if npm run typecheck > "$OUT_DIR/typecheck.log" 2>&1; then
    echo "OK: npm run typecheck pasó"
    echo "- OK: \`npm run typecheck\` pasó" >> "$REPORT"
  else
    echo "FAIL: npm run typecheck falló"
    echo "- FAIL: \`npm run typecheck\` falló" >> "$REPORT"
    echo '```txt' >> "$REPORT"
    tail -120 "$OUT_DIR/typecheck.log" >> "$REPORT"
    echo '```' >> "$REPORT"
  fi
else
  echo "No hay script typecheck. Saltando."
  echo "- No hay script \`typecheck\`. Saltando." >> "$REPORT"
fi

echo ""
echo "10) Generando recomendaciones automáticas..."
echo "## Recommendations" >> "$REPORT"
echo "" >> "$REPORT"

HAS_WIDGET=$(grep -RIl "export function AgentCommandWidget" ./src/components/agent 2>/dev/null || true)
HAS_CONNECTED=$(grep -RIl "AgentCommandWidgetConnected" ./src/components/agent 2>/dev/null || true)
HAS_PAYLOAD=$(grep -RIl "detected_cases" ./apps/agent-worker/src/agent-operating-context.ts ./src 2>/dev/null || true)
HAS_OLD_AUTOPILOT=$(grep -RIl "DashboardAgentAutopilotWidget" ./src 2>/dev/null || true)

if [ -n "$HAS_WIDGET" ]; then
  echo "- OK: Existe \`AgentCommandWidget\`." >> "$REPORT"
else
  echo "- WARNING: No encontré \`AgentCommandWidget\` exportado como función." >> "$REPORT"
fi

if [ -n "$HAS_CONNECTED" ]; then
  echo "- OK: Ya existe o se menciona \`AgentCommandWidgetConnected\`." >> "$REPORT"
else
  echo "- PENDING: Todavía no existe \`AgentCommandWidgetConnected\`. Fase 3 debe crearlo." >> "$REPORT"
fi

if [ -n "$HAS_PAYLOAD" ]; then
  echo "- OK: Hay estructura relacionada con \`detected_cases\`." >> "$REPORT"
else
  echo "- WARNING: No encontré \`detected_cases\`; revisar generación del payload antes de conectar." >> "$REPORT"
fi

if [ -n "$HAS_OLD_AUTOPILOT" ]; then
  echo "- WARNING: Todavía aparece \`DashboardAgentAutopilotWidget\`. Puede chocar con el nuevo widget." >> "$REPORT"
else
  echo "- OK: No aparece \`DashboardAgentAutopilotWidget\`." >> "$REPORT"
fi

echo ""
echo "=========================================="
echo " Investigación terminada"
echo "=========================================="
echo ""
echo "Reporte:"
echo "$REPORT"
echo ""
echo "Archivos útiles:"
echo "- $OUT_DIR/widget-usage.txt"
echo "- $OUT_DIR/payload-search.txt"
echo "- $OUT_DIR/operating-context-markers.txt"
echo "- $OUT_DIR/agent-client-markers.txt"
echo ""
echo "Para ver el reporte:"
echo "cat $REPORT"
