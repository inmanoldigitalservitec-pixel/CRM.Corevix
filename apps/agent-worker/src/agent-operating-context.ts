import type { ToolContext } from './types';
import { listTodayAgentPlans, syncDailyAgentPlans } from './agent-daily-plans';
import { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';

type AgentOperatingContextOptions = {
	cycleDate?: string;
	now?: Date;
	forceRefresh?: boolean;
	expireMissing?: boolean;
};

type StoredAgentOperatingContextRow = {
	id?: string;
	company_id: string;
	user_id: string;
	cycle_date: string;
	context_version: string;
	context_json: Record<string, unknown>;
	source_fingerprint: string;
	generated_at: string;
	created_at?: string;
	updated_at?: string;
};

function localDateKey(date: Date) {
	const yyyy = String(date.getFullYear());
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function stableHash(input: string, seed: number) {
	let hash = seed >>> 0;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function stableFingerprint(input: string) {
	const part1 = stableHash(input, 0x811c9dc5).toString(16).padStart(8, '0');
	const part2 = stableHash(input, 0x01000193).toString(16).padStart(8, '0');
	const part3 = stableHash(input, 0x9e3779b9).toString(16).padStart(8, '0');
	return `${part1}${part2}${part3}`;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function contextVersion() {
	return 'agent_operating_context_v1';
}

async function loadStoredAgentOperatingContext(
	ctx: ToolContext,
	cycleDate: string,
): Promise<{ data: StoredAgentOperatingContextRow | null; error: string | null }> {
	const { data, error } = await ctx.supabase
		.from('agent_operating_context')
		.select('*')
		.eq('company_id', ctx.companyId)
		.eq('user_id', ctx.userId)
		.eq('cycle_date', cycleDate)
		.maybeSingle();

	return {
		data: (data as StoredAgentOperatingContextRow | null) || null,
		error: error?.message || null,
	};
}

async function loadAttentionMemoryEntries(ctx: ToolContext) {
	const { data, error } = await ctx.supabase
		.from('attention_memory')
		.select(
			'key,state,first_seen_at,last_seen_at,notified_at,acknowledged_at,ignored_at,snoozed_until,resolved_at,auto_resolved_at,last_title,last_summary',
		)
		.eq('company_id', ctx.companyId)
		.eq('user_id', ctx.userId)
		.order('last_seen_at', { ascending: false })
		.limit(100);

	return {
		data: (data || []).map((entry: any) => ({
			key: entry.key,
			state: entry.state,
			first_seen_at: entry.first_seen_at,
			last_seen_at: entry.last_seen_at,
			notified_at: entry.notified_at,
			acknowledged_at: entry.acknowledged_at,
			ignored_at: entry.ignored_at,
			snoozed_until: entry.snoozed_until,
			resolved_at: entry.resolved_at,
			auto_resolved_at: entry.auto_resolved_at,
			last_title: entry.last_title,
			last_summary: entry.last_summary,
		})),
		error: error?.message || null,
	};
}

async function loadNotificationDrafts(ctx: ToolContext) {
	const { data, error } = await ctx.supabase
		.from('notifications')
		.select('id,title,message,type,link,read,created_at')
		.eq('company_id', ctx.companyId)
		.eq('user_id', ctx.userId)
		.like('type', 'attention:%')
		.order('created_at', { ascending: false })
		.limit(20);

	return {
		data: (data || []).map((entry: any) => ({
			id: entry.id,
			title: entry.title,
			message: entry.message,
			type: entry.type,
			link: entry.link,
			read: entry.read,
			created_at: entry.created_at,
		})),
		error: error?.message || null,
	};
}


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

function timelineGroupsFromPlans(plans: any[]) {
	const groups = [
		{ bucket: 'overdue', label: 'Atrasado', items: [] as string[] },
		{ bucket: 'today', label: 'Hoy', items: [] as string[] },
		{ bucket: 'upcoming', label: 'Próximo', items: [] as string[] },
		{ bucket: 'recent', label: 'Actividad reciente', items: [] as string[] },
		{ bucket: 'open', label: 'Abierto', items: [] as string[] },
	];

	for (const plan of plans) {
		const bucket = String(plan?.metadata?.bucket || '');
		const group = groups.find((entry) => entry.bucket === bucket);
		if (!group) continue;
		group.items.push(String(plan?.detected_case?.item?.id || plan?.case_key || ''));
	}

	return groups;
}

function recentChangesFromPlans(plans: any[]) {
	return plans
		.filter((plan) => {
			const bucket = String(plan?.metadata?.bucket || '');
			return bucket === 'recent' || bucket === 'open';
		})
		.slice(0, 6)
		.map((plan) => ({
			id: plan?.detected_case?.item?.id || plan.case_key,
			memory_key: (plan?.source_memory_keys || [])[0] || null,
			rule_id: null,
			module: plan?.source_modules?.[0] || null,
			title: plan.case_title,
			summary: plan.case_summary || plan.plan_summary,
			severity: plan.case_severity,
			score: Number(plan?.metadata?.score || 0),
			bucket: plan?.metadata?.bucket || 'open',
			kind: plan?.metadata?.kind || 'activity',
			due_at: plan?.detected_case?.item?.dueAt || null,
			href: plan?.detected_case?.item?.href || null,
			source: {
				type: plan?.detected_case?.item?.sourceType || null,
				id: plan?.detected_case?.item?.sourceId || null,
				label: plan?.detected_case?.item?.sourceLabel || null,
				status: null,
			},
			context: {
				client: plan?.detected_case?.item?.client ? { label: plan.detected_case.item.client } : null,
				lead: plan?.detected_case?.item?.lead ? { label: plan.detected_case.item.lead } : null,
				project: plan?.detected_case?.item?.project ? { label: plan.detected_case.item.project } : null,
				amount: plan?.detected_case?.item?.amount ? { label: plan.detected_case.item.amount } : null,
				urgency_reason: plan?.generated_plan?.rationale || null,
				recommendation: plan?.detected_case?.item?.recommendation || null,
			},
			actions: plan.generated_plan?.actions || plan.suggested_actions || [],
			attention_state: plan.state,
		}));
}

function buildAgentOperatingContextPayload(args: {
	ctx: ToolContext;
	cycleDate: string;
	now: Date;
	snapshot: Record<string, any>;
	plans: any[];
	notifications: any[];
	memoryEntries: any[];
}) {
	const { ctx, cycleDate, now, snapshot, plans, notifications, memoryEntries } = args;
	const detectedCases = compactDetectedCasesFromPlans(plans);
	const compactPlans = compactPlansForCompatibility(plans);
	const agentBriefCounts = agentBriefSummaryFromCases(detectedCases);
	const topPriorities = asArray<Record<string, unknown>>(snapshot.topPriorities);
	const risks = asArray<Record<string, unknown>>(snapshot.risks);
	const upcomingCommitments = asArray<Record<string, unknown>>(snapshot.upcomingCommitments);
	const staleOpportunities = asArray<Record<string, unknown>>(snapshot.staleOpportunities);
	const actionQueue = asArray<Record<string, unknown>>(snapshot.actionQueue);
	const moduleSummaries = asArray<Record<string, unknown>>(snapshot.moduleSummaries);
	const guidance = asArray<string>(snapshot.guidance);

	return {
		schema_version: contextVersion(),
		generated_at: now.toISOString(),
		cycle: {
			date: cycleDate,
			period: snapshot.period || 'daily',
			timezone: 'America/Santo_Domingo',
			company_id: ctx.companyId,
			user_id: ctx.userId,
		},
		agent_state: {
			mode: 'daily_briefing',
			trigger: 'attention_context_refresh',
			source: 'crm_attention_system',
			should_prepare_plans: plans.length > 0,
			should_execute_without_confirmation: false,
		},
		summary: {
			headline: snapshot.headline || 'No hay eventos de atención activos.',
			counts: snapshot.counts || {
				total: 0,
				critical: 0,
				high: 0,
				medium: 0,
				low: 0,
				overdue: 0,
				dueToday: 0,
				upcoming: 0,
				recent: 0,
				open: 0,
			},
			guidance,
		},
		top_priorities: topPriorities,
		risks,
		upcoming_commitments: upcomingCommitments,
		recent_changes: recentChangesFromPlans(plans),
		stale_opportunities: staleOpportunities,
		timeline: {
			groups: timelineGroupsFromPlans(plans),
		},
		module_summaries: moduleSummaries,
		action_queue: actionQueue,
		notifications: {
			drafts: notifications,
		},
		detected_cases: detectedCases,
		agent_brief: {
			version: AGENT_BRIEF_VERSION,
			mission: 'Evaluar casos detectados y preparar planes de sanación cuando el agente esté instalado.',
			counts: agentBriefCounts,
			rules: {
				system_should_generate_plans: false,
				agent_should_generate_plans: true,
				execute_without_confirmation: false,
			},
			input_contract: {
				read_from: 'detected_cases',
				write_to: 'recovery_plans',
				full_details_table: 'agent_daily_plans',
			},
		},
		agent_workspace: {
			status: 'reserved_for_future_agent',
			agent_enabled: false,
			expected_output: 'recovery_plans',
			notes: 'El CRM detecta casos. El agente futuro debe crear planes de sanación usando detected_cases.',
		},
		recovery_plans: [],
		rules: {
			system_should_generate_plans: false,
			agent_should_generate_plans: true,
			execute_without_confirmation: false,
		},
		plans: compactPlans,
		memory: {
			entries: memoryEntries,
		},
		agent_instructions: {
			mission: 'Analiza este contexto operativo del CRM y prepara planes accionables, claros y priorizados para mostrar al usuario.',
			hard_rules: [
				'No ejecutes acciones sin confirmación explícita del usuario.',
				'No inventes datos que no estén en este contexto.',
				'Prioriza riesgos críticos, eventos atrasados y compromisos de hoy antes de optimizaciones menores.',
				'Si propones acciones, usa primero las acciones sugeridas ya incluidas en este contexto.',
			],
			expected_output: {
				format: 'daily_agent_briefing',
				include: [
					'caso principal',
					'por qué importa',
					'plan paso a paso',
					'acciones sugeridas',
					'riesgos de no actuar',
					'qué puede aprobar el usuario',
				],
			},
		},
	};
}

export async function refreshAgentOperatingContext(ctx: ToolContext, options: AgentOperatingContextOptions = {}) {
	const now = options.now || new Date();
	const cycleDate = options.cycleDate || localDateKey(now);
	const syncResult = await syncDailyAgentPlans(ctx, {
		cycleDate,
		now,
		expireMissing: options.expireMissing,
	});

	if (!syncResult.ok) {
		return {
			ok: false,
			error: syncResult.error || 'No se pudo sincronizar agent_daily_plans.',
		};
	}

	const plans = syncResult.data?.plans || [];
	const snapshot = (syncResult.data?.snapshot || {}) as Record<string, any>;
	const [notificationsResult, memoryResult] = await Promise.all([loadNotificationDrafts(ctx), loadAttentionMemoryEntries(ctx)]);

	const contextJson = buildAgentOperatingContextPayload({
		ctx,
		cycleDate,
		now,
		snapshot,
		plans,
		notifications: notificationsResult.data,
		memoryEntries: memoryResult.data,
	});

	const sourceFingerprint = stableFingerprint(
		JSON.stringify({
			cycleDate,
			counts: snapshot.counts || {},
			plans: plans.map((plan: any) => ({
				case_key: plan.case_key,
				case_severity: plan.case_severity,
				state: plan.state,
				origin_fingerprint: plan.origin_fingerprint,
			})),
			notifications: notificationsResult.data.map((item: any) => ({
				id: item.id,
				read: item.read,
			})),
			memory: memoryResult.data.map((item: any) => ({
				key: item.key,
				state: item.state,
				last_seen_at: item.last_seen_at,
			})),
		}),
	);

	const row = {
		company_id: ctx.companyId,
		user_id: ctx.userId,
		cycle_date: cycleDate,
		context_version: contextVersion(),
		context_json: contextJson,
		source_fingerprint: sourceFingerprint,
		generated_at: now.toISOString(),
	};

	const { data, error } = await ctx.supabase
		.from('agent_operating_context')
		.upsert(row, { onConflict: 'company_id,user_id,cycle_date' })
		.select('*')
		.single();

	if (error) {
		return {
			ok: false,
			error: error.message,
		};
	}

	let widgetContractResult: Awaited<ReturnType<typeof writeAgentWidgetContractFromDailyPlans>> | null = null;

	try {
		widgetContractResult = await writeAgentWidgetContractFromDailyPlans(ctx.supabase, plans, {
			companyId: ctx.companyId,
			userId: ctx.userId,
			cycleDate,
			generatedBy: 'agent-worker',
			sourceContextId: data?.id || null,
		});
	} catch (widgetContractError) {
		return {
			ok: false,
			error:
				widgetContractError instanceof Error
					? widgetContractError.message
					: 'No se pudo escribir agent_widget_contracts.',
		};
	}

	return {
		ok: true,
		message: 'Contexto operativo del agente actualizado.',
		data: {
			cycle_date: cycleDate,
			context: contextJson,
			row: data,
			widget_contract: {
				mode: widgetContractResult.mode,
				row: widgetContractResult.row,
				summary: widgetContractResult.contract.summary,
				status: widgetContractResult.contract.status,
			},
		},
	};
}

export async function getTodayAgentOperatingContext(ctx: ToolContext, options: AgentOperatingContextOptions = {}) {
	const cycleDate = options.cycleDate || localDateKey(options.now || new Date());
	const existing = await loadStoredAgentOperatingContext(ctx, cycleDate);
	if (existing.error) {
		return { ok: false, error: existing.error };
	}

	if (!existing.data || options.forceRefresh) {
		return refreshAgentOperatingContext(ctx, options);
	}

	if (options.forceRefresh) {
		return refreshAgentOperatingContext(ctx, options);
	}

	return {
		ok: true,
		message: `Contexto operativo encontrado para ${cycleDate}.`,
		data: {
			cycle_date: cycleDate,
			context: existing.data.context_json,
			row: existing.data,
		},
	};
}

export async function getAgentPlansAndContextPreview(ctx: ToolContext, cycleDate?: string) {
	const targetDate = cycleDate || localDateKey(new Date());
	const [plansResult, contextResult] = await Promise.all([
		listTodayAgentPlans(ctx, targetDate),
		loadStoredAgentOperatingContext(ctx, targetDate),
	]);

	return {
		ok: plansResult.ok && !contextResult.error,
		data: {
			cycle_date: targetDate,
			plans: plansResult.data?.plans || [],
			context: contextResult.data?.context_json || null,
		},
		error: plansResult.ok ? contextResult.error : plansResult.error,
	};
}
