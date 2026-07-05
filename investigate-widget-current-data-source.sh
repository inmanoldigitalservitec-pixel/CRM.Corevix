#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Investigating Agent Widget Data Source"
echo "=========================================="
echo ""

OUT_DIR="./agent-ready-patch/widget-source-investigation-$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/report.md"

mkdir -p "$OUT_DIR"

FILES=(
  "./src/lib/agentClient.ts"
  "./src/components/dashboard-v2/dashboard-v2.tsx"
  "./src/components/agent/AgentCommandWidget.tsx"
  "./src/components/agent/AgentCommandWidgetConnected.tsx"
  "./src/components/agent/agentPromptPayloadAdapter.ts"
  "./src/components/agent/index.ts"
)

echo "# Agent Widget Data Source Investigation" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "1) Checking file existence..."
echo "## File existence" >> "$REPORT"
echo "" >> "$REPORT"

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
echo "2) Searching table reads in src..."
echo "## Supabase table reads" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  ".from(\"agent_widget_contracts\"\|.from('agent_widget_contracts'\|.from(\"agent_operating_context\"\|.from('agent_operating_context'\|agent_widget_contracts\|agent_operating_context" \
  ./src ./apps 2>/dev/null \
  | grep -v ".wrangler/tmp" \
  | tee "$OUT_DIR/table-reads.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/table-reads.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "3) Inspecting agentClient fetch functions..."
echo "## agentClient fetch functions" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/lib/agentClient.ts" ]; then
  grep -n "fetchAgentWidgetContract\|fetchAgentPromptPayload\|agent_widget_contracts\|agent_operating_context\|maybeSingle\|contract_json\|context_json" \
    ./src/lib/agentClient.ts \
    | tee "$OUT_DIR/agent-client-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/agent-client-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  WIDGET_LINE=$(grep -n "export async function fetchAgentWidgetContract" ./src/lib/agentClient.ts | head -1 | cut -d: -f1 || true)
  if [ -n "${WIDGET_LINE:-}" ]; then
    FROM=$((WIDGET_LINE - 25))
    TO=$((WIDGET_LINE + 90))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### fetchAgentWidgetContract block" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/lib/agentClient.ts >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi

  PROMPT_LINE=$(grep -n "export async function fetchAgentPromptPayload" ./src/lib/agentClient.ts | head -1 | cut -d: -f1 || true)
  if [ -n "${PROMPT_LINE:-}" ]; then
    FROM=$((PROMPT_LINE - 25))
    TO=$((PROMPT_LINE + 90))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### fetchAgentPromptPayload block" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/lib/agentClient.ts >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi
fi

echo ""
echo "4) Inspecting dashboard refresh function..."
echo "## Dashboard refresh function" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/dashboard-v2/dashboard-v2.tsx" ]; then
  grep -n "fetchAgentWidgetContract\|fetchAgentPromptPayload\|refreshAgentPromptPayload\|setAgentPromptPayload\|AgentCommandWidgetConnected\|AgentCommandWidget" \
    ./src/components/dashboard-v2/dashboard-v2.tsx \
    | tee "$OUT_DIR/dashboard-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/dashboard-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  REFRESH_LINE=$(grep -n "const refreshAgentPromptPayload" ./src/components/dashboard-v2/dashboard-v2.tsx | head -1 | cut -d: -f1 || true)
  if [ -n "${REFRESH_LINE:-}" ]; then
    FROM=$((REFRESH_LINE - 30))
    TO=$((REFRESH_LINE + 95))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### refreshAgentPromptPayload area" >> "$REPORT"
    echo '```tsx' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/components/dashboard-v2/dashboard-v2.tsx >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi

  RENDER_LINE=$(grep -n "AgentCommandWidgetConnected\|AgentCommandWidget" ./src/components/dashboard-v2/dashboard-v2.tsx | tail -10 | head -1 | cut -d: -f1 || true)
  if [ -n "${RENDER_LINE:-}" ]; then
    FROM=$((RENDER_LINE - 30))
    TO=$((RENDER_LINE + 40))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### widget render area" >> "$REPORT"
    echo '```tsx' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/components/dashboard-v2/dashboard-v2.tsx >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi
fi

echo ""
echo "5) Inspecting connected widget..."
echo "## AgentCommandWidgetConnected" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/AgentCommandWidgetConnected.tsx" ]; then
  grep -n "payload\|agentPromptPayloadToRecoveryPlans\|AgentCommandWidget\|onAnalyzeNow\|isLoading" \
    ./src/components/agent/AgentCommandWidgetConnected.tsx \
    | tee "$OUT_DIR/connected-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/connected-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"

  echo "" >> "$REPORT"
  echo "### Full connected component" >> "$REPORT"
  echo '```tsx' >> "$REPORT"
  cat ./src/components/agent/AgentCommandWidgetConnected.tsx >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"
fi

echo ""
echo "6) Inspecting widget button/onAnalyzeNow usage..."
echo "## AgentCommandWidget button/onAnalyzeNow usage" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/AgentCommandWidget.tsx" ]; then
  grep -n "onAnalyzeNow\|button\|Refresh\|Actualizar\|Analizar\|isLoading\|handleAnalyze\|analyze" \
    ./src/components/agent/AgentCommandWidget.tsx \
    | tee "$OUT_DIR/widget-button-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/widget-button-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  ON_ANALYZE_LINE=$(grep -n "onAnalyzeNow" ./src/components/agent/AgentCommandWidget.tsx | head -1 | cut -d: -f1 || true)
  if [ -n "${ON_ANALYZE_LINE:-}" ]; then
    FROM=$((ON_ANALYZE_LINE - 40))
    TO=$((ON_ANALYZE_LINE + 220))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### onAnalyzeNow area" >> "$REPORT"
    echo '```tsx' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/components/agent/AgentCommandWidget.tsx >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi
fi

echo ""
echo "7) Inspecting adapter source priority..."
echo "## Adapter source priority" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/agentPromptPayloadAdapter.ts" ]; then
  grep -n "isAgentWidgetContractV1\|widget_contract\|agent_widget_contract\|recovery_plans\|detected_cases\|agentPromptPayloadToRecoveryPlans\|normalizeWidgetContractRecoveryPlan" \
    ./src/components/agent/agentPromptPayloadAdapter.ts \
    | tee "$OUT_DIR/adapter-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/adapter-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  CONVERT_LINE=$(grep -n "export function agentPromptPayloadToRecoveryPlans" ./src/components/agent/agentPromptPayloadAdapter.ts | head -1 | cut -d: -f1 || true)
  if [ -n "${CONVERT_LINE:-}" ]; then
    FROM=$((CONVERT_LINE - 80))
    TO=$((CONVERT_LINE + 70))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### agentPromptPayloadToRecoveryPlans area" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/components/agent/agentPromptPayloadAdapter.ts >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  fi
fi

echo ""
echo "8) Searching duplicate widgets or old mounts..."
echo "## Duplicate widget mounts" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn "AgentCommandWidget\|AgentCommandWidgetConnected\|Corevix Autopilot\|Autopilot" ./src 2>/dev/null \
  | grep -v ".wrangler/tmp" \
  | tee "$OUT_DIR/duplicate-widget-mounts.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/duplicate-widget-mounts.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "9) Checking for debug artifacts still in code..."
echo "## Debug artifacts" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn "window.alert\|AgentWidgetContractAlert\|AgentWidgetSourceDebug\|agent-widget-source-badge\|showAgentWidgetSourceBadge\|debugAgentWidgetContract" ./src 2>/dev/null \
  | tee "$OUT_DIR/debug-artifacts.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/debug-artifacts.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "10) Build smoke check..."
echo "## Build smoke check" >> "$REPORT"
echo "" >> "$REPORT"

if npm run build > "$OUT_DIR/build.log" 2>&1; then
  echo "OK: npm run build passed"
  echo "- OK: \`npm run build\` passed." >> "$REPORT"
else
  echo "FAIL: npm run build failed"
  echo "- FAIL: \`npm run build\` failed." >> "$REPORT"
  echo '```txt' >> "$REPORT"
  tail -160 "$OUT_DIR/build.log" >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "11) Summary recommendations..."
echo "## Investigation summary" >> "$REPORT"
echo "" >> "$REPORT"

HAS_WIDGET_FETCH=$(grep -RIn ".from(\"agent_widget_contracts\"\|.from('agent_widget_contracts'" ./src/lib/agentClient.ts 2>/dev/null || true)
HAS_CONTEXT_FETCH=$(grep -RIn ".from(\"agent_operating_context\"\|.from('agent_operating_context'" ./src/lib/agentClient.ts 2>/dev/null || true)
DASH_USES_WIDGET=$(grep -RIn "fetchAgentWidgetContract" ./src/components/dashboard-v2/dashboard-v2.tsx 2>/dev/null || true)
WIDGET_USES_ON_ANALYZE=$(grep -RIn "onAnalyzeNow" ./src/components/agent/AgentCommandWidget.tsx 2>/dev/null || true)
CONNECTED_PASSES_ON_ANALYZE=$(grep -RIn "onAnalyzeNow={onAnalyzeNow}" ./src/components/agent/AgentCommandWidgetConnected.tsx 2>/dev/null || true)
RENDER_PASSES_REFRESH=$(grep -RIn "onAnalyzeNow={refreshAgentPromptPayload}" ./src/components/dashboard-v2/dashboard-v2.tsx 2>/dev/null || true)
DEBUG_LEFT=$(grep -RIn "window.alert\|AgentWidgetContractAlert\|AgentWidgetSourceDebug\|agent-widget-source-badge\|showAgentWidgetSourceBadge\|debugAgentWidgetContract" ./src 2>/dev/null || true)

if [ -n "$HAS_WIDGET_FETCH" ]; then
  echo "- OK: agentClient.ts contains a direct read from \`agent_widget_contracts\`." >> "$REPORT"
else
  echo "- PROBLEM: agentClient.ts does NOT contain a direct read from \`agent_widget_contracts\`." >> "$REPORT"
fi

if [ -n "$HAS_CONTEXT_FETCH" ]; then
  echo "- OK: agentClient.ts still contains fallback/read from \`agent_operating_context\`." >> "$REPORT"
else
  echo "- WARNING: No fallback/read from \`agent_operating_context\` found in agentClient.ts." >> "$REPORT"
fi

if [ -n "$DASH_USES_WIDGET" ]; then
  echo "- OK: dashboard-v2.tsx references \`fetchAgentWidgetContract\`." >> "$REPORT"
else
  echo "- PROBLEM: dashboard-v2.tsx does NOT reference \`fetchAgentWidgetContract\`." >> "$REPORT"
fi

if [ -n "$WIDGET_USES_ON_ANALYZE" ]; then
  echo "- CHECK: AgentCommandWidget.tsx references \`onAnalyzeNow\`. Inspect whether it is attached to the actual button." >> "$REPORT"
else
  echo "- PROBLEM: AgentCommandWidget.tsx does NOT reference \`onAnalyzeNow\`; the refresh button cannot call the dashboard fetch." >> "$REPORT"
fi

if [ -n "$CONNECTED_PASSES_ON_ANALYZE" ]; then
  echo "- OK: AgentCommandWidgetConnected passes \`onAnalyzeNow\` into AgentCommandWidget." >> "$REPORT"
else
  echo "- PROBLEM: AgentCommandWidgetConnected may not pass \`onAnalyzeNow\` into AgentCommandWidget." >> "$REPORT"
fi

if [ -n "$RENDER_PASSES_REFRESH" ]; then
  echo "- OK: dashboard render passes \`refreshAgentPromptPayload\` to widget." >> "$REPORT"
else
  echo "- PROBLEM: dashboard render may not pass \`refreshAgentPromptPayload\` to widget." >> "$REPORT"
fi

if [ -n "$DEBUG_LEFT" ]; then
  echo "- WARNING: debug artifacts remain in code. Review \`debug-artifacts.txt\`." >> "$REPORT"
else
  echo "- OK: no temporary debug artifacts found." >> "$REPORT"
fi

echo ""
echo "=========================================="
echo " Investigation complete"
echo "=========================================="
echo ""
echo "Report:"
echo "$REPORT"
echo ""
echo "Key files:"
echo "- $OUT_DIR/table-reads.txt"
echo "- $OUT_DIR/agent-client-markers.txt"
echo "- $OUT_DIR/dashboard-markers.txt"
echo "- $OUT_DIR/widget-button-markers.txt"
echo "- $OUT_DIR/adapter-markers.txt"
echo "- $OUT_DIR/duplicate-widget-mounts.txt"
echo "- $OUT_DIR/debug-artifacts.txt"
echo "- $OUT_DIR/build.log"
echo ""
echo "Paste this next:"
echo "cat $REPORT"
