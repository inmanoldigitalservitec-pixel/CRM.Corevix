#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d%H%M%S)"

FILES=(
  "apps/agent-worker/src/agent-widget-contract.ts"
  "apps/agent-worker/src/index.ts"
  "src/components/agent/agentWidgetContract.ts"
  "src/components/agent/agentPromptPayloadAdapter.ts"
  "src/components/agent/AgentCommandWidget.tsx"
  "src/lib/agentClient.ts"
)

echo "💾 Creando backups..."
for file in "${FILES[@]}"; do
  cp "$file" "${file}.bak-autopilot-contract-phase-1-2-$STAMP"
  echo "  - ${file}.bak-autopilot-contract-phase-1-2-$STAMP"
done

python3 <<'PY'
from pathlib import Path
import re

def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    if start not in text:
        raise SystemExit(f"❌ No encontré start marker: {start}")
    start_i = text.index(start)
    end_i = text.index(end, start_i)
    return text[:start_i] + replacement + text[end_i:]

def replace_type_before(text: str, type_name: str, next_marker: str, replacement: str) -> str:
    start = f"export type {type_name} = {{"
    return replace_between(text, start, next_marker, replacement)

def find_function_bounds(text: str, name: str):
    marker = f"function {name}"
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"❌ No encontré function {name}")
    brace = text.find("{", start)
    if brace < 0:
        raise SystemExit(f"❌ No encontré apertura de {name}")
    depth = 0
    for i in range(brace, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
    raise SystemExit(f"❌ No encontré cierre de {name}")

def replace_function(text: str, name: str, replacement: str) -> str:
    start, end = find_function_bounds(text, name)
    return text[:start] + replacement + text[end:]

# ============================================================
# 1) Backend contract types/builders
# ============================================================

path = Path("apps/agent-worker/src/agent-widget-contract.ts")
text = path.read_text()

text = replace_type_before(
    text,
    "AgentWidgetSuggestedAction",
    "\n\nexport type AgentWidgetRecoveryPlan",
    """export type AgentWidgetRiskLevel = 'read' | 'low_write' | 'medium_write' | 'sensitive';

export type AgentWidgetSourceRecord = {
\ttype: string;
\tid?: string | null;
\tlabel?: string | null;
\thref?: string | null;
\tstatus?: string | null;
\tdue_at?: string | null;
\tamount?: string | number | null;
\tmodule?: string | null;
};

export type AgentWidgetActionTarget = {
\ttype?: string | null;
\tid?: string | null;
\tlabel?: string | null;
\thref?: string | null;
\tstatus?: string | null;
};

export type AgentWidgetContextRefs = {
\tsource_event_ids: string[];
\tsource_memory_keys: string[];
\tsource_modules: string[];
\tfull_record_ref?: {
\t\ttable?: string | null;
\t\tid?: string | null;
\t} | null;
};

export type AgentWidgetSuggestedAction = {
\taction_id: string;
\ttype: string;
\tlabel: string;
\treason?: string | null;
\tmodule?: string | null;
\tpriority?: AgentWidgetSeverity | null;
\trequires_confirmation: boolean;
\trisk_level?: AgentWidgetRiskLevel;
\trequired_fields?: string[];
\ttool_hint?: string | null;
\ttarget?: AgentWidgetActionTarget | null;
\tpayload?: Record<string, string | number | boolean | null>;
};

"""
)

text = replace_type_before(
    text,
    "AgentWidgetRecoveryPlan",
    "\n\nexport type AgentWidgetContractV1",
    """export type AgentWidgetRecoveryPlan = {
\tcase_key: string;
\tcase_type?: string;
\tplan_title: string;
\tseverity: AgentWidgetSeverity;
\tmessage?: string;
\tdiagnosis: string;
\tsource_context_excerpt?: string;
\tsource_records?: AgentWidgetSourceRecord[];
\tcontext_refs?: AgentWidgetContextRefs;
\trecommended_steps: AgentWidgetRecommendedStep[];
\tplan_steps?: AgentWidgetRecommendedStep[];
\tsuggested_actions: AgentWidgetSuggestedAction[];
\tactions?: AgentWidgetSuggestedAction[];
\trequires_confirmation: boolean;
\tsuccess_criteria: string;
};

"""
)

helper_marker = """function normalizePayload(value: unknown): Record<string, string | number | boolean | null> | undefined {
\tif (!isRecord(value)) return undefined;

\tconst entries = Object.entries(value).filter(([, item]) => {
\t\treturn typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null;
\t});

\tif (entries.length === 0) return undefined;

\treturn Object.fromEntries(entries) as Record<string, string | number | boolean | null>;
}
"""

if "function normalizeStringArray" not in text:
    text = text.replace(
        helper_marker,
        helper_marker + r'''

function normalizeStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => String(item || '').trim())
		.filter(Boolean);
}

function normalizeRiskLevel(value: unknown): AgentWidgetRiskLevel | undefined {
	const normalized = String(value || '').trim();

	if (normalized === 'read' || normalized === 'low_write' || normalized === 'medium_write' || normalized === 'sensitive') {
		return normalized;
	}

	return undefined;
}

function inferRiskLevelForAction(type: string): AgentWidgetRiskLevel {
	const normalized = type.toLowerCase();

	if (
		normalized.includes('review') ||
		normalized.includes('list') ||
		normalized.includes('search') ||
		normalized.includes('get') ||
		normalized.includes('summary')
	) {
		return 'read';
	}

	if (
		normalized.includes('draft') ||
		normalized.includes('send') ||
		normalized.includes('invoice') ||
		normalized.includes('payment') ||
		normalized.includes('whatsapp') ||
		normalized.includes('email')
	) {
		return 'sensitive';
	}

	if (
		normalized.includes('move') ||
		normalized.includes('reschedule') ||
		normalized.includes('reassign') ||
		normalized.includes('complete') ||
		normalized.includes('resolved') ||
		normalized.includes('status') ||
		normalized.includes('escalate')
	) {
		return 'medium_write';
	}

	return 'low_write';
}

function inferRequiredFieldsForAction(type: string, action: Record<string, unknown>): string[] {
	const fromAction = normalizeStringArray(action.required_fields);
	if (fromAction.length > 0) return fromAction;

	const normalized = type.toLowerCase();

	if (normalized === 'move_due_date' || normalized === 'reschedule_task') return ['new_due_date'];
	if (normalized === 'schedule_call') return ['date_or_time'];
	if (normalized === 'draft_email' || normalized === 'draft_whatsapp_reply') return ['message_intent'];
	if (normalized === 'send_reminder') return ['message_intent'];
	if (normalized === 'reassign_owner') return ['assignee'];
	if (normalized === 'record_outcome') return ['outcome'];
	if (normalized === 'create_task') return ['task_title'];

	return [];
}

function inferToolHintForAction(type: string, module: string | null): string | null {
	const normalized = type.toLowerCase();

	if (normalized === 'move_due_date') return 'reschedule_task';
	if (normalized === 'mark_resolved') return module === 'tasks' ? 'complete_task' : 'add_global_note';
	if (normalized === 'review_record') return 'get_record_by_id';
	if (normalized === 'create_task') return 'create_task';
	if (normalized === 'send_reminder') return 'draft_email_reply';
	if (normalized === 'draft_email') return 'draft_email_reply';
	if (normalized === 'schedule_call') return 'create_calendar_event';
	if (normalized === 'reassign_owner') return 'update_task';
	if (normalized === 'record_outcome') return 'add_global_note';
	if (normalized === 'escalate_ticket') return 'add_global_note';

	return null;
}

function normalizeTarget(value: unknown): AgentWidgetActionTarget | null {
	const target = asRecord(value);

	const normalized = {
		type: typeof target.type === 'string' ? target.type : null,
		id: typeof target.id === 'string' ? target.id : null,
		label: typeof target.label === 'string' ? target.label : null,
		href: typeof target.href === 'string' ? target.href : null,
		status: typeof target.status === 'string' ? target.status : null,
	};

	if (!normalized.type && !normalized.id && !normalized.label && !normalized.href && !normalized.status) {
		return null;
	}

	return normalized;
}

function buildSourceRecords(plan: AgentDailyPlanForWidget): AgentWidgetSourceRecord[] {
	const detectedCase = asRecord(plan.detected_case);
	const item = asRecord(detectedCase.item);
	const source = asRecord(detectedCase.source);
	const modules = Array.isArray(plan.source_modules) ? plan.source_modules : [];
	const type =
		cleanText(item.sourceType, '') ||
		cleanText(source.type, '') ||
		cleanText(item.module, '') ||
		cleanText(modules[0], '') ||
		cleanText(plan.case_type, 'record');

	const record: AgentWidgetSourceRecord = {
		type,
		id:
			cleanText(item.sourceId, '') ||
			cleanText(source.id, '') ||
			cleanText(item.id, '') ||
			null,
		label:
			cleanWidgetText(item.sourceLabel) ||
			cleanWidgetText(source.label) ||
			cleanWidgetText(item.title) ||
			cleanWidgetText(plan.case_title) ||
			null,
		href:
			cleanText(item.href, '') ||
			cleanText(source.href, '') ||
			null,
		status:
			cleanText(item.status, '') ||
			cleanText(source.status, '') ||
			null,
		due_at:
			cleanText(item.dueAt, '') ||
			cleanText(item.due_at, '') ||
			null,
		amount:
			typeof item.amount === 'string' || typeof item.amount === 'number'
				? item.amount
				: null,
		module:
			cleanText(item.module, '') ||
			cleanText(modules[0], '') ||
			null,
	};

	if (!record.id && !record.label && !record.href) return [];

	return [record];
}

function buildSourceContextExcerpt(plan: AgentDailyPlanForWidget): string {
	const detectedCase = asRecord(plan.detected_case);
	const item = asRecord(detectedCase.item);
	const people = [
		cleanText(item.client, ''),
		cleanText(item.lead, ''),
		cleanText(item.project, ''),
	].filter(Boolean);

	const lines = [
		`Caso: ${cleanWidgetText(plan.case_title) || cleanWidgetText(detectedCase.title) || 'Caso detectado'}`,
		`Resumen: ${cleanText(plan.case_summary, cleanText(detectedCase.summary, 'Sin resumen disponible.'))}`,
		`Tipo: ${cleanText(plan.case_type, 'detected_case')}`,
		`Severidad: ${cleanText(plan.case_severity, 'medium')}`,
		`Módulos fuente: ${Array.isArray(plan.source_modules) && plan.source_modules.length ? plan.source_modules.join(', ') : 'CRM'}`,
		cleanText(item.title, '') ? `Registro: ${cleanText(item.title, '')}` : '',
		cleanText(item.sourceLabel, '') ? `Fuente: ${cleanText(item.sourceLabel, '')}` : '',
		cleanText(item.dueAt, '') ? `Fecha relacionada: ${cleanText(item.dueAt, '')}` : '',
		cleanText(item.amount, '') ? `Monto relacionado: ${cleanText(item.amount, '')}` : '',
		people.length ? `Personas/contexto: ${people.join(' · ')}` : '',
		cleanText(item.urgencyReason, '') ? `Razón: ${cleanText(item.urgencyReason, '')}` : '',
		cleanText(item.recommendation, '') ? `Recomendación base: ${cleanText(item.recommendation, '')}` : '',
	]
		.filter(Boolean)
		.join('\n');

	return lines.slice(0, 1800);
}

function buildContextRefs(plan: AgentDailyPlanForWidget): AgentWidgetContextRefs {
	return {
		source_event_ids: Array.isArray(plan.source_event_ids) ? plan.source_event_ids : [],
		source_memory_keys: Array.isArray(plan.source_memory_keys) ? plan.source_memory_keys : [],
		source_modules: Array.isArray(plan.source_modules) ? plan.source_modules : [],
		full_record_ref: {
			table: 'agent_daily_plans',
			id: plan.id || null,
		},
	};
}
'''
    )

new_normalize_actions = r'''function normalizeSuggestedActions(plan: AgentDailyPlanForWidget): AgentWidgetSuggestedAction[] {
	const generatedPlan = asRecord(plan.generated_plan);
	const generatedActions = asArray(generatedPlan.actions);
	const directActions = asArray(plan.suggested_actions);
	const rawActions = generatedActions.length > 0 ? generatedActions : directActions;

	const actions = rawActions.filter(isRecord).map((action, index): AgentWidgetSuggestedAction => {
		const type = cleanText(action.type, 'review_record');
		const label = cleanText(action.label, 'Revisar caso');
		const module = cleanText(action.module, '') || (Array.isArray(plan.source_modules) ? cleanText(plan.source_modules[0], '') : '');
		const target = normalizeTarget(action.target);
		const payload = normalizePayload(action.payload);
		const riskLevel = normalizeRiskLevel(action.risk_level) || inferRiskLevelForAction(type);
		const requiredFields = inferRequiredFieldsForAction(type, action);
		const toolHint = cleanText(action.tool_hint, '') || inferToolHintForAction(type, module || null);

		return {
			action_id:
				cleanText(action.action_id, '') ||
				cleanText(action.id, '') ||
				`${cleanText(plan.case_key, 'case')}::${type}::${index + 1}`,
			type,
			label,
			reason: cleanText(action.reason, '') || cleanText(asRecord(plan.detected_case).summary, '') || null,
			module: module || null,
			priority: normalizeSeverity(action.priority || plan.case_severity),
			requires_confirmation:
				typeof action.requires_confirmation === 'boolean'
					? action.requires_confirmation
					: typeof action.requiresConfirmation === 'boolean'
						? action.requiresConfirmation
						: riskLevel !== 'read',
			risk_level: riskLevel,
			required_fields: requiredFields,
			tool_hint: toolHint,
			target,
			...(payload
				? { payload }
				: target?.id || target?.label || target?.href
					? {
							payload: {
								target_id: typeof target.id === 'string' ? target.id : null,
								target_label: typeof target.label === 'string' ? target.label : null,
								target_href: typeof target.href === 'string' ? target.href : null,
							},
						}
					: {}),
		};
	});

	if (actions.length > 0) return actions;

	const fallbackRisk = 'read' as const;

	return [
		{
			action_id: `${cleanText(plan.case_key, 'case')}::review_record`,
			type: 'review_record',
			label: 'Revisar caso',
			reason: 'Validar la evidencia antes de decidir una acción.',
			module: Array.isArray(plan.source_modules) ? cleanText(plan.source_modules[0], '') || null : null,
			requires_confirmation: false,
			risk_level: fallbackRisk,
			required_fields: [],
			tool_hint: 'get_record_by_id',
			target: buildSourceRecords(plan)[0]
				? {
						type: buildSourceRecords(plan)[0].type,
						id: buildSourceRecords(plan)[0].id || null,
						label: buildSourceRecords(plan)[0].label || null,
						href: buildSourceRecords(plan)[0].href || null,
						status: buildSourceRecords(plan)[0].status || null,
					}
				: null,
		},
	];
}'''

text = replace_function(text, "normalizeSuggestedActions", new_normalize_actions)

new_daily_plan = r'''function dailyPlanToWidgetRecoveryPlan(plan: AgentDailyPlanForWidget): AgentWidgetRecoveryPlan {
	const generatedPlan = asRecord(plan.generated_plan);
	const detectedCase = asRecord(plan.detected_case);
	const actions = normalizeSuggestedActions(plan);
	const sourceRecords = buildSourceRecords(plan);

	return {
		case_key: cleanText(plan.case_key, cleanText(plan.id, 'case')),
		case_type: cleanText(plan.case_type, 'detected_case'),
		plan_title:
			cleanWidgetText(plan.case_title) ||
			cleanWidgetText(detectedCase.title) ||
			cleanWidgetText(plan.plan_title) ||
			cleanWidgetText(generatedPlan.title) ||
			'Caso detectado',
		severity: normalizeSeverity(plan.case_severity),
		message:
			cleanText(plan.plan_summary, '') ||
			cleanText(plan.case_summary, '') ||
			cleanText(detectedCase.summary, 'El agente detectó un caso que requiere atención.'),
		diagnosis:
			cleanText(generatedPlan.rationale, '') ||
			cleanText(detectedCase.reason, '') ||
			cleanText(plan.case_summary, 'El caso requiere revisión antes de ejecutar acciones.'),
		source_context_excerpt: buildSourceContextExcerpt(plan),
		source_records: sourceRecords,
		context_refs: buildContextRefs(plan),
		recommended_steps: buildRecommendedSteps(plan),
		suggested_actions: actions,
		actions,
		requires_confirmation: actions.some((action) => action.requires_confirmation),
		success_criteria: 'El caso queda revisado, aprobado y listo para ejecución controlada.',
	};
}'''

text = replace_function(text, "dailyPlanToWidgetRecoveryPlan", new_daily_plan)

path.write_text(text)
print("✅ Backend contract actualizado")


# ============================================================
# 2) Worker prompt + validator
# ============================================================

path = Path("apps/agent-worker/src/index.ts")
text = path.read_text()

old_schema_start = "FORMA EXACTA DEL JSON:"
old_schema_end = "CONTEXTO DEL CRM:"
start = text.find(old_schema_start)
end = text.find(old_schema_end, start)
if start < 0 or end < 0:
    raise SystemExit("❌ No encontré bloque de schema del prompt")

new_schema = r'''FORMA EXACTA DEL JSON:
{
  "schema_version": "agent_widget_contract_v1",
  "status": "ready",
  "generated_at": "ISO_DATE",
  "summary": {
    "total_cases": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "recovery_plans": [
    {
      "case_key": "string",
      "case_type": "string",
      "plan_title": "string",
      "severity": "critical|high|medium|low",
      "message": "string",
      "diagnosis": "string",
      "source_context_excerpt": "fragmento textual breve de la evidencia/contexto que originó el caso",
      "source_records": [
        {
          "type": "task|invoice|lead|client|project|proposal|calendar|ticket|record",
          "id": "id real si existe",
          "label": "nombre visible del registro",
          "href": "ruta si existe",
          "status": "estado si existe",
          "due_at": "fecha si existe",
          "amount": "monto si existe",
          "module": "módulo CRM"
        }
      ],
      "context_refs": {
        "source_event_ids": [],
        "source_memory_keys": [],
        "source_modules": [],
        "full_record_ref": {
          "table": "agent_daily_plans",
          "id": "id si existe"
        }
      },
      "plan_steps": [
        {
          "title": "string",
          "description": "string"
        }
      ],
      "suggested_actions": [
        {
          "action_id": "string",
          "type": "string",
          "label": "string",
          "reason": "string",
          "module": "string",
          "priority": "critical|high|medium|low",
          "requires_confirmation": true,
          "risk_level": "read|low_write|medium_write|sensitive",
          "required_fields": ["campo_faltante_si_aplica"],
          "tool_hint": "nombre_de_tool_probable_o_null",
          "target": {
            "type": "string",
            "id": "string",
            "label": "string",
            "href": "string",
            "status": "string"
          },
          "payload": null
        }
      ],
      "requires_confirmation": true,
      "success_criteria": "string"
    }
  ]
}

REGLAS PARA source_context_excerpt:
- Debe resumir el fragmento real del CONTEXTO DEL CRM que originó el caso.
- No inventes datos.
- Incluye fechas, monto, cliente, lead, tarea, factura o registro si aparece en el contexto.
- Si no hay ID real, deja id como null o string vacío.

REGLAS PARA suggested_actions:
- Usa máximo 2 acciones sugeridas por caso.
- Las acciones son atajos de intención, no ejecución automática.
- required_fields debe listar datos que faltan para ejecutar con seguridad.
- risk_level debe ser:
  - read: buscar, revisar, listar, resumir.
  - low_write: crear nota, tarea o recordatorio simple.
  - medium_write: reprogramar, cambiar estado, reasignar o completar.
  - sensitive: facturas, pagos, montos, email enviado, WhatsApp enviado.
- Para acciones sensitive, NO propongas envío directo; usa borrador, revisión o nota.
- tool_hint debe usar una tool existente si sabes cuál aplica; si no, null.

'''
text = text[:start] + new_schema + text[end:]

if "function normalizeWidgetRiskLevel" not in text:
    insert_before = "function validateOpenClawWidgetContract(contract: any) {"
    helpers = r'''
function normalizeWidgetRiskLevel(value: any) {
	const normalized = String(value || '').trim();

	if (['read', 'low_write', 'medium_write', 'sensitive'].includes(normalized)) return normalized;

	return undefined;
}

function normalizeWidgetStringArray(value: any) {
	if (!Array.isArray(value)) return [];

	return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeWidgetSourceRecords(value: any) {
	if (!Array.isArray(value)) return [];

	return value.slice(0, 5).map((record: any) => ({
		type: String(record?.type || 'record'),
		id: record?.id ? String(record.id) : null,
		label: record?.label ? String(record.label) : null,
		href: record?.href ? String(record.href) : null,
		status: record?.status ? String(record.status) : null,
		due_at: record?.due_at || record?.dueAt ? String(record.due_at || record.dueAt) : null,
		amount:
			typeof record?.amount === 'string' || typeof record?.amount === 'number'
				? record.amount
				: null,
		module: record?.module ? String(record.module) : null,
	}));
}

function normalizeWidgetAction(action: any, index: number, plan: any) {
	const type = String(action?.type || 'review_record');
	const riskLevel = normalizeWidgetRiskLevel(action?.risk_level) || (action?.requires_confirmation === false ? 'read' : 'medium_write');
	const target = action?.target && typeof action.target === 'object'
		? {
				type: action.target.type ? String(action.target.type) : null,
				id: action.target.id ? String(action.target.id) : null,
				label: action.target.label ? String(action.target.label) : null,
				href: action.target.href ? String(action.target.href) : null,
				status: action.target.status ? String(action.target.status) : null,
			}
		: null;

	return {
		action_id: String(action?.action_id || action?.id || `${plan?.case_key || 'case'}::${type}::${index + 1}`),
		type,
		label: String(action?.label || 'Revisar caso'),
		reason: action?.reason ? String(action.reason) : null,
		module: action?.module ? String(action.module) : null,
		priority: ['critical', 'high', 'medium', 'low'].includes(action?.priority) ? action.priority : plan?.severity || 'medium',
		requires_confirmation:
			typeof action?.requires_confirmation === 'boolean'
				? action.requires_confirmation
				: riskLevel !== 'read',
		risk_level: riskLevel,
		required_fields: normalizeWidgetStringArray(action?.required_fields),
		tool_hint: action?.tool_hint ? String(action.tool_hint) : null,
		target,
		payload: action?.payload && typeof action.payload === 'object' && !Array.isArray(action.payload) ? action.payload : undefined,
	};
}

'''
    if insert_before not in text:
        raise SystemExit("❌ No encontré validateOpenClawWidgetContract para insertar helpers")
    text = text.replace(insert_before, helpers + insert_before)

new_validate = r'''function validateOpenClawWidgetContract(contract: any) {
	if (!contract || typeof contract !== 'object') {
		throw new Error('OpenClaw devolvió un contrato vacío.');
	}

	if (contract.schema_version !== 'agent_widget_contract_v1') {
		throw new Error('OpenClaw devolvió un schema_version inválido.');
	}

	if (!Array.isArray(contract.recovery_plans)) {
		throw new Error('OpenClaw devolvió recovery_plans inválido.');
	}

	const plans = contract.recovery_plans.map((plan: any, index: number) => {
		const title = String(plan?.plan_title || '').trim();

		if (!title || title.toLowerCase().includes('reserved for future agent') || title.toLowerCase().includes('agente futuro')) {
			throw new Error(`OpenClaw devolvió un título placeholder en recovery_plans[${index}].`);
		}

		const severity = ['critical', 'high', 'medium', 'low'].includes(plan?.severity) ? plan.severity : 'medium';
		const rawActions = Array.isArray(plan?.suggested_actions)
			? plan.suggested_actions
			: Array.isArray(plan?.actions)
				? plan.actions
				: [];
		const planSteps = Array.isArray(plan?.plan_steps)
			? plan.plan_steps
			: Array.isArray(plan?.recommended_steps)
				? plan.recommended_steps
				: [];

		const normalizedPlan = {
			...plan,
			case_key: String(plan?.case_key || `case-${index + 1}`),
			case_type: String(plan?.case_type || 'detected_case'),
			plan_title: title,
			severity,
			message: String(plan?.message || plan?.diagnosis || 'Caso detectado por el CRM.'),
			diagnosis: String(plan?.diagnosis || plan?.message || 'El agente identificó una oportunidad de intervención.'),
			source_context_excerpt: String(plan?.source_context_excerpt || plan?.diagnosis || plan?.message || '').slice(0, 1800),
			source_records: normalizeWidgetSourceRecords(plan?.source_records),
			context_refs: {
				source_event_ids: normalizeWidgetStringArray(plan?.context_refs?.source_event_ids),
				source_memory_keys: normalizeWidgetStringArray(plan?.context_refs?.source_memory_keys),
				source_modules: normalizeWidgetStringArray(plan?.context_refs?.source_modules),
				full_record_ref: plan?.context_refs?.full_record_ref && typeof plan.context_refs.full_record_ref === 'object'
					? {
							table: plan.context_refs.full_record_ref.table ? String(plan.context_refs.full_record_ref.table) : null,
							id: plan.context_refs.full_record_ref.id ? String(plan.context_refs.full_record_ref.id) : null,
						}
					: null,
			},
			plan_steps: planSteps.slice(0, 5).map((step: any, stepIndex: number) => ({
				title: String(step?.title || `Paso ${stepIndex + 1}`),
				description: String(step?.description || 'Ejecutar este paso con validación del usuario.'),
			})),
			requires_confirmation: plan?.requires_confirmation !== false,
			success_criteria: String(plan?.success_criteria || 'El caso queda resuelto o con el próximo paso definido.'),
		};

		const actions = rawActions.slice(0, 2).map((action: any, actionIndex: number) =>
			normalizeWidgetAction(action, actionIndex, normalizedPlan),
		);

		return {
			...normalizedPlan,
			suggested_actions: actions,
			actions,
			requires_confirmation:
				normalizedPlan.requires_confirmation || actions.some((action: any) => action.requires_confirmation),
		};
	});

	const summary = {
		total_cases: plans.length,
		critical: plans.filter((p: any) => p.severity === 'critical').length,
		high: plans.filter((p: any) => p.severity === 'high').length,
		medium: plans.filter((p: any) => p.severity === 'medium').length,
		low: plans.filter((p: any) => p.severity === 'low').length,
	};

	return {
		schema_version: 'agent_widget_contract_v1',
		status: plans.length ? 'ready' : 'idle',
		generated_at: contract.generated_at || new Date().toISOString(),
		summary,
		recovery_plans: plans,
	};
}'''
text = replace_function(text, "validateOpenClawWidgetContract", new_validate)

path.write_text(text)
print("✅ Worker prompt/validator actualizado")


# ============================================================
# 3) Frontend contract types
# ============================================================

path = Path("src/components/agent/agentWidgetContract.ts")
text = path.read_text()

text = replace_type_before(
    text,
    "AgentWidgetSuggestedAction",
    "\n\nexport type AgentWidgetRecoveryPlan",
    """export type AgentWidgetRiskLevel = "read" | "low_write" | "medium_write" | "sensitive";

export type AgentWidgetSourceRecord = {
  type: string;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
  due_at?: string | null;
  amount?: string | number | null;
  module?: string | null;
};

export type AgentWidgetActionTarget = {
  type?: string | null;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
};

export type AgentWidgetContextRefs = {
  source_event_ids: string[];
  source_memory_keys: string[];
  source_modules: string[];
  full_record_ref?: {
    table?: string | null;
    id?: string | null;
  } | null;
};

export type AgentWidgetSuggestedAction = {
  action_id: string;
  type: string;
  label: string;
  reason?: string | null;
  module?: string | null;
  priority?: AgentWidgetSeverity | null;
  requires_confirmation: boolean;
  risk_level?: AgentWidgetRiskLevel;
  required_fields?: string[];
  tool_hint?: string | null;
  target?: AgentWidgetActionTarget | null;
  payload?: Record<string, string | number | boolean | null>;
};

"""
)

text = replace_type_before(
    text,
    "AgentWidgetRecoveryPlan",
    "\n\nexport type AgentWidgetContractV1",
    """export type AgentWidgetRecoveryPlan = {
  case_key: string;
  case_type?: string;
  plan_title: string;
  severity: AgentWidgetSeverity;
  message?: string;
  diagnosis: string;
  source_context_excerpt?: string;
  source_records?: AgentWidgetSourceRecord[];
  context_refs?: AgentWidgetContextRefs;
  recommended_steps: AgentWidgetRecommendedStep[];
  plan_steps?: AgentWidgetRecommendedStep[];
  suggested_actions: AgentWidgetSuggestedAction[];
  actions?: AgentWidgetSuggestedAction[];
  requires_confirmation: boolean;
  success_criteria: string;
};

"""
)

path.write_text(text)
print("✅ Frontend contract types actualizados")


# ============================================================
# 4) AgentCommandWidget type: preserve execution context
# ============================================================

path = Path("src/components/agent/AgentCommandWidget.tsx")
text = path.read_text()

start = "export type AgentRecoveryPlan = {"
end = "\n\ntype AgentCommandWidgetProps = {"
new_type = """export type AgentRiskLevel = "read" | "low_write" | "medium_write" | "sensitive";

export type AgentSourceRecord = {
  type: string;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
  due_at?: string | null;
  amount?: string | number | null;
  module?: string | null;
};

export type AgentActionTarget = {
  type?: string | null;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
};

export type AgentRecoveryPlan = {
  case_key: string;
  case_type?: string;
  title: string;
  severity: AgentSeverity;
  message: string;
  diagnosis: string;
  source_context_excerpt?: string;
  source_records?: AgentSourceRecord[];
  context_refs?: {
    source_event_ids?: string[];
    source_memory_keys?: string[];
    source_modules?: string[];
    full_record_ref?: {
      table?: string | null;
      id?: string | null;
    } | null;
  };
  plan_steps: Array<{
    title: string;
    description: string;
  }>;
  suggested_actions: Array<{
    action_id?: string;
    type: string;
    label: string;
    reason?: string | null;
    module?: string | null;
    priority?: AgentSeverity | null;
    requires_confirmation: boolean;
    risk_level?: AgentRiskLevel;
    required_fields?: string[];
    tool_hint?: string | null;
    target?: AgentActionTarget | null;
    payload?: Record<string, string | number | boolean | null>;
  }>;
  result?: {
    title: string;
    message: string;
    data: Array<{ label: string; value: string }>;
  };
};"""
text = replace_between(text, start, end, new_type)
path.write_text(text)
print("✅ AgentCommandWidget type actualizado")


# ============================================================
# 5) Adapter: preserve fields
# ============================================================

path = Path("src/components/agent/agentPromptPayloadAdapter.ts")
text = path.read_text()

text = text.replace(
    """export type AgentPromptSuggestedAction = {
  action_id?: string | null;
  case_key?: string | null;
  type?: string | null;
  label?: string | null;
  reason?: string | null;
  module?: string | null;
  priority?: AgentPromptSeverity | null;
  requires_confirmation?: boolean | null;
  requiresConfirmation?: boolean | null;
  target?: {
    type?: string | null;
    id?: string | null;
    label?: string | null;
    href?: string | null;
    status?: string | null;
  } | null;
  payload?: Record<string, string | number | boolean | null> | null;
};""",
    """export type AgentPromptSuggestedAction = {
  action_id?: string | null;
  id?: string | null;
  case_key?: string | null;
  type?: string | null;
  label?: string | null;
  reason?: string | null;
  module?: string | null;
  priority?: AgentPromptSeverity | null;
  requires_confirmation?: boolean | null;
  requiresConfirmation?: boolean | null;
  risk_level?: "read" | "low_write" | "medium_write" | "sensitive" | string | null;
  required_fields?: string[] | null;
  tool_hint?: string | null;
  target?: {
    type?: string | null;
    id?: string | null;
    label?: string | null;
    href?: string | null;
    status?: string | null;
  } | null;
  payload?: Record<string, string | number | boolean | null> | null;
};"""
)

if "export type AgentPromptSourceRecord" not in text:
    text = text.replace(
        "export type AgentPromptRecoveryPlan = {",
        """export type AgentPromptSourceRecord = {
  type?: string | null;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
  due_at?: string | null;
  amount?: string | number | null;
  module?: string | null;
};

export type AgentPromptContextRefs = {
  source_event_ids?: string[];
  source_memory_keys?: string[];
  source_modules?: string[];
  full_record_ref?: {
    table?: string | null;
    id?: string | null;
  } | null;
};

export type AgentPromptRecoveryPlan = {"""
    )

text = text.replace(
    """  diagnosis?: string | null;
  recommended_steps?: Array<{""",
    """  diagnosis?: string | null;
  source_context_excerpt?: string | null;
  source_records?: AgentPromptSourceRecord[];
  context_refs?: AgentPromptContextRefs;
  recommended_steps?: Array<{"""
)

if "function normalizeRiskLevel" not in text:
    text = text.replace(
        """function actionRequiresConfirmation(action: AgentPromptSuggestedAction) {
  if (typeof action.requires_confirmation === "boolean") return action.requires_confirmation;
  if (typeof action.requiresConfirmation === "boolean") return action.requiresConfirmation;
  return true;
}
""",
        """function actionRequiresConfirmation(action: AgentPromptSuggestedAction) {
  if (typeof action.requires_confirmation === "boolean") return action.requires_confirmation;
  if (typeof action.requiresConfirmation === "boolean") return action.requiresConfirmation;
  return true;
}

function normalizeRiskLevel(value: unknown) {
  const normalized = String(value || "").trim();

  if (
    normalized === "read" ||
    normalized === "low_write" ||
    normalized === "medium_write" ||
    normalized === "sensitive"
  ) {
    return normalized;
  }

  return undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeSourceRecords(records: unknown): AgentPromptSourceRecord[] {
  if (!Array.isArray(records)) return [];

  return records.slice(0, 5).map((record) => {
    const item = record && typeof record === "object" ? (record as AgentPromptSourceRecord) : {};

    return {
      type: cleanText(item.type, "record"),
      id: item.id || null,
      label: item.label || null,
      href: item.href || null,
      status: item.status || null,
      due_at: item.due_at || null,
      amount: item.amount ?? null,
      module: item.module || null,
    };
  });
}

function normalizeSuggestedAction(action: AgentPromptSuggestedAction) {
  return {
    action_id: cleanText(action.action_id || action.id, ""),
    type: cleanText(action.type, "review_record"),
    label: cleanText(action.label, "Revisar caso"),
    reason: action.reason || null,
    module: action.module || null,
    priority: action.priority ? normalizeSeverity(action.priority) : null,
    requires_confirmation: actionRequiresConfirmation(action),
    risk_level: normalizeRiskLevel(action.risk_level),
    required_fields: normalizeStringArray(action.required_fields),
    tool_hint: action.tool_hint || null,
    target: action.target
      ? {
          type: action.target.type || null,
          id: action.target.id || null,
          label: action.target.label || null,
          href: action.target.href || null,
          status: action.target.status || null,
        }
      : null,
    payload: action.payload || undefined,
  };
}
"""
    )

text = replace_function(
    text,
    "actionsForCase",
    """function actionsForCase(payload: AgentPromptPayload, caseKey: string) {
  return (payload.suggested_actions || [])
    .filter((action) => action.case_key === caseKey)
    .map(normalizeSuggestedAction);
}"""
)

text = text.replace(
    """      type: "review_record",
      label: "Revisar caso",
      requires_confirmation: true,""",
    """      type: "review_record",
      label: "Revisar caso",
      requires_confirmation: false,
      risk_level: "read",
      required_fields: [],
      tool_hint: "get_record_by_id","""
)

text = replace_function(
    text,
    "normalizeWidgetContractRecoveryPlan",
    r'''function normalizeWidgetContractRecoveryPlan(plan: AgentWidgetRecoveryPlan): AgentRecoveryPlan {
  const steps = plan.plan_steps || plan.recommended_steps || [];
  const actions = plan.suggested_actions || plan.actions || [];

  return {
    case_key: cleanText(plan.case_key, "unknown_case"),
    case_type: plan.case_type,
    title: cleanText(plan.plan_title, "Caso detectado"),
    severity: normalizeSeverity(plan.severity),
    message: cleanText(
      plan.message,
      "El agente detectó un caso que requiere atención.",
    ),
    diagnosis: cleanText(
      plan.diagnosis,
      "Este caso requiere revisión y una acción controlada.",
    ),
    source_context_excerpt: plan.source_context_excerpt || "",
    source_records: normalizeSourceRecords(plan.source_records),
    context_refs: plan.context_refs,
    plan_steps:
      steps.length > 0
        ? steps.map((step) => ({
            title: cleanText(step.title, "Paso"),
            description: cleanText(step.description, "Ejecutar este paso con validación."),
          }))
        : [
            { title: "Diagnóstico", description: "Validar el caso detectado y su nivel de prioridad." },
            { title: "Preparación", description: "Preparar la acción recomendada antes de ejecutarla." },
            { title: "Confirmación", description: "Solicitar aprobación antes de modificar datos o contactar clientes." },
          ],
    suggested_actions: actions.map(normalizeSuggestedAction),
    result: {
      title: "Criterio de éxito",
      message: cleanText(
        plan.success_criteria,
        "El caso queda resuelto o con el próximo paso definido.",
      ),
      data: [
        { label: "Confirmación", value: plan.requires_confirmation ? "Requerida" : "No requerida" },
        { label: "Severidad", value: cleanText(plan.severity, "low") },
      ],
    },
  };
}'''
)

text = replace_function(
    text,
    "normalizeRecoveryPlan",
    r'''function normalizeRecoveryPlan(plan: AgentPromptRecoveryPlan, payload: AgentPromptPayload): AgentRecoveryPlan {
  const caseKey = cleanText(plan.case_key, `recovery_plan_${Math.random().toString(36).slice(2)}`);
  const steps = plan.plan_steps || plan.recommended_steps || [];

  const suggestedActions =
    plan.suggested_actions && plan.suggested_actions.length > 0
      ? plan.suggested_actions.map(normalizeSuggestedAction)
      : actionsForCase(payload, caseKey);

  return {
    case_key: caseKey,
    case_type: undefined,
    title: cleanText(plan.plan_title || plan.title, "Caso detectado"),
    severity: normalizeSeverity(plan.priority || plan.severity),
    message: cleanText(plan.message, "El agente detectó un caso que requiere atención."),
    diagnosis: cleanText(plan.diagnosis, "Este caso requiere revisión y una acción controlada."),
    source_context_excerpt: plan.source_context_excerpt || "",
    source_records: normalizeSourceRecords(plan.source_records),
    context_refs: plan.context_refs,
    plan_steps:
      steps.length > 0
        ? steps.map((step) => ({
            title: cleanText(step.title, "Paso"),
            description: cleanText(step.description, "Ejecutar este paso con validación."),
          }))
        : [
            { title: "Revisar", description: "Validar el estado actual del caso." },
            { title: "Preparar", description: "Preparar la acción recomendada." },
            { title: "Confirmar", description: "Solicitar aprobación antes de ejecutar." },
          ],
    suggested_actions:
      suggestedActions.length > 0
        ? suggestedActions
        : [
            {
              type: "review_record",
              label: "Revisar caso",
              requires_confirmation: false,
              risk_level: "read",
              required_fields: [],
              tool_hint: "get_record_by_id",
            },
          ],
    result: plan.result
      ? {
          title: cleanText(plan.result.title, "Plan listo"),
          message: cleanText(plan.result.message, "El plan quedó preparado."),
          data: (plan.result.data || []).map((item) => ({
            label: cleanText(item.label, "Dato"),
            value: cleanText(item.value, "-"),
          })),
        }
      : undefined,
  };
}'''
)

# Insert source fields into detectedCaseToTemporaryRecoveryPlan return.
text = text.replace(
    """    diagnosis: cleanText(
      detectedCase.diagnosis || detectedCase.reason || detectedCase.summary,
      "El caso requiere revisión antes de ejecutar cualquier acción.",
    ),
    plan_steps: buildStepsFromDetectedCase(detectedCase),""",
    """    diagnosis: cleanText(
      detectedCase.diagnosis || detectedCase.reason || detectedCase.summary,
      "El caso requiere revisión antes de ejecutar cualquier acción.",
    ),
    source_context_excerpt: [
      cleanText(detectedCase.title, "Caso detectado"),
      cleanText(detectedCase.summary, ""),
      cleanText(detectedCase.reason, ""),
      cleanText(detectedCase.recommendation, ""),
    ].filter(Boolean).join("\\n").slice(0, 1800),
    source_records: normalizeSourceRecords([
      {
        type: detectedCase.source?.type || detectedCase.source?.module || "record",
        id: detectedCase.source?.id || null,
        label: detectedCase.source?.label || sourceLabel,
        href: detectedCase.source?.href || null,
        due_at: detectedCase.timing?.due_at || null,
        amount: detectedCase.money?.amount ?? null,
        module: detectedCase.source?.module || detectedCase.references?.source_modules?.[0] || null,
      },
    ]),
    context_refs: {
      source_event_ids: detectedCase.references?.source_event_ids || [],
      source_memory_keys: detectedCase.references?.source_memory_keys || [],
      source_modules: detectedCase.references?.source_modules || [],
      full_record_ref: {
        table: detectedCase.references?.full_record_table || null,
        id: detectedCase.references?.full_record_id || null,
      },
    },
    plan_steps: buildStepsFromDetectedCase(detectedCase),"""
)

path.write_text(text)
print("✅ Frontend adapter actualizado")


# ============================================================
# 6) agentClient typed supabase cast for new tables
# ============================================================

path = Path("src/lib/agentClient.ts")
text = path.read_text()

text = text.replace(
    """  let query = supabase
    .from("agent_operating_context")""",
    """  let query = (supabase as any)
    .from("agent_operating_context")"""
)

text = text.replace(
    """  let query = supabase
    .from("agent_widget_contracts")""",
    """  let query = (supabase as any)
    .from("agent_widget_contracts")"""
)

path.write_text(text)
print("✅ agentClient Supabase casts actualizados")

PY

echo ""
echo "============================================================"
echo "🔎 Diff resumido"
echo "============================================================"
git diff -- \
  apps/agent-worker/src/agent-widget-contract.ts \
  apps/agent-worker/src/index.ts \
  src/components/agent/agentWidgetContract.ts \
  src/components/agent/agentPromptPayloadAdapter.ts \
  src/components/agent/AgentCommandWidget.tsx \
  src/lib/agentClient.ts | sed -n '1,260p'

echo ""
echo "============================================================"
echo "🧪 Typecheck"
echo "============================================================"
npx tsc --noEmit || true

echo ""
echo "✅ Fase 1 y 2 aplicada."
echo ""
echo "Siguiente prueba recomendada:"
echo "1. Reinicia worker y frontend."
echo "2. Ejecuta refresh de operating context."
echo "3. Revisa agent_widget_contracts.contract_json y confirma que recovery_plans trae:"
echo "   - source_context_excerpt"
echo "   - source_records"
echo "   - context_refs"
echo "   - suggested_actions[].risk_level"
echo "   - suggested_actions[].required_fields"
echo "   - suggested_actions[].tool_hint"
