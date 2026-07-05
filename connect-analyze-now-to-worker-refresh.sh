#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d%H%M%S)"

FILES=(
  "src/lib/agentClient.ts"
  "src/components/dashboard-v2/dashboard-v2.tsx"
)

echo "💾 Backups..."
for file in "${FILES[@]}"; do
  cp "$file" "${file}.bak-connect-analyze-worker-refresh-$STAMP"
  echo "  - ${file}.bak-connect-analyze-worker-refresh-$STAMP"
done

python3 <<'PY'
from pathlib import Path

# ============================================================
# 1) agentClient.ts - add refreshAgentOperatingContext()
# ============================================================

path = Path("src/lib/agentClient.ts")
text = path.read_text()

if "export type RefreshAgentOperatingContextOptions" not in text:
    insert_after = """export function extractAgentReply(data: unknown) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "No recibi respuesta del agente.";

  const payload = data as AgentChatResponse;
  const reply = payload.reply || payload.response || payload.message || payload.content;

  if (typeof reply === "string" && reply.trim()) return reply;

  return JSON.stringify(data, null, 2);
}
"""
    addition = insert_after + """

export type RefreshAgentOperatingContextOptions = {
  cycleDate?: string | null;
  expireMissing?: boolean;
  debug?: boolean;
};

export type RefreshAgentOperatingContextResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: {
    cycle_date?: string;
    widget_contract?: {
      mode?: string;
      summary?: unknown;
      status?: string;
      source?: string;
      row?: unknown;
    };
    openclaw_widget_contract?: unknown;
    openclaw_widget_contract_error?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export async function refreshAgentOperatingContext(
  options: RefreshAgentOperatingContextOptions = {},
): Promise<RefreshAgentOperatingContextResponse> {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAgentAccessToken();

  const response = await fetch(`${AGENT_URL}/agent/operating-context/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      cycle_date: options.cycleDate || null,
      expire_missing: options.expireMissing ?? true,
      debug: Boolean(options.debug),
    }),
  });

  const payload = (await response.json()) as RefreshAgentOperatingContextResponse;

  if (!response.ok || payload.ok === false) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Error ${response.status} refrescando el contexto del agente.`,
    );
  }

  return payload;
}
"""
    if insert_after not in text:
        raise SystemExit("❌ No encontré bloque extractAgentReply para insertar refreshAgentOperatingContext")
    text = text.replace(insert_after, addition)

path.write_text(text)

# ============================================================
# 2) dashboard-v2.tsx - import and call refresh before fetch
# ============================================================

path = Path("src/components/dashboard-v2/dashboard-v2.tsx")
text = path.read_text()

text = text.replace(
    """import { fetchAgentWidgetContract } from "@/lib/agentClient";""",
    """import { fetchAgentWidgetContract, refreshAgentOperatingContext } from "@/lib/agentClient";"""
)

old = """  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "idle",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } catch (error) {
      console.warn("[dashboard-v2] No se pudo cargar agent_widget_contracts", error);

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "error",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);"""

new = """  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      await refreshAgentOperatingContext({
        expireMissing: true,
        debug: true,
      });

      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "idle",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } catch (error) {
      console.warn("[dashboard-v2] No se pudo refrescar agent_widget_contracts", error);

      try {
        const widgetContractResult = await fetchAgentWidgetContract();

        if (widgetContractResult.payload) {
          setAgentPromptPayload(widgetContractResult.payload);
          return;
        }
      } catch (fallbackError) {
        console.warn("[dashboard-v2] Tampoco se pudo cargar el contrato existente", fallbackError);
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "error",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);"""

if old not in text:
    raise SystemExit("❌ No encontré refreshAgentPromptPayload exacto. Hay que revisar el bloque actual.")

text = text.replace(old, new)
path.write_text(text)
PY

echo ""
echo "============================================================"
echo "Verificación"
echo "============================================================"
grep -n -C 8 "refreshAgentOperatingContext\\|refreshAgentPromptPayload\\|operating-context/refresh" \
  src/lib/agentClient.ts \
  src/components/dashboard-v2/dashboard-v2.tsx

echo ""
echo "============================================================"
echo "Typecheck frontend"
echo "============================================================"
npx tsc --noEmit || true

echo ""
echo "✅ Analizar ahora conectado al worker refresh."
echo ""
echo "Reinicia frontend y worker:"
echo "Worker: cd apps/agent-worker && npx wrangler dev --config ./wrangler.jsonc --port 8787"
echo "Frontend: npm run dev"
