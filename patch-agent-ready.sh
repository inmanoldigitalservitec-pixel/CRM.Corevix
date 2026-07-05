#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " CRM Agent-Ready Patch"
echo "=========================================="
echo ""

FILE_MAIN="./src/lib/crm/agent-plan-generation.ts"
FILE_WORKER="./apps/agent-worker/src/agent-daily-plans.ts"
BACKUP_DIR="./agent-ready-patch/backups-$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$FILE_MAIN" ]; then
  echo "ERROR: No existe $FILE_MAIN"
  exit 1
fi

if [ ! -f "$FILE_WORKER" ]; then
  echo "ERROR: No existe $FILE_WORKER"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

cp "$FILE_MAIN" "$BACKUP_DIR/agent-plan-generation.ts.bak"
cp "$FILE_WORKER" "$BACKUP_DIR/agent-daily-plans.ts.bak"

echo "Backups creados en:"
echo "$BACKUP_DIR"
echo ""

python3 <<'PY'
from pathlib import Path
import re
import sys

main_path = Path("./src/lib/crm/agent-plan-generation.ts")
worker_path = Path("./apps/agent-worker/src/agent-daily-plans.ts")

def fail(msg):
    print(f"ERROR: {msg}")
    sys.exit(1)

# ------------------------------------------------------------
# Patch 1: src/lib/crm/agent-plan-generation.ts
# ------------------------------------------------------------

main = main_path.read_text()

old_fn = '''function buildGeneratedPlan(item: AgentAttentionItem, type: AgentPlanCaseType): AgentGeneratedPlan {
  return {
    title: planTitleForCase(item, type),
    summary: planSummaryForCase(item, type),
    actions: item.actions || [],
    rationale: item.urgencyReason || item.summary,
  };
}'''

new_fn = '''function buildReservedAgentPlan(item: AgentAttentionItem, type: AgentPlanCaseType): AgentGeneratedPlan {
  return {
    title: "Reserved for future agent",
    summary:
      "El sistema detectó este caso, pero no generó un plan automático. El agente futuro deberá crear el plan de sanación.",
    actions: item.actions || [],
    rationale:
      item.urgencyReason ||
      item.summary ||
      "Caso detectado por el sistema de prioridades del CRM.",
  };
}'''

if old_fn in main:
    main = main.replace(old_fn, new_fn)
else:
    print("WARN: No encontré buildGeneratedPlan exacto en main. Intentando reemplazo por regex...")
    main_new = re.sub(
        r'function buildGeneratedPlan\([^)]*\): AgentGeneratedPlan \{\n  return \{\n    title: planTitleForCase\(item, type\),\n    summary: planSummaryForCase\(item, type\),\n    actions: item\.actions \|\| \[\],\n    rationale: item\.urgencyReason \|\| item\.summary,\n  \};\n\}',
        new_fn,
        main,
        count=1,
    )
    if main_new == main:
        fail("No pude reemplazar buildGeneratedPlan en agent-plan-generation.ts")
    main = main_new

main = main.replace(
    "const generatedPlan = buildGeneratedPlan(detectedCase.item, detectedCase.type);",
    "const reservedAgentPlan = buildReservedAgentPlan(detectedCase.item, detectedCase.type);"
)

main = main.replace(
    "actions: (generatedPlan.actions || []).map((action) => ({",
    "actions: (reservedAgentPlan.actions || []).map((action) => ({"
)

old_block = '''snapshot_base: snapshot,
      case_key: detectedCase.key,
      case_type: detectedCase.type,
      case_title: detectedCase.title,
      case_summary: detectedCase.summary || null,
      case_severity: detectedCase.severity,
      detected_case: detectedCase,
      plan_title: generatedPlan.title,
      plan_summary: generatedPlan.summary,
      generated_plan: generatedPlan,
      suggested_actions: generatedPlan.actions,'''

new_block = '''snapshot_base: {
        schemaVersion: snapshot.schemaVersion,
        generatedAt: snapshot.generatedAt,
        cycleDate,
        summary: snapshot.summary,
      },
      case_key: detectedCase.key,
      case_type: detectedCase.type,
      case_title: detectedCase.title,
      case_summary: detectedCase.summary || null,
      case_severity: detectedCase.severity,
      detected_case: detectedCase,
      plan_title: `Caso detectado: ${detectedCase.title}`,
      plan_summary:
        detectedCase.summary ||
        detectedCase.item.recommendation ||
        detectedCase.item.urgencyReason ||
        "Caso detectado por el sistema de prioridades. Pendiente de análisis por el agente.",
      generated_plan: reservedAgentPlan,
      suggested_actions: reservedAgentPlan.actions,'''

if old_block in main:
    main = main.replace(old_block, new_block)
else:
    fail("No pude encontrar el bloque principal de snapshot_base/generated_plan en agent-plan-generation.ts")

old_metadata = '''metadata: {
        bucket: detectedCase.item.bucket,
        kind: detectedCase.item.kind,
        score: detectedCase.item.score,
      },'''

new_metadata = '''metadata: {
        bucket: detectedCase.item.bucket,
        kind: detectedCase.item.kind,
        score: detectedCase.item.score,
        system_should_generate_plans: false,
        agent_should_generate_plans: true,
        execute_without_confirmation: false,
        agent_workspace: {
          status: "reserved_for_future_agent",
          agent_enabled: false,
          expected_output: "recovery_plans",
          notes: "Aquí el agente futuro escribirá los planes de sanación.",
        },
        recovery_plans: [],
      },'''

if old_metadata in main:
    main = main.replace(old_metadata, new_metadata)
else:
    fail("No pude encontrar metadata original en agent-plan-generation.ts")

main_path.write_text(main)

# ------------------------------------------------------------
# Patch 2: apps/agent-worker/src/agent-daily-plans.ts
# ------------------------------------------------------------

worker = worker_path.read_text()

# Reemplaza la llamada/variable generatedPlan por reservedAgentPlan.
# Esto cubre patrones tipo:
# const generatedPlan = buildGeneratedPlan(...)
# o:
# const generatedPlan = { ... }
pattern_generated = re.compile(
    r'const generatedPlan = buildGeneratedPlan\((.*?)\);',
    flags=re.DOTALL
)

if pattern_generated.search(worker):
    worker = pattern_generated.sub(
        '''const reservedAgentPlan = {
\t\t\ttitle: 'Reserved for future agent',
\t\t\tsummary:
\t\t\t\t'El sistema detectó este caso, pero no generó un plan automático. El agente futuro deberá crear el plan de sanación.',
\t\t\tactions: detectedCase.item.actions || [],
\t\t\trationale:
\t\t\t\tdetectedCase.item.urgencyReason ||
\t\t\t\tdetectedCase.item.summary ||
\t\t\t\t'Caso detectado por el sistema de prioridades del CRM.',
\t\t};''',
        worker,
        count=1
    )
else:
    # Si no está buildGeneratedPlan, buscamos la primera asignación const generatedPlan = {...};
    pattern_generated_obj = re.compile(
        r'const generatedPlan = \{.*?\n\t\t\};',
        flags=re.DOTALL
    )
    if pattern_generated_obj.search(worker):
        worker = pattern_generated_obj.sub(
            '''const reservedAgentPlan = {
\t\t\ttitle: 'Reserved for future agent',
\t\t\tsummary:
\t\t\t\t'El sistema detectó este caso, pero no generó un plan automático. El agente futuro deberá crear el plan de sanación.',
\t\t\tactions: detectedCase.item.actions || [],
\t\t\trationale:
\t\t\t\tdetectedCase.item.urgencyReason ||
\t\t\t\tdetectedCase.item.summary ||
\t\t\t\t'Caso detectado por el sistema de prioridades del CRM.',
\t\t};''',
            worker,
            count=1
        )
    else:
        print("WARN: No encontré const generatedPlan exacto en worker. Seguiré con reemplazos de bloque.")

worker = worker.replace(
    "actions: (generatedPlan.actions || []).map((action) => ({",
    "actions: (reservedAgentPlan.actions || []).map((action) => ({"
)

worker = worker.replace(
    "actions: (generatedPlan.actions || []).map((action: any) => ({",
    "actions: (reservedAgentPlan.actions || []).map((action: any) => ({"
)

worker = worker.replace(
    "\t\t\tsnapshot_base: snapshot,",
    """\t\t\tsnapshot_base: {
\t\t\t\tschemaVersion: snapshot.schemaVersion,
\t\t\t\tgeneratedAt: snapshot.generatedAt,
\t\t\t\tcycleDate,
\t\t\t\tsummary: snapshot.summary,
\t\t\t},"""
)

worker = worker.replace(
    "\t\t\tplan_title: generatedPlan.title,\n\t\t\tplan_summary: generatedPlan.summary,\n\t\t\tgenerated_plan: generatedPlan,\n\t\t\tsuggested_actions: generatedPlan.actions,",
    """\t\t\tplan_title: `Caso detectado: ${detectedCase.title}`,
\t\t\tplan_summary:
\t\t\t\tdetectedCase.summary ||
\t\t\t\tdetectedCase.item.recommendation ||
\t\t\t\tdetectedCase.item.urgencyReason ||
\t\t\t\t'Caso detectado por el sistema de prioridades. Pendiente de análisis por el agente.',
\t\t\tgenerated_plan: reservedAgentPlan,
\t\t\tsuggested_actions: reservedAgentPlan.actions,"""
)

# Agregar metadata agent-ready en worker.
worker_metadata_old = """\t\t\tmetadata: {
\t\t\t\tbucket: detectedCase.item.bucket,
\t\t\t\tkind: detectedCase.item.kind,
\t\t\t\tscore: detectedCase.item.score,
\t\t\t},"""

worker_metadata_new = """\t\t\tmetadata: {
\t\t\t\tbucket: detectedCase.item.bucket,
\t\t\t\tkind: detectedCase.item.kind,
\t\t\t\tscore: detectedCase.item.score,
\t\t\t\tsystem_should_generate_plans: false,
\t\t\t\tagent_should_generate_plans: true,
\t\t\t\texecute_without_confirmation: false,
\t\t\t\tagent_workspace: {
\t\t\t\t\tstatus: 'reserved_for_future_agent',
\t\t\t\t\tagent_enabled: false,
\t\t\t\t\texpected_output: 'recovery_plans',
\t\t\t\t\tnotes: 'Aquí el agente futuro escribirá los planes de sanación.',
\t\t\t\t},
\t\t\t\trecovery_plans: [],
\t\t\t},"""

if worker_metadata_old in worker:
    worker = worker.replace(worker_metadata_old, worker_metadata_new, 1)
else:
    print("WARN: No encontré metadata exacta en worker. Puede que tengas que agregar agent_workspace manualmente.")

worker_path.write_text(worker)

print("Patch aplicado correctamente.")
PY

echo ""
echo "=========================================="
echo " Validando cambios"
echo "=========================================="
echo ""

echo "1) Buscando snapshot_base gigante..."
if grep -RIn "snapshot_base: snapshot" ./src ./apps >/tmp/agent_patch_snapshot_check.txt 2>/dev/null; then
  echo "WARN: Todavía aparece snapshot_base: snapshot:"
  cat /tmp/agent_patch_snapshot_check.txt
else
  echo "OK: No aparece snapshot_base: snapshot"
fi

echo ""
echo "2) Buscando generated_plan viejo..."
if grep -RIn "generated_plan: generatedPlan" ./src ./apps >/tmp/agent_patch_generated_plan_check.txt 2>/dev/null; then
  echo "WARN: Todavía aparece generated_plan: generatedPlan:"
  cat /tmp/agent_patch_generated_plan_check.txt
else
  echo "OK: No aparece generated_plan: generatedPlan"
fi

echo ""
echo "3) Buscando buildGeneratedPlan..."
if grep -RIn "buildGeneratedPlan" ./src ./apps >/tmp/agent_patch_build_generated_check.txt 2>/dev/null; then
  echo "WARN: Todavía aparece buildGeneratedPlan:"
  cat /tmp/agent_patch_build_generated_check.txt
else
  echo "OK: No aparece buildGeneratedPlan"
fi

echo ""
echo "=========================================="
echo " Patch terminado"
echo "=========================================="
echo ""
echo "Backups:"
echo "$BACKUP_DIR"
echo ""
echo "Ahora corre:"
echo "npm run build"
echo ""
echo "Si algo sale mal, puedes restaurar con:"
echo "cp $BACKUP_DIR/agent-plan-generation.ts.bak ./src/lib/crm/agent-plan-generation.ts"
echo "cp $BACKUP_DIR/agent-daily-plans.ts.bak ./apps/agent-worker/src/agent-daily-plans.ts"
