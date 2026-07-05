#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " CRM Agent Context Brief Optimization"
echo "=========================================="
echo ""

FILE="./apps/agent-worker/src/agent-operating-context.ts"
BACKUP_DIR="./agent-ready-patch/backups-context-brief-$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe $FILE"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/agent-operating-context.ts.bak"

echo "Backup creado:"
echo "$BACKUP_DIR/agent-operating-context.ts.bak"
echo ""

python3 <<'PY'
from pathlib import Path
import re
import sys

path = Path("./apps/agent-worker/src/agent-operating-context.ts")
text = path.read_text()

def fail(message):
    print(f"ERROR: {message}")
    sys.exit(1)

helper_code = r'''
const AGENT_BRIEF_VERSION = 'agent_brief_v1';

function compactActionForAgent(action: any) {
	return {
		type: action?.type || null,
		label: action?.label || null,
		reason: action?.reason || null,
		module: action?.module || null,
		priority: action?.priority || null,
		requires_confirmation:
			typeof action?.requiresConfirmation === 'boolean'
				? action.requiresConfirmation
				: typeof action?.requires_confirmation === 'boolean'
					? action.requires_confirmation
					: true,
		target: action?.target
			? {
					type: action.target.type || null,
					id: action.target.id || null,
					label: action.target.label || null,
					status: action.target.status || null,
				}
			: null,
		payload: action?.payload || null,
	};
}

function compactDetectedCasesFromPlans(plans: any[]) {
	return (plans || []).map((plan) => {
		const item = plan?.detected_case?.item || {};
		const actions = plan?.suggested_actions || plan?.generated_plan?.actions || [];

		return {
			case_key: plan?.case_key || plan?.detected_case?.key || null,
			case_type: plan?.case_type || plan?.detected_case?.type || null,
			title: plan?.case_title || plan?.detected_case?.title || item?.title || null,
			summary: plan?.case_summary || plan?.detected_case?.summary || item?.summary || null,
			severity: plan?.case_severity || plan?.detected_case?.severity || item?.severity || null,
			state: plan?.state || null,
			bucket: item?.bucket || plan?.metadata?.bucket || null,
			kind: item?.kind || plan?.metadata?.kind || null,
			score: item?.score ?? plan?.metadata?.score ?? null,
			module: item?.module || null,
			source: {
				type: item?.sourceType || null,
				id: item?.sourceId || null,
				label: item?.sourceLabel || null,
				href: item?.href || null,
			},
			people: {
				client: item?.client || null,
				lead: item?.lead || null,
				project: item?.project || null,
			},
			timing: {
				due_at: item?.dueAt || null,
				next_reminder_at: plan?.next_reminder_at || null,
				last_reminded_at: plan?.last_reminded_at || null,
				reminder_count: plan?.reminder_count || 0,
			},
			money: {
				amount: item?.amount || null,
			},
			reason: item?.urgencyReason || plan?.generated_plan?.rationale || null,
			recommendation: item?.recommendation || null,
			suggested_actions: actions.map(compactActionForAgent),
			source_refs: {
				event_ids: plan?.source_event_ids || [],
				memory_keys: plan?.source_memory_keys || [],
				modules: plan?.source_modules || [],
			},
			agent_status: {
				system_should_generate_plans: false,
				agent_should_generate_plans: true,
				execute_without_confirmation: false,
			},
			full_record_ref: {
				table: 'agent_daily_plans',
				id: plan?.id || null,
			},
		};
	});
}

function compactPlansForCompatibility(plans: any[]) {
	return (plans || []).map((plan) => ({
		id: plan?.id || null,
		case_key: plan?.case_key || null,
		case_type: plan?.case_type || null,
		case_title: plan?.case_title || null,
		case_summary: plan?.case_summary || null,
		case_severity: plan?.case_severity || null,
		state: plan?.state || null,
		suggested_actions: (plan?.suggested_actions || []).map(compactActionForAgent),
		source_event_ids: plan?.source_event_ids || [],
		source_memory_keys: plan?.source_memory_keys || [],
		source_modules: plan?.source_modules || [],
		metadata: {
			bucket: plan?.metadata?.bucket || null,
			kind: plan?.metadata?.kind || null,
			score: plan?.metadata?.score ?? null,
			system_should_generate_plans: false,
			agent_should_generate_plans: true,
			execute_without_confirmation: false,
		},
		full_record_ref: {
			table: 'agent_daily_plans',
			id: plan?.id || null,
		},
	}));
}

function agentBriefSummaryFromCases(detectedCases: any[]) {
	const counts = {
		total: detectedCases.length,
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
		overdue: 0,
		today: 0,
		upcoming: 0,
		stale: 0,
	};

	for (const item of detectedCases) {
		if (item?.severity === 'critical') counts.critical += 1;
		if (item?.severity === 'high') counts.high += 1;
		if (item?.severity === 'medium') counts.medium += 1;
		if (item?.severity === 'low') counts.low += 1;
		if (item?.bucket === 'overdue') counts.overdue += 1;
		if (item?.bucket === 'today') counts.today += 1;
		if (item?.bucket === 'upcoming') counts.upcoming += 1;
		if (item?.case_type === 'stale_opportunity') counts.stale += 1;
	}

	return counts;
}
'''

if "function compactDetectedCasesFromPlans" not in text:
    marker = "function timelineGroupsFromPlans(plans: any[])"
    if marker not in text:
        fail("No encontré function timelineGroupsFromPlans para insertar helpers.")
    text = text.replace(marker, helper_code + "\n" + marker, 1)
else:
    print("Helpers ya existen. No los duplicaré.")

# Inserta const detectedCases antes del armado del context_json.
# Buscamos un patrón estable dentro de la función que tiene:
# const { ctx, cycleDate, now, snapshot, plans, notifications, memoryEntries } = args;
if "const detectedCases = compactDetectedCasesFromPlans(plans);" not in text:
    old = "const { ctx, cycleDate, now, snapshot, plans, notifications, memoryEntries } = args;"
    new = """const { ctx, cycleDate, now, snapshot, plans, notifications, memoryEntries } = args;
	const detectedCases = compactDetectedCasesFromPlans(plans);
	const compactPlans = compactPlansForCompatibility(plans);
	const agentBriefCounts = agentBriefSummaryFromCases(detectedCases);"""
    if old not in text:
        fail("No encontré destructuring de args para insertar detectedCases.")
    text = text.replace(old, new, 1)
else:
    print("detectedCases ya existe. No lo duplicaré.")

# Reemplaza la propiedad plans del context_json por una versión compacta y agrega agent_brief.
# Solo reemplaza un `plans,` aislado, preferiblemente el primero después de agent_state/timeline.
if "agent_brief:" not in text:
    # Reemplazo conservador: primer plans, aislado después de "timeline"
    idx = text.find("\n\t\tplans,")
    indent = "\t\t"
    if idx == -1:
        idx = text.find("\n    plans,")
        indent = "    "
    if idx == -1:
        fail("No encontré una propiedad aislada plans, para reemplazar en context_json.")

    replacement = f"""
{indent}detected_cases: detectedCases,
{indent}agent_brief: {{
{indent}\tversion: AGENT_BRIEF_VERSION,
{indent}\tmission: 'Evaluar casos detectados y preparar planes de sanación cuando el agente esté instalado.',
{indent}\tcounts: agentBriefCounts,
{indent}\trules: {{
{indent}\t\tsystem_should_generate_plans: false,
{indent}\t\tagent_should_generate_plans: true,
{indent}\t\texecute_without_confirmation: false,
{indent}\t}},
{indent}\tinput_contract: {{
{indent}\t\tread_from: 'detected_cases',
{indent}\t\twrite_to: 'recovery_plans',
{indent}\t\tfull_details_table: 'agent_daily_plans',
{indent}\t}},
{indent}}},
{indent}agent_workspace: {{
{indent}\tstatus: 'reserved_for_future_agent',
{indent}\tagent_enabled: false,
{indent}\texpected_output: 'recovery_plans',
{indent}\tnotes: 'El CRM detecta casos. El agente futuro debe crear planes de sanación usando detected_cases.',
{indent}}},
{indent}recovery_plans: [],
{indent}rules: {{
{indent}\tsystem_should_generate_plans: false,
{indent}\tagent_should_generate_plans: true,
{indent}\texecute_without_confirmation: false,
{indent}}},
{indent}plans: compactPlans,"""
    text = text[:idx] + replacement + text[idx + len(f"\n{indent}plans,"):]
else:
    print("agent_brief ya existe. No lo duplicaré.")

path.write_text(text)
print("Patch aplicado correctamente.")
PY

echo ""
echo "=========================================="
echo " Validación rápida"
echo "=========================================="
echo ""

echo "1) Buscando agent_brief y detected_cases..."
grep -n "agent_brief\|detected_cases\|compactDetectedCasesFromPlans\|compactPlansForCompatibility" "$FILE" || true

echo ""
echo "2) Buscando plans completo peligroso..."
if grep -n $'\t\tplans,$' "$FILE" || grep -n "    plans,$" "$FILE"; then
  echo "WARN: Todavía puede existir plans completo sin compactar."
else
  echo "OK: No aparece plans aislado sin compactar."
fi

echo ""
echo "3) Buscando generated_plan dentro del operating context..."
if grep -n "generated_plan" "$FILE"; then
  echo "INFO: generated_plan puede aparecer solo como fallback de lectura, no como salida completa."
else
  echo "OK: No aparece generated_plan."
fi

echo ""
echo "=========================================="
echo " Patch terminado"
echo "=========================================="
echo ""
echo "Backup:"
echo "$BACKUP_DIR/agent-operating-context.ts.bak"
echo ""
echo "Ahora corre:"
echo "npm run build"
echo ""
echo "Si algo sale mal, restaura con:"
echo "cp $BACKUP_DIR/agent-operating-context.ts.bak ./apps/agent-worker/src/agent-operating-context.ts"
