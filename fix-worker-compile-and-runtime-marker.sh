#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d%H%M%S)"

FILES=(
  "apps/agent-worker/src/index.ts"
  "apps/agent-worker/src/agent-daily-plans.ts"
)

echo "💾 Backups..."
for file in "${FILES[@]}"; do
  cp "$file" "${file}.bak-compile-runtime-marker-$STAMP"
  echo "  - ${file}.bak-compile-runtime-marker-$STAMP"
done

python3 <<'PY'
from pathlib import Path

# ============================================================
# 1) Fix agent-daily-plans.ts snapshot.summary
# ============================================================

path = Path("apps/agent-worker/src/agent-daily-plans.ts")
text = path.read_text()

text = text.replace(
    "summary: snapshot.summary,",
    "summary: snapshot.headline || 'Resumen diario de atención',"
)

path.write_text(text)

# ============================================================
# 2) Fix index.ts types + marker
# ============================================================

path = Path("apps/agent-worker/src/index.ts")
text = path.read_text()

# Add AgentWidgetContractV1 type import if missing.
old_import = "import { writeAgentWidgetContractFromDailyPlans, writeAgentWidgetContractPayload } from './agent-widget-contract';"
new_import = "import { writeAgentWidgetContractFromDailyPlans, writeAgentWidgetContractPayload, type AgentWidgetContractV1 } from './agent-widget-contract';"
if old_import in text:
    text = text.replace(old_import, new_import)

# Add runtime marker to /health.
if "contract_phase_marker" not in text:
    text = text.replace(
        "service: 'corevix-agent-worker',",
        "service: 'corevix-agent-worker',\n\t\t\t\tcontract_phase_marker: 'autopilot_contract_phase_1_2_runtime_confirmed',"
    )

# Allow widget_contract in PromptStats label.
text = text.replace(
    "label: 'initial' | 'final';",
    "label: 'initial' | 'final' | 'widget_contract';"
)

# Cast return contract from validate function to exact type.
text = text.replace(
    """\treturn {
\t\tschema_version: 'agent_widget_contract_v1',
\t\tstatus: plans.length ? 'ready' : 'idle',
\t\tgenerated_at: contract.generated_at || new Date().toISOString(),
\t\tsummary,
\t\trecovery_plans: plans,
\t};""",
    """\treturn {
\t\tschema_version: 'agent_widget_contract_v1',
\t\tstatus: plans.length ? 'ready' : 'idle',
\t\tgenerated_at: contract.generated_at || new Date().toISOString(),
\t\tsummary,
\t\trecovery_plans: plans,
\t} as AgentWidgetContractV1;"""
)

path.write_text(text)
PY

echo ""
echo "============================================================"
echo "Verificación de cambios"
echo "============================================================"
grep -n "contract_phase_marker\|widget_contract\|AgentWidgetContractV1\|summary: snapshot" \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/agent-daily-plans.ts || true

echo ""
echo "============================================================"
echo "Typecheck worker"
echo "============================================================"
cd apps/agent-worker
npx tsc --noEmit
cd ../..

echo ""
echo "✅ Compile fix aplicado."
echo "Ahora reinicia el worker y verifica /health."
