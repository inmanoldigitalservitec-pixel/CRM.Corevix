## 17-worker-operating-context-refresh
```
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
```
