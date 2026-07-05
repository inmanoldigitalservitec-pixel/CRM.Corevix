#!/usr/bin/env bash
set -euo pipefail

INDEX_FILE="apps/agent-worker/src/index.ts"
CONTRACT_FILE="apps/agent-worker/src/agent-widget-contract.ts"

if [ ! -f "$INDEX_FILE" ]; then
  echo "❌ No encontré $INDEX_FILE"
  exit 1
fi

if [ ! -f "$CONTRACT_FILE" ]; then
  echo "❌ No encontré $CONTRACT_FILE"
  exit 1
fi

cp "$INDEX_FILE" "${INDEX_FILE}.bak-openclaw-widget-$(date +%Y%m%d%H%M%S)"
cp "$CONTRACT_FILE" "${CONTRACT_FILE}.bak-openclaw-widget-$(date +%Y%m%d%H%M%S)"

python3 - <<'PY'
from pathlib import Path

index_path = Path("apps/agent-worker/src/index.ts")
contract_path = Path("apps/agent-worker/src/agent-widget-contract.ts")

index = index_path.read_text()
contract = contract_path.read_text()

# 1) Export writer for a ready-made OpenClaw contract payload.
if "export async function writeAgentWidgetContractPayload" not in contract:
    insert = r'''

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
'''
    contract = contract.rstrip() + "\n" + insert + "\n"
    contract_path.write_text(contract)
    print("✅ Añadido writeAgentWidgetContractPayload()")
else:
    print("ℹ️ writeAgentWidgetContractPayload() ya existe")

# 2) Update import in index.ts
old_import = "import { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';"
new_import = "import { writeAgentWidgetContractFromDailyPlans, writeAgentWidgetContractPayload } from './agent-widget-contract';"

if old_import in index:
    index = index.replace(old_import, new_import)
elif "writeAgentWidgetContractPayload" not in index.split("\n", 20)[0:20]:
    print("⚠️ No encontré el import exacto. Revisa imports manualmente.")

# 3) Patch handleAgentOperatingContextRefresh to call OpenClaw after the normal refresh.
old_block = r'''async function handleAgentOperatingContextRefresh(request: Request, env: Env) {
	try {
		const body = await readJsonBody(request);
		const supabase = createSupabaseAdmin(env);
		const userContext = await getUserContext(request, supabase);

		const result = await refreshAgentOperatingContext(
			{
				supabase,
				companyId: userContext.companyId,
				userId: userContext.userId,
			},
			{
				cycleDate: typeof body?.cycle_date === 'string' && body.cycle_date.trim() ? body.cycle_date.trim() : undefined,
				expireMissing: typeof body?.expire_missing === 'boolean' ? body.expire_missing : true,
			},
		);

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
}'''

new_block = r'''async function handleAgentOperatingContextRefresh(request: Request, env: Env) {
	try {
		const body = await readJsonBody(request);
		const debugEnabled = Boolean(body?.debug);
		const supabase = createSupabaseAdmin(env);
		const userContext = await getUserContext(request, supabase);

		const result: any = await refreshAgentOperatingContext(
			{
				supabase,
				companyId: userContext.companyId,
				userId: userContext.userId,
			},
			{
				cycleDate: typeof body?.cycle_date === 'string' && body.cycle_date.trim() ? body.cycle_date.trim() : undefined,
				expireMissing: typeof body?.expire_missing === 'boolean' ? body.expire_missing : true,
			},
		);

		if (result?.ok && result?.data?.context) {
			try {
				const openclawContract = await askOpenClawForWidgetContract(env, result.data.context, debugEnabled);

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
}'''

if old_block not in index:
    print("❌ No encontré el bloque exacto handleAgentOperatingContextRefresh.")
    raise SystemExit(1)

index = index.replace(old_block, new_block)

# 4) Add OpenClaw widget contract helpers before askOpenClaw()
helper = r'''
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

'''

if "async function askOpenClawForWidgetContract" not in index:
    marker = "async function askOpenClaw("
    if marker not in index:
        print("❌ No encontré askOpenClaw() para insertar helper.")
        raise SystemExit(1)
    index = index.replace(marker, helper + "\n" + marker)
    print("✅ Añadido askOpenClawForWidgetContract()")
else:
    print("ℹ️ askOpenClawForWidgetContract() ya existe")

index_path.write_text(index)
print("✅ Patch completado")
PY

echo "✅ Listo. Ahora corre npm run build"
