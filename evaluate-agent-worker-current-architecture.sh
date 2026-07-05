#!/usr/bin/env bash

set -euo pipefail

OUT_DIR="./agent-ready-patch/phase5-pre-evaluation-$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/report.md"

mkdir -p "$OUT_DIR"

echo "# Phase 5 Pre-Evaluation: Agent Worker Current Architecture" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "=========================================="
echo " Phase 5 Pre-Evaluation"
echo "=========================================="
echo ""

echo "1) Listing agent-worker structure..."
echo "## apps/agent-worker structure" >> "$REPORT"
echo "" >> "$REPORT"

find ./apps/agent-worker -maxdepth 4 -type f \
  | sort \
  | tee "$OUT_DIR/agent-worker-files.txt"

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/agent-worker-files.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "2) Searching Supabase usage in worker..."
echo "## Supabase usage in worker" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  "createClient\|SUPABASE\|supabase\|service_role\|SERVICE_ROLE\|from('" \
  ./apps/agent-worker ./src/lib ./src/integrations 2>/dev/null \
  | tee "$OUT_DIR/supabase-usage.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/supabase-usage.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "3) Searching agent_operating_context flow..."
echo "## agent_operating_context flow" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  "agent_operating_context\|context_json\|detected_cases\|agent_prompt_payload\|refreshOperatingContext\|operating context" \
  ./apps/agent-worker ./src ./supabase 2>/dev/null \
  | tee "$OUT_DIR/operating-context-flow.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/operating-context-flow.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "4) Searching existing agent widget contract references..."
echo "## agent_widget_contracts references" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  "agent_widget_contracts\|agent_widget_contract_v1\|AgentWidgetContract\|widget_contract\|contract_json" \
  ./apps/agent-worker ./src ./supabase 2>/dev/null \
  | tee "$OUT_DIR/widget-contract-references.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/widget-contract-references.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "5) Inspecting key worker files..."
echo "## Key worker files" >> "$REPORT"
echo "" >> "$REPORT"

KEY_FILES=(
  "./apps/agent-worker/src/index.ts"
  "./apps/agent-worker/src/agent-operating-context.ts"
  "./apps/agent-worker/package.json"
  "./apps/agent-worker/tsconfig.json"
  "./src/lib/agentClient.ts"
  "./src/components/agent/agentWidgetContract.ts"
  "./src/components/agent/agentPromptPayloadAdapter.ts"
)

for file in "${KEY_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Inspecting $file"
    echo "### $file" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n '1,260p' "$file" >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  else
    echo "Missing $file"
    echo "### Missing: $file" >> "$REPORT"
    echo "" >> "$REPORT"
  fi
done

echo ""
echo "6) Inspecting important sections around writes/loads..."
echo "## Focused sections" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./apps/agent-worker/src/agent-operating-context.ts" ]; then
  echo "### agent-operating-context.ts focused markers" >> "$REPORT"
  echo '```txt' >> "$REPORT"
  grep -n \
    "export async\|function\|from('agent_operating_context'\|insert\|upsert\|update\|context_json\|detected_cases" \
    ./apps/agent-worker/src/agent-operating-context.ts >> "$REPORT" || true
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  while read -r line; do
    LINE_NO="$(echo "$line" | cut -d: -f1)"
    FROM=$((LINE_NO - 35))
    TO=$((LINE_NO + 70))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### agent-operating-context.ts around line $LINE_NO" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./apps/agent-worker/src/agent-operating-context.ts >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  done < <(grep -n "from('agent_operating_context'\|from(\"agent_operating_context\"\|insert\|upsert\|update" ./apps/agent-worker/src/agent-operating-context.ts | head -12 || true)
fi

if [ -f "./apps/agent-worker/src/index.ts" ]; then
  echo "### index.ts focused markers" >> "$REPORT"
  echo '```txt' >> "$REPORT"
  grep -n \
    "refresh\|operating_context\|agent_operating_context\|load\|generate\|cron\|scheduled\|fetch\|case" \
    ./apps/agent-worker/src/index.ts >> "$REPORT" || true
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"

  while read -r line; do
    LINE_NO="$(echo "$line" | cut -d: -f1)"
    FROM=$((LINE_NO - 35))
    TO=$((LINE_NO + 70))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "### index.ts around line $LINE_NO" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./apps/agent-worker/src/index.ts >> "$REPORT"
    echo '```' >> "$REPORT"
    echo "" >> "$REPORT"
  done < <(grep -n "refreshOperating\|agent_operating_context\|loadAgent\|generateAgent\|refresh_error\|load_error" ./apps/agent-worker/src/index.ts | head -12 || true)
fi

echo ""
echo "7) Checking TypeScript/build commands..."
echo "## Build commands" >> "$REPORT"
echo "" >> "$REPORT"

echo "Root package scripts:" | tee "$OUT_DIR/build-commands.txt"
node -e '
const fs = require("fs");
if (fs.existsSync("package.json")) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(JSON.stringify(pkg.scripts || {}, null, 2));
}
' | tee -a "$OUT_DIR/build-commands.txt"

echo "" | tee -a "$OUT_DIR/build-commands.txt"
echo "Agent-worker package scripts:" | tee -a "$OUT_DIR/build-commands.txt"
node -e '
const fs = require("fs");
const p = "apps/agent-worker/package.json";
if (fs.existsSync(p)) {
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(JSON.stringify(pkg.scripts || {}, null, 2));
}
' | tee -a "$OUT_DIR/build-commands.txt"

echo '```json' >> "$REPORT"
cat "$OUT_DIR/build-commands.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "8) Typecheck/build smoke..."
echo "## Build smoke" >> "$REPORT"
echo "" >> "$REPORT"

if npm run build > "$OUT_DIR/root-build.log" 2>&1; then
  echo "Root build: OK"
  echo "- Root build: OK" >> "$REPORT"
else
  echo "Root build: FAILED"
  echo "- Root build: FAILED" >> "$REPORT"
  echo '```txt' >> "$REPORT"
  tail -180 "$OUT_DIR/root-build.log" >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "9) Generating recommendation skeleton..."
echo "## Preliminary implementation recommendation" >> "$REPORT"
echo "" >> "$REPORT"

HAS_WIDGET_WRITER="$(test -f ./apps/agent-worker/src/agent-widget-contract.ts && echo yes || echo no)"
HAS_OPERATING_CONTEXT_WRITES="$(grep -R "from('agent_operating_context'\|from(\"agent_operating_context\"" ./apps/agent-worker/src 2>/dev/null | wc -l | tr -d ' ')"
HAS_WIDGET_TABLE_WORKER="$(grep -R "agent_widget_contracts" ./apps/agent-worker/src 2>/dev/null | wc -l | tr -d ' ')"

echo "- Existing agent-widget-contract writer file: \`$HAS_WIDGET_WRITER\`" >> "$REPORT"
echo "- Worker references to agent_operating_context: \`$HAS_OPERATING_CONTEXT_WRITES\`" >> "$REPORT"
echo "- Worker references to agent_widget_contracts: \`$HAS_WIDGET_TABLE_WORKER\`" >> "$REPORT"
echo "" >> "$REPORT"
echo "Recommendation will depend on the focused sections above. Do not implement Phase 5B until reviewing this report." >> "$REPORT"

echo ""
echo "=========================================="
echo " Evaluation complete"
echo "=========================================="
echo ""
echo "Report:"
echo "$REPORT"
echo ""
echo "Paste this:"
echo "cat $REPORT"
