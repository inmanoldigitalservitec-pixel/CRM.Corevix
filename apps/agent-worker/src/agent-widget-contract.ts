export const AGENT_WIDGET_CONTRACT_VERSION = 'agent_widget_contract_v1' as const;

export type AgentWidgetContractStatus = 'idle' | 'analyzing' | 'ready' | 'executing' | 'done' | 'error';
export type AgentWidgetSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AgentWidgetSummary = {
	total_cases: number;
	critical: number;
	high: number;
	medium: number;
	low: number;
};

export type AgentWidgetRecommendedStep = {
	title: string;
	description: string;
};

export type AgentWidgetRiskLevel = 'read' | 'low_write' | 'medium_write' | 'sensitive';

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



export type AgentWidgetRecoveryPlan = {
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



export type AgentWidgetContractV1 = {
	schema_version: typeof AGENT_WIDGET_CONTRACT_VERSION;
	status: AgentWidgetContractStatus;
	generated_at: string;
	summary: AgentWidgetSummary;
	recovery_plans: AgentWidgetRecoveryPlan[];
};

export type AgentDailyPlanForWidget = {
	id?: string | null;
	company_id?: string | null;
	user_id?: string | null;
	cycle_date?: string | null;
	case_key?: string | null;
	case_type?: string | null;
	case_title?: string | null;
	case_summary?: string | null;
	case_severity?: string | null;
	detected_case?: unknown;
	plan_title?: string | null;
	plan_summary?: string | null;
	generated_plan?: unknown;
	suggested_actions?: unknown;
	state?: string | null;
	source_modules?: string[] | null;
	source_event_ids?: string[] | null;
	source_memory_keys?: string[] | null;
	updated_at?: string | null;
	created_at?: string | null;
};

type SupabaseLike = {
	from: (table: string) => any;
};

type WriteAgentWidgetContractOptions = {
	companyId?: string | null;
	userId?: string | null;
	cycleDate?: string | null;
	generatedBy?: string;
	sourceContextId?: string | null;
};

type WriteAgentWidgetContractResult = {
	contract: AgentWidgetContractV1;
	row: unknown;
	mode: 'inserted' | 'updated';
};


function isReservedAgentPlaceholder(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	const normalized = value.trim().toLowerCase();
	return (
		normalized === 'reserved for future agent' ||
		normalized === 'reserved_for_future_agent' ||
		normalized.includes('reserved for future agent')
	);
}

function cleanWidgetText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed || isReservedAgentPlaceholder(trimmed)) return null;
	return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function cleanText(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback;

	const text = value.trim();

	return text.length > 0 ? text : fallback;
}

function normalizeSeverity(value: unknown): AgentWidgetSeverity {
	if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
		return value;
	}

	if (value === 'urgent') return 'critical';
	if (value === 'normal') return 'medium';

	return 'low';
}

function normalizePayload(value: unknown): Record<string, string | number | boolean | null> | undefined {
	if (!isRecord(value)) return undefined;

	const entries = Object.entries(value).filter(([, item]) => {
		return typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null;
	});

	if (entries.length === 0) return undefined;

	return Object.fromEntries(entries) as Record<string, string | number | boolean | null>;
}


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

function normalizeSuggestedActions(plan: AgentDailyPlanForWidget): AgentWidgetSuggestedAction[] {
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
}

function buildRecommendedSteps(plan: AgentDailyPlanForWidget): AgentWidgetRecommendedStep[] {
	const detectedCase = asRecord(plan.detected_case);
	const generatedPlan = asRecord(plan.generated_plan);

	const recommendation =
		cleanText(generatedPlan.summary, '') ||
		cleanText(plan.plan_summary, '') ||
		cleanText(detectedCase.summary, '') ||
		'Preparar una acción segura antes de modificar datos del CRM.';

	const modules = Array.isArray(plan.source_modules) && plan.source_modules.length > 0
		? plan.source_modules.join(', ')
		: cleanText(detectedCase.source_module, 'CRM');

	return [
		{
			title: 'Revisar evidencia',
			description: `Validar el caso en ${modules} antes de ejecutar cualquier acción.`,
		},
		{
			title: 'Confirmar recomendación',
			description: recommendation,
		},
		{
			title: 'Solicitar aprobación',
			description: 'No ejecutar cambios sensibles sin confirmación humana.',
		},
	];
}

function dailyPlanToWidgetRecoveryPlan(plan: AgentDailyPlanForWidget): AgentWidgetRecoveryPlan {
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
}

function buildSummary(plans: AgentWidgetRecoveryPlan[]): AgentWidgetSummary {
	return plans.reduce<AgentWidgetSummary>(
		(summary, plan) => {
			summary.total_cases += 1;
			summary[plan.severity] += 1;
			return summary;
		},
		{
			total_cases: 0,
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
		},
	);
}

export function buildAgentWidgetContractFromDailyPlans(plans: AgentDailyPlanForWidget[]): AgentWidgetContractV1 {
	const activePlans = plans.filter((plan) => {
		const state = cleanText(plan.state, 'new');

		return !['completed', 'dismissed', 'expired'].includes(state);
	});

	const recoveryPlans = activePlans.map(dailyPlanToWidgetRecoveryPlan);

	return {
		schema_version: AGENT_WIDGET_CONTRACT_VERSION,
		status: recoveryPlans.length > 0 ? 'ready' : 'idle',
		generated_at: new Date().toISOString(),
		summary: buildSummary(recoveryPlans),
		recovery_plans: recoveryPlans,
	};
}

function nullableFilter(query: any, column: string, value: string | null | undefined) {
	if (value) return query.eq(column, value);

	return query.is(column, null);
}

export async function writeAgentWidgetContractFromDailyPlans(
	supabase: SupabaseLike,
	plans: AgentDailyPlanForWidget[],
	options: WriteAgentWidgetContractOptions = {},
): Promise<WriteAgentWidgetContractResult> {
	const cycleDate = options.cycleDate || plans[0]?.cycle_date || new Date().toISOString().slice(0, 10);
	const companyId = options.companyId ?? plans[0]?.company_id ?? null;
	const userId = options.userId ?? plans[0]?.user_id ?? null;
	const generatedBy = options.generatedBy || 'agent-worker';

	const contract = buildAgentWidgetContractFromDailyPlans(plans);

	const payload = {
		company_id: companyId,
		user_id: userId,
		cycle_date: cycleDate,
		schema_version: AGENT_WIDGET_CONTRACT_VERSION,
		status: contract.status,
		contract_json: contract,
		source_context_id: options.sourceContextId || null,
		generated_by: generatedBy,
		error_message: null,
		updated_at: new Date().toISOString(),
	};

	let existingQuery = supabase
		.from('agent_widget_contracts')
		.select('id')
		.eq('cycle_date', cycleDate)
		.eq('generated_by', generatedBy)
		.order('created_at', { ascending: false })
		.limit(1);

	existingQuery = nullableFilter(existingQuery, 'company_id', companyId);
	existingQuery = nullableFilter(existingQuery, 'user_id', userId);

	const { data: existing, error: existingError } = await existingQuery.maybeSingle();

	if (existingError) throw existingError;

	if (existing?.id) {
		const { data, error } = await supabase
			.from('agent_widget_contracts')
			.update(payload)
			.eq('id', existing.id)
			.select('id, cycle_date, schema_version, status, generated_by, created_at, updated_at')
			.single();

		if (error) throw error;

		return {
			contract,
			row: data,
			mode: 'updated',
		};
	}

	const { data, error } = await supabase
		.from('agent_widget_contracts')
		.insert({
			...payload,
			created_at: new Date().toISOString(),
		})
		.select('id, cycle_date, schema_version, status, generated_by, created_at, updated_at')
		.single();

	if (error) throw error;

	return {
		contract,
		row: data,
		mode: 'inserted',
	};
}


export async function writeAgentWidgetContractPayload(
	supabase: SupabaseLike,
	contract: AgentWidgetContractV1,
	options: WriteAgentWidgetContractOptions = {},
): Promise<WriteAgentWidgetContractResult> {
	const cycleDate = options.cycleDate || new Date().toISOString().slice(0, 10);
	const companyId = options.companyId ?? null;
	const userId = options.userId ?? null;
	const generatedBy = options.generatedBy || 'agent-worker';

	const safeContract: AgentWidgetContractV1 = {
		...contract,
		schema_version: AGENT_WIDGET_CONTRACT_VERSION,
		status: contract.recovery_plans?.length ? 'ready' : 'idle',
		generated_at: contract.generated_at || new Date().toISOString(),
		summary: contract.summary || buildSummary(contract.recovery_plans || []),
		recovery_plans: Array.isArray(contract.recovery_plans) ? contract.recovery_plans : [],
	};

	const payload = {
		company_id: companyId,
		user_id: userId,
		cycle_date: cycleDate,
		schema_version: AGENT_WIDGET_CONTRACT_VERSION,
		status: safeContract.status,
		contract_json: safeContract,
		source_context_id: options.sourceContextId || null,
		generated_by: generatedBy,
		error_message: null,
		updated_at: new Date().toISOString(),
	};

	let existingQuery = supabase
		.from('agent_widget_contracts')
		.select('id')
		.eq('cycle_date', cycleDate)
		.eq('generated_by', generatedBy)
		.order('created_at', { ascending: false })
		.limit(1);

	existingQuery = nullableFilter(existingQuery, 'company_id', companyId);
	existingQuery = nullableFilter(existingQuery, 'user_id', userId);

	const { data: existing, error: existingError } = await existingQuery.maybeSingle();

	if (existingError) throw existingError;

	if (existing?.id) {
		const { data, error } = await supabase
			.from('agent_widget_contracts')
			.update(payload)
			.eq('id', existing.id)
			.select('id, cycle_date, schema_version, status, generated_by, created_at, updated_at')
			.single();

		if (error) throw error;

		return {
			contract: safeContract,
			row: data,
			mode: 'updated',
		};
	}

	const { data, error } = await supabase
		.from('agent_widget_contracts')
		.insert(payload)
		.select('id, cycle_date, schema_version, status, generated_by, created_at, updated_at')
		.single();

	if (error) throw error;

	return {
		contract: safeContract,
		row: data,
		mode: 'inserted',
	};
}

