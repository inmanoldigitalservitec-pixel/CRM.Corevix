#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " CRM Agent Brief Investigation"
echo "=========================================="

ROOT_DIR="$(pwd)"
OUT_DIR="$ROOT_DIR/agent-ready-patch"
REPORT_FILE="$OUT_DIR/investigation-report.md"

mkdir -p "$OUT_DIR"

echo "# CRM Agent Brief Investigation Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated at: $(date)" >> "$REPORT_FILE"
echo "Project root: $ROOT_DIR" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "Buscando archivos relacionados..."

SEARCH_TERMS=(
  "plans"
  "generated_plan"
  "snapshot_base"
  "suggested_actions"
  "top_priorities"
  "action_queue"
  "agent_instructions"
  "agent_state"
  "context_json"
  "priority"
  "priorities"
  "risk"
  "risks"
)

echo "## Search Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for term in "${SEARCH_TERMS[@]}"; do
  echo "### Term: \`$term\`" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"

  if command -v rg >/dev/null 2>&1; then
    rg -n --hidden --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!coverage' "$term" . >> "$REPORT_FILE" || true
  else
    grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage "$term" . >> "$REPORT_FILE" || true
  fi

  echo "" >> "$REPORT_FILE"
done

KEY_FILES="$OUT_DIR/key-files.txt"
: > "$KEY_FILES"

if command -v rg >/dev/null 2>&1; then
  rg -l --hidden --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!coverage' \
    "generated_plan|snapshot_base|context_json|top_priorities|action_queue|agent_instructions" . \
    > "$KEY_FILES" || true
else
  grep -RIl --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage \
    -E "generated_plan|snapshot_base|context_json|top_priorities|action_queue|agent_instructions" . \
    > "$KEY_FILES" || true
fi

PROPOSAL_FILE="$OUT_DIR/proposed-agent-brief-structure.json"

cat > "$PROPOSAL_FILE" <<'JSON'
{
  "cycle": {
    "date": "YYYY-MM-DD",
    "generated_at": "ISO_TIMESTAMP",
    "timezone": "America/Santo_Domingo",
    "source": "crm_priority_detector"
  },
  "summary": {
    "headline": "Resumen corto del estado del CRM.",
    "counts": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "overdue": 0,
      "due_today": 0,
      "upcoming": 0
    }
  },
  "detected_cases": [],
  "agent_workspace": {
    "status": "reserved_for_future_agent",
    "agent_enabled": false,
    "expected_output": "recovery_plans",
    "notes": "Aquí el agente futuro escribirá planes, pero el sistema no debe autogenerarlos todavía."
  },
  "recovery_plans": [],
  "rules": {
    "system_should_generate_plans": false,
    "agent_should_generate_plans": true,
    "execute_without_confirmation": false
  }
}
JSON

VALIDATOR="$OUT_DIR/validate-agent-brief.js"

cat > "$VALIDATOR" <<'JS'
#!/usr/bin/env node

const fs = require("fs");

const file = process.argv[2];

if (!file) {
  console.error("Uso: node validate-agent-brief.js path/to/context.json");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);

const forbiddenKeys = ["snapshot_base", "generated_plan"];
const warnings = [];
const errors = [];

function walk(obj, path = "") {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }

  for (const key of Object.keys(obj)) {
    const nextPath = path ? `${path}.${key}` : key;

    if (forbiddenKeys.includes(key)) {
      errors.push(`Forbidden key found: ${nextPath}`);
    }

    if (key === "plans") {
      warnings.push(`Key "plans" found at ${nextPath}. Prefer "detected_cases" and "recovery_plans".`);
    }

    walk(obj[key], nextPath);
  }
}

walk(data);

if (!data.detected_cases) errors.push("Missing required key: detected_cases");
if (!data.agent_workspace) errors.push("Missing required key: agent_workspace");
if (!data.recovery_plans) errors.push("Missing required key: recovery_plans");
if (!data.rules) errors.push("Missing required key: rules");

console.log("");
console.log("Agent Brief Validation");
console.log("======================");
console.log("");

if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach(w => console.log(`- ${w}`));
  console.log("");
}

if (errors.length) {
  console.log("Errors:");
  errors.forEach(e => console.log(`- ${e}`));
  console.log("");
  process.exit(1);
}

console.log("OK: JSON looks agent-ready.");
console.log("");
JS

chmod +x "$VALIDATOR"

echo ""
echo "Listo."
echo ""
echo "Archivos generados:"
echo "- agent-ready-patch/investigation-report.md"
echo "- agent-ready-patch/key-files.txt"
echo "- agent-ready-patch/proposed-agent-brief-structure.json"
echo "- agent-ready-patch/validate-agent-brief.js"
echo ""
echo "Ahora ejecuta:"
echo "cat agent-ready-patch/key-files.txt"
