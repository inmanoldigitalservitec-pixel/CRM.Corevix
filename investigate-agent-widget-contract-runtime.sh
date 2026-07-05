#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Investigating agent_widget_contracts runtime"
echo "=========================================="
echo ""

OUT_DIR="./agent-ready-patch/contract-runtime-investigation-$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/report.md"
ENV_FILE=".env.local"

mkdir -p "$OUT_DIR"

echo "# Agent Widget Contract Runtime Investigation" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "1) Checking env..."
echo "## Env" >> "$REPORT"
echo "" >> "$REPORT"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No existe .env.local"
  echo "- ERROR: No existe .env.local" >> "$REPORT"
  exit 1
fi

echo "Supabase variables encontradas:"
grep -nEi "SUPABASE|VITE_SUPABASE|PUBLIC_SUPABASE" "$ENV_FILE" || true

echo '```txt' >> "$REPORT"
grep -nEi "SUPABASE|VITE_SUPABASE|PUBLIC_SUPABASE" "$ENV_FILE" \
  | sed -E 's/(KEY=).+/\1***MASKED***/; s/(PUBLISHABLE_KEY=).+/\1***MASKED***/' >> "$REPORT" || true
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

SUPABASE_URL="$(
  grep -E '^(VITE_SUPABASE_URL|SUPABASE_URL|PUBLIC_SUPABASE_URL)=' "$ENV_FILE" \
    | tail -1 \
    | cut -d= -f2- \
    | sed 's/^["'\'']//; s/["'\'']$//'
)"

SUPABASE_KEY="$(
  grep -E '^(VITE_SUPABASE_PUBLISHABLE_KEY|SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|PUBLIC_SUPABASE_ANON_KEY)=' "$ENV_FILE" \
    | tail -1 \
    | cut -d= -f2- \
    | sed 's/^["'\'']//; s/["'\'']$//'
)"

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "ERROR: No encontré URL Supabase"
  echo "- ERROR: No encontré URL Supabase" >> "$REPORT"
  exit 1
fi

if [ -z "${SUPABASE_KEY:-}" ]; then
  echo "ERROR: No encontré publishable/anon key Supabase"
  echo "- ERROR: No encontré publishable/anon key Supabase" >> "$REPORT"
  exit 1
fi

PROJECT_REF="$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\.supabase\.co.*#\1#')"

echo "Supabase URL usada por la app: $SUPABASE_URL"
echo "Project ref usado por la app: $PROJECT_REF"

echo "- Supabase URL usada por la app: \`$SUPABASE_URL\`" >> "$REPORT"
echo "- Project ref usado por la app: \`$PROJECT_REF\`" >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "2) REST test: latest contracts..."

LATEST_JSON="$OUT_DIR/latest-contracts.json"
LATEST_STATUS="$(
  curl -sS -o "$LATEST_JSON" -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/agent_widget_contracts?select=id,cycle_date,schema_version,status,generated_by,created_at,updated_at,contract_json&order=created_at.desc&limit=5" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
)"

echo "HTTP latest status: $LATEST_STATUS"
cat "$LATEST_JSON" | python3 -m json.tool || cat "$LATEST_JSON"

echo "## REST latest contracts" >> "$REPORT"
echo "" >> "$REPORT"
echo "- HTTP status: \`$LATEST_STATUS\`" >> "$REPORT"
echo '```json' >> "$REPORT"
cat "$LATEST_JSON" | python3 -m json.tool >> "$REPORT" 2>/dev/null || cat "$LATEST_JSON" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "3) REST test: exact known row by generated_by..."

EXACT_JSON="$OUT_DIR/exact-manual-test.json"
EXACT_STATUS="$(
  curl -sS -o "$EXACT_JSON" -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/agent_widget_contracts?select=id,cycle_date,schema_version,status,generated_by,created_at,contract_json&generated_by=eq.manual_test_correct_supabase&limit=5" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
)"

echo "HTTP exact status: $EXACT_STATUS"
cat "$EXACT_JSON" | python3 -m json.tool || cat "$EXACT_JSON"

echo "## REST exact manual_test_correct_supabase" >> "$REPORT"
echo "" >> "$REPORT"
echo "- HTTP status: \`$EXACT_STATUS\`" >> "$REPORT"
echo '```json' >> "$REPORT"
cat "$EXACT_JSON" | python3 -m json.tool >> "$REPORT" 2>/dev/null || cat "$EXACT_JSON" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "4) Extracting first plan title from REST response..."

python3 <<PY | tee "$OUT_DIR/parsed-rest-result.txt"
import json, pathlib

latest_path = pathlib.Path("$LATEST_JSON")
exact_path = pathlib.Path("$EXACT_JSON")

def read(path):
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        return {"error": str(exc)}

latest = read(latest_path)
exact = read(exact_path)

def first_title(rows):
    if not isinstance(rows, list) or not rows:
        return None
    contract = rows[0].get("contract_json")
    if not isinstance(contract, dict):
        return None
    plans = contract.get("recovery_plans")
    if not isinstance(plans, list) or not plans:
        return None
    return plans[0].get("plan_title")

print("latest_rows_count:", len(latest) if isinstance(latest, list) else "not_list")
print("exact_rows_count:", len(exact) if isinstance(exact, list) else "not_list")
print("latest_first_plan_title:", first_title(latest))
print("exact_first_plan_title:", first_title(exact))
print("latest_generated_by:", latest[0].get("generated_by") if isinstance(latest, list) and latest else None)
print("exact_generated_by:", exact[0].get("generated_by") if isinstance(exact, list) and exact else None)
PY

echo "## Parsed REST result" >> "$REPORT"
echo "" >> "$REPORT"
echo '```txt' >> "$REPORT"
cat "$OUT_DIR/parsed-rest-result.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "5) Inspecting frontend source code..."

echo "## Frontend source markers" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  "ONLY_CONTRACT_TABLE\|fetchAgentWidgetContract\|agent_widget_contracts\|fetchAgentPromptPayload\|NO LLEGÓ NINGÚN CONTRATO\|setAgentPromptPayload\|AgentCommandWidgetConnected\|onAnalyzeNow" \
  ./src/lib/agentClient.ts ./src/components/dashboard-v2/dashboard-v2.tsx ./src/components/agent 2>/dev/null \
  | tee "$OUT_DIR/frontend-markers.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/frontend-markers.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "6) Inspecting agentClient.ts Supabase client setup..."

echo "## agentClient Supabase setup" >> "$REPORT"
echo "" >> "$REPORT"

grep -n "createClient\|SUPABASE\|supabaseUrl\|supabaseKey\|VITE_SUPABASE\|PUBLISHABLE" ./src/lib/agentClient.ts \
  | tee "$OUT_DIR/agentclient-supabase-setup.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/agentclient-supabase-setup.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "7) Showing top of agentClient.ts..."

echo "## Top of agentClient.ts" >> "$REPORT"
echo "" >> "$REPORT"
echo '```ts' >> "$REPORT"
sed -n '1,80p' ./src/lib/agentClient.ts >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "8) Showing fetchAgentWidgetContract block..."

WIDGET_LINE=$(grep -n "export async function fetchAgentWidgetContract" ./src/lib/agentClient.ts | head -1 | cut -d: -f1 || true)

if [ -n "${WIDGET_LINE:-}" ]; then
  FROM=$((WIDGET_LINE - 25))
  TO=$((WIDGET_LINE + 75))
  if [ "$FROM" -lt 1 ]; then FROM=1; fi

  echo "## fetchAgentWidgetContract block" >> "$REPORT"
  echo "" >> "$REPORT"
  echo '```ts' >> "$REPORT"
  sed -n "${FROM},${TO}p" ./src/lib/agentClient.ts >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"
fi

echo ""
echo "9) Checking local dev server endpoint if running..."

DEV_STATUS="not_checked"
DEV_HTML="$OUT_DIR/dev-root.html"

if curl -sS -o "$DEV_HTML" -w "%{http_code}" "http://localhost:8080/" >/tmp/dev_status_agent_widget 2>/dev/null; then
  DEV_STATUS="$(cat /tmp/dev_status_agent_widget)"
else
  DEV_STATUS="not_running_or_unreachable"
fi

echo "localhost:8080 status: $DEV_STATUS"

echo "## Local dev server" >> "$REPORT"
echo "" >> "$REPORT"
echo "- localhost:8080 status: \`$DEV_STATUS\`" >> "$REPORT"
echo "" >> "$REPORT"

if [ "$DEV_STATUS" = "200" ]; then
  echo "Searching rendered dev root for dashboard assets/markers..."
  grep -oE '/assets/[^"]+|dashboard|src/components|@vite' "$DEV_HTML" | head -80 | tee "$OUT_DIR/dev-root-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/dev-root-markers.txt" >> "$REPORT" 2>/dev/null || true
  echo '```' >> "$REPORT"
  echo "" >> "$REPORT"
fi

echo ""
echo "10) Summary diagnosis..."

echo "## Summary diagnosis" >> "$REPORT"
echo "" >> "$REPORT"

LATEST_COUNT=$(python3 - <<PY
import json
try:
    data=json.load(open("$LATEST_JSON"))
    print(len(data) if isinstance(data, list) else "not_list")
except Exception:
    print("error")
PY
)

EXACT_COUNT=$(python3 - <<PY
import json
try:
    data=json.load(open("$EXACT_JSON"))
    print(len(data) if isinstance(data, list) else "not_list")
except Exception:
    print("error")
PY
)

HAS_FETCH=$(grep -q ".from(\"agent_widget_contracts\")" ./src/lib/agentClient.ts && echo yes || echo no)
HAS_ONLY=$(grep -q "ONLY_CONTRACT_TABLE" ./src/components/dashboard-v2/dashboard-v2.tsx && echo yes || echo no)

echo "latest_count=$LATEST_COUNT"
echo "exact_count=$EXACT_COUNT"
echo "has_agent_widget_contracts_fetch=$HAS_FETCH"
echo "dashboard_forced_only_contract_table=$HAS_ONLY"

echo "- latest_count: \`$LATEST_COUNT\`" >> "$REPORT"
echo "- exact_count: \`$EXACT_COUNT\`" >> "$REPORT"
echo "- agentClient reads agent_widget_contracts: \`$HAS_FETCH\`" >> "$REPORT"
echo "- dashboard forced to only contract table: \`$HAS_ONLY\`" >> "$REPORT"

if [ "$LATEST_STATUS" = "200" ] && [ "$LATEST_COUNT" != "0" ] && [ "$LATEST_COUNT" != "[]" ] && [ "$LATEST_COUNT" != "error" ] && [ "$LATEST_COUNT" != "not_list" ]; then
  echo "- REST test can read rows from agent_widget_contracts using .env.local." >> "$REPORT"
  echo ""
  echo "REST can read rows. If widget still says no contract, likely causes:"
  echo "1. Browser dev server is stale; restart npm run dev and hard refresh."
  echo "2. agentClient.ts uses different env variable than curl test."
  echo "3. Runtime query differs from REST test."
else
  echo "- REST test did NOT read rows from agent_widget_contracts using .env.local." >> "$REPORT"
  echo ""
  echo "REST cannot read rows. Likely causes:"
  echo "1. Row inserted in different Supabase project."
  echo "2. RLS/policies hide rows."
  echo "3. Table exists but no row in this environment."
fi

echo ""
echo "=========================================="
echo " Investigation complete"
echo "=========================================="
echo ""
echo "Report:"
echo "$REPORT"
echo ""
echo "Paste this:"
echo "cat $REPORT"
