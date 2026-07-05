## 15-worker-tool-execution-details-index
```
    {
      "case_key": "string",
      "case_type": "string",
      "plan_title": "string",
      "severity": "critical|high|medium|low",
      "message": "string",
      "diagnosis": "string",
      "plan_steps": [
        {
          "title": "string",
          "description": "string"
        }
      ],
      "actions": [
        {
          "type": "string",
          "label": "string",
          "reason": "string",
          "module": "string",
          "priority": "critical|high|medium|low",
          "requires_confirmation": true,
          "target": {
            "type": "string",
            "id": "string",
            "label": "string"
          },
          "payload": null
        }
      ],
      "requires_confirmation": true
    }
  ]
}

CONTEXTO DEL CRM:
${JSON.stringify(compactContext, null, 2)}
`;
}

function validateOpenClawWidgetContract(contract: any) {
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
		const actions = Array.isArray(plan?.actions) ? plan.actions : [];
		const planSteps = Array.isArray(plan?.plan_steps) ? plan.plan_steps : [];

		return {
			...plan,
			case_key: String(plan?.case_key || `case-${index + 1}`),
			case_type: String(plan?.case_type || 'detected_case'),
			plan_title: title,
			severity,
			message: String(plan?.message || plan?.diagnosis || 'Caso detectado por el CRM.'),
			diagnosis: String(plan?.diagnosis || plan?.message || 'El agente identificó una oportunidad de intervención.'),
			plan_steps: planSteps.slice(0, 5).map((step: any, stepIndex: number) => ({
				title: String(step?.title || `Paso ${stepIndex + 1}`),
				description: String(step?.description || 'Ejecutar este paso con validación del usuario.'),
			})),
			actions,
			requires_confirmation: plan?.requires_confirmation !== false,
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
}

async function askOpenClawForWidgetContract(env: Env, context: any, debugEnabled = false) {
	const input = buildWidgetContractPrompt(context);

	const promptStats = buildPromptStats('widget_contract', input, {
		prompt_route: 'agent_widget_contract',
		detected_cases: Array.isArray(context?.detected_cases) ? context.detected_cases.length : 0,
		plans: Array.isArray(context?.plans) ? context.plans.length : 0,
	});

	logPromptStats(promptStats, debugEnabled);

	const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
		},
		body: JSON.stringify({
			model: 'openclaw/default',
			input,
		}),
	});

	const data: any = await openclawResponse.json();
	promptStats.openclaw_usage = data?.usage ?? null;

	if (!openclawResponse.ok) {
		throw new Error(data?.error?.message ?? 'OpenClaw widget contract error');
	}

	const text = extractOpenClawText(data, '');
	const jsonText = extractJsonObjectFromText(text);
	const parsed = JSON.parse(jsonText);
	const contract = validateOpenClawWidgetContract(parsed);

	return {
		contract,
		debug: getOpenClawDebug(data),
		promptStats,
	};
}


async function askOpenClaw(
	env: Env,
	userMessage: string,
	history: ChatHistoryMessage[] = [],
	debugEnabled = false,
	requestedScope?: AgentToolScope | null,
) {
	const scopedTools = getToolsForScope(requestedScope);
	const route = scopedTools.length || isLikelyCrmAction(userMessage) ? 'crm_tools' : 'light_chat';
	const toolsForPrompt = route === 'crm_tools' ? (scopedTools.length ? scopedTools : [...AVAILABLE_TOOLS]) : [];

	const input =
		route === 'crm_tools'
			? buildSystemPrompt(userMessage, history, toolsForPrompt, requestedScope || null)
			: buildLightweightChatPrompt(userMessage, history);

	const promptStats = buildPromptStats('initial', input, {
		prompt_route: route,
		tool_scope_requested: requestedScope || null,
		tool_scope_selected: scopedTools.length ? requestedScope : null,
		user_message_chars: userMessage.length,
		user_message_estimated_tokens: estimateTokens(userMessage),
		history_items_received: history.length,
		history_items_used: route === 'crm_tools' ? countUsedHistoryItems(history) : countUsedLightweightHistoryItems(history),
		tools_available: toolsForPrompt.length,
		tools_in_prompt: toolsForPrompt,
	});

	logPromptStats(promptStats, debugEnabled);

	const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
		},
		body: JSON.stringify({
			model: 'openclaw/default',
			input,
		}),
	});

	const data: any = await openclawResponse.json();
	promptStats.openclaw_usage = data?.usage ?? null;

	if (!openclawResponse.ok) {
		throw new Error(data?.error?.message ?? 'OpenClaw error');
	}

	const text =
		data?.output?.[0]?.content?.find((item: any) => item.type === 'output_text')?.text ??
		data?.output_text ??
		'OpenClaw respondio, pero no pude extraer el texto.';

	return {
		text,
		debug: getOpenClawDebug(data),
		promptStats,
	};
}

async function askOpenClawFinalResponse(env: Env, userMessage: string, toolCall: any, toolResult: any, debugEnabled = false) {
	const input = buildFinalResponsePrompt(userMessage, toolCall, toolResult);
	const toolResultJson = JSON.stringify(toolResult);
	const promptStats = buildPromptStats('final', input, {
		tool: toolCall?.tool ?? null,
		user_message_chars: userMessage.length,
		user_message_estimated_tokens: estimateTokens(userMessage),
		tool_call_chars: JSON.stringify(toolCall).length,
		tool_result_chars: toolResultJson.length,
		tool_result_estimated_tokens: estimateTokens(toolResultJson),
	});

	logPromptStats(promptStats, debugEnabled);

	const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
		},
		body: JSON.stringify({
			model: 'openclaw/default',
			input,
		}),
	});

	const data: any = await openclawResponse.json();
	promptStats.openclaw_usage = data?.usage ?? null;

	if (!openclawResponse.ok) {
		return {
			text: toolResult.message ?? `No pude redactar la respuesta final: ${toolResult.error ?? 'error desconocido'}`,
			debug: getOpenClawDebug(data),
			promptStats,
		};
	}

	const text =
		data?.output?.[0]?.content?.find((item: any) => item.type === 'output_text')?.text ??
		data?.output_text ??
		toolResult.message ??
		'Accion ejecutada correctamente.';

	return {
		text,
		debug: getOpenClawDebug(data),
		promptStats,
	};
}

function estimateTokens(text: string) {
	return Math.ceil(text.length / 4);
}

function countUsedHistoryItems(history: ChatHistoryMessage[] = []) {
	return history.filter((item) => item?.content?.trim()).slice(-10).length;
}

function countUsedLightweightHistoryItems(history: ChatHistoryMessage[] = []) {
	return history.filter((item) => item?.content?.trim()).slice(-4).length;
}

function normalizeIntentText(value: string) {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
```
