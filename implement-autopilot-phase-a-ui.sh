#!/usr/bin/env bash
set -euo pipefail

ADAPTER="src/components/agent/agentPromptPayloadAdapter.ts"
WIDGET="src/components/agent/AgentCommandWidget.tsx"
TYPES="src/components/agent/agentWidgetContract.ts"

for file in "$ADAPTER" "$WIDGET" "$TYPES"; do
  if [ ! -f "$file" ]; then
    echo "❌ No encontré $file"
    exit 1
  fi
done

STAMP="$(date +%Y%m%d%H%M%S)"
cp "$ADAPTER" "${ADAPTER}.bak-phase-a-${STAMP}"
cp "$WIDGET" "${WIDGET}.bak-phase-a-${STAMP}"
cp "$TYPES" "${TYPES}.bak-phase-a-${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

adapter_path = Path("src/components/agent/agentPromptPayloadAdapter.ts")
widget_path = Path("src/components/agent/AgentCommandWidget.tsx")
types_path = Path("src/components/agent/agentWidgetContract.ts")

adapter = adapter_path.read_text()
widget = widget_path.read_text()
types = types_path.read_text()

# 1) Expand AgentWidgetContract type to accept plan_steps and actions if missing.
if "plan_steps?: AgentWidgetRecommendedStep[]" not in types:
    types = types.replace(
        "recommended_steps: AgentWidgetRecommendedStep[];",
        "recommended_steps: AgentWidgetRecommendedStep[];\n  plan_steps?: AgentWidgetRecommendedStep[];",
    )

if "actions?: AgentWidgetSuggestedAction[]" not in types and "export type AgentWidgetSuggestedAction" in types:
    types = types.replace(
        "suggested_actions: AgentWidgetSuggestedAction[];",
        "suggested_actions: AgentWidgetSuggestedAction[];\n  actions?: AgentWidgetSuggestedAction[];",
    )

types_path.write_text(types)

# 2) Fix normalizeWidgetContractRecoveryPlan to accept plan_steps OR recommended_steps.
old_func_match = re.search(
    r"function normalizeWidgetContractRecoveryPlan\(plan: AgentWidgetRecoveryPlan\): AgentRecoveryPlan \{[\s\S]*?\n\}",
    adapter,
)

if not old_func_match:
    raise SystemExit("❌ No encontré normalizeWidgetContractRecoveryPlan()")

old_func = old_func_match.group(0)

new_func = '''function normalizeWidgetContractRecoveryPlan(plan: AgentWidgetRecoveryPlan): AgentRecoveryPlan {
  const steps = plan.plan_steps || plan.recommended_steps || [];
  const actions = plan.suggested_actions || plan.actions || [];

  return {
    case_key: cleanText(plan.case_key, "unknown_case"),
    title: cleanText(plan.plan_title, "Plan de sanación"),
    severity: normalizeSeverity(plan.severity),
    message: cleanText(
      plan.message,
      "El agente preparó un plan de sanación para este caso.",
    ),
    diagnosis: cleanText(
      plan.diagnosis,
      "Este caso requiere revisión y una acción controlada.",
    ),
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
    suggested_actions: actions.map((action) => ({
      type: cleanText(action.type, "review_record"),
      label: cleanText(action.label, "Revisar caso"),
      requires_confirmation:
        typeof action.requires_confirmation === "boolean"
          ? action.requires_confirmation
          : true,
    })),
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

adapter = adapter.replace(old_func, new_func)
adapter_path.write_text(adapter)

# 3) Keep primary CTA fixed as "Resolver con Autopilot".
old_button = '{selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}'
if old_button in widget:
    widget = widget.replace(old_button, 'Resolver con Autopilot')
else:
    print("⚠️ No encontré el texto dinámico exacto del botón. Revisando variantes...")
    widget = re.sub(
        r"\{selectedPlan\.suggested_actions\[0\]\?\.label\s*\|\|\s*\"Resolver con Autopilot\"\}",
        "Resolver con Autopilot",
        widget,
    )

widget_path.write_text(widget)

print("✅ Fase A aplicada:")
print("- agentWidgetContract acepta plan_steps/actions.")
print("- Adapter conserva plan_steps de OpenClaw.")
print("- Botón principal queda fijo como Resolver con Autopilot.")
PY

echo ""
echo "✅ Backups creados con sufijo: .bak-phase-a-${STAMP}"
echo ""
echo "Verificación rápida:"
grep -R "const steps = plan.plan_steps || plan.recommended_steps" -n "$ADAPTER" || true
grep -R "Resolver con Autopilot" -n "$WIDGET" | head -5 || true
