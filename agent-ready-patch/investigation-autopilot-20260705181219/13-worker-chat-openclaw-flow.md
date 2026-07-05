## 13-worker-chat-openclaw-flow
```

				const written = await writeAgentWidgetContractPayload(supabase, openclawContract.contract, {
					companyId: userContext.companyId,
					userId: userContext.userId,
					cycleDate: result.data.cycle_date,
					generatedBy: 'agent-worker',
					sourceContextId: result.data.row?.id || null,
				});

				result.data.widget_contract = {
					mode: written.mode,
					row: written.row,
					summary: written.contract.summary,
					status: written.contract.status,
					source: 'openclaw',
				};

				if (debugEnabled) {
					result.data.openclaw_widget_contract = {
						prompt_stats: openclawContract.promptStats,
						debug: openclawContract.debug,
					};
				}
			} catch (openclawError: any) {
				result.data.openclaw_widget_contract_error = {
					message: openclawError?.message ?? 'OpenClaw widget contract error',
					fallback: 'agent_daily_plans',
				};
			}
		}

		return json(result, result.ok ? 200 : 400);
	} catch (error: any) {
		return json(
			{
				ok: false,
				error: 'agent_operating_context_refresh_error',
				message: error?.message ?? 'Unknown error',
			},
			500,
		);
	}
}

async function handleTodayAgentOperatingContext(request: Request, env: Env) {
	try {
		const supabase = createSupabaseAdmin(env);
		const userContext = await getUserContext(request, supabase);
		const url = new URL(request.url);
		const cycleDate = url.searchParams.get('cycle_date')?.trim() || undefined;
		const forceRefresh = url.searchParams.get('force_refresh') === 'true';

		const result = await getTodayAgentOperatingContext(
			{
				supabase,
				companyId: userContext.companyId,
				userId: userContext.userId,
			},
			{
				cycleDate,
				forceRefresh,
			},
		);

		return json(result, result.ok ? 200 : 400);
	} catch (error: any) {
		return json(
			{
				ok: false,
				error: 'agent_operating_context_load_error',
				message: error?.message ?? 'Unknown error',
			},
			500,
		);
	}
}

async function handleAgentChat(request: Request, env: Env) {
	try {
		const body = (await request.json()) as ChatBody;
		const debugEnabled = Boolean(body.debug);

		if (!body.message?.trim()) {
			return json({ error: 'Missing message' }, 400);
		}

		const supabase = createSupabaseAdmin(env);
		const userContext = await getUserContext(request, supabase);

		const openclaw = await askOpenClaw(env, body.message, body.history, debugEnabled, body.tool_scope);
		const toolCall = parseToolCall(openclaw.text);

		if (!toolCall) {
			return json({
				reply: openclaw.text,
				mode: 'chat',
				openclaw: openclaw.debug,
				...(debugEnabled ? { agent_debug: { initial: openclaw.promptStats } } : {}),
			});
		}

		const toolResult = await executeTool(toolCall, {
			supabase,
			companyId: userContext.companyId,
			userId: userContext.userId,
		});

		if (!toolResult.ok) {
			const final = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult, debugEnabled);

			return json({
				reply: final.text,
				mode: 'tool',
				tool: toolCall.tool,
				tool_result: toolResult,
				openclaw: {
					initial: openclaw.debug,
					final: final.debug,
				},
				...(debugEnabled ? { agent_debug: { initial: openclaw.promptStats, final: final.promptStats } } : {}),
			});
		}

		const final = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult, debugEnabled);

		return json({
			reply: final.text,
			mode: 'tool',
			tool: toolCall.tool,
			tool_result: toolResult,
			openclaw: {
				initial: openclaw.debug,
				final: final.debug,
			},
			...(debugEnabled ? { agent_debug: { initial: openclaw.promptStats, final: final.promptStats } } : {}),
		});
	} catch (error: any) {
		return json(
			{
				error: 'Agent worker error',
				message: error?.message ?? 'Unknown error',
			},
			500,
		);
	}
}


function extractOpenClawText(data: any, fallback = '') {
	return (
		data?.output?.[0]?.content?.find((item: any) => item.type === 'output_text')?.text ??
		data?.output_text ??
		fallback
	);
}

function extractJsonObjectFromText(text: string) {
	const trimmed = text.trim();

	if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
		return trimmed;
	}

	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced?.[1]) {
		const fencedBody = fenced[1].trim();
		if (fencedBody.startsWith('{') && fencedBody.endsWith('}')) {
			return fencedBody;
		}
	}

	const first = trimmed.indexOf('{');
	const last = trimmed.lastIndexOf('}');

	if (first >= 0 && last > first) {
		return trimmed.slice(first, last + 1);
	}

	throw new Error('OpenClaw no devolvió un JSON válido para el widget.');
}

function compactAgentContextForWidget(context: any) {
	const detectedCases = Array.isArray(context?.detected_cases) ? context.detected_cases : [];
	const plans = Array.isArray(context?.plans) ? context.plans : [];

	return {
		schema_version: context?.schema_version,
		generated_at: context?.generated_at,
		cycle: context?.cycle,
		summary: context?.summary,
		agent_brief: context?.agent_brief,
		rules: context?.rules,
		detected_cases: detectedCases.slice(0, 12),
		plans: plans.slice(0, 12),
	};
}

function buildWidgetContractPrompt(context: any) {
	const compactContext = compactAgentContextForWidget(context);

	return `Eres Corevix Autopilot, un agente operativo de CRM.

Tu tarea es convertir casos detectados del CRM en planes concretos de recuperación para el widget principal.

INSTRUCCIONES CRÍTICAS:
- Devuelve SOLO JSON válido.
- No uses markdown.
- No expliques nada fuera del JSON.
- schema_version debe ser exactamente "agent_widget_contract_v1".
- status debe ser "ready" si hay recovery_plans, o "idle" si no hay casos.
- NO uses frases placeholder como "Reserved for future agent", "agente futuro" ni "no generó un plan automático".
- Cada plan debe sonar como una decisión real del agente.
- Cada plan debe ser específico al caso: factura, lead, tarea, propuesta, inbox o calendario.
- No inventes datos fuera del contexto.
- No ejecutes acciones sensibles; solo propón el plan.
- Si una acción requiere confirmación humana, marca requires_confirmation como true.

FORMA EXACTA DEL JSON:
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
```
