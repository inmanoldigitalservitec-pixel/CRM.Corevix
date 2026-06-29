import { useEffect } from "react";

type IntentKey = "priorities" | "invoices" | "pipeline" | "messages" | "default";

function detectIntentFromText(text: string): IntentKey {
  const clean = text.trim().toLowerCase();
  if (!clean) return "default";

  if (
    clean.includes("factura") ||
    clean.includes("cobrar") ||
    clean.includes("cobro") ||
    clean.includes("vencida") ||
    clean.includes("pago") ||
    clean.includes("por cobrar") ||
    clean.includes("invoice")
  ) {
    return "invoices";
  }

  if (
    clean.includes("oportunidad") ||
    clean.includes("pipeline") ||
    clean.includes("deal") ||
    clean.includes("propuesta") ||
    clean.includes("cerrar") ||
    clean.includes("venta") ||
    clean.includes("lead") ||
    clean.includes("prospecto") ||
    clean.includes("cliente")
  ) {
    return "pipeline";
  }

  if (
    clean.includes("mensaje") ||
    clean.includes("whatsapp") ||
    clean.includes("correo") ||
    clean.includes("email") ||
    clean.includes("bandeja") ||
    clean.includes("responder")
  ) {
    return "messages";
  }

  if (
    clean.includes("tarea") ||
    clean.includes("pendiente") ||
    clean.includes("prioridad") ||
    clean.includes("hoy") ||
    clean.includes("agenda") ||
    clean.includes("seguimiento")
  ) {
    return "priorities";
  }

  return "default";
}

function getActivePrompt(dashboard: HTMLElement) {
  const focusedInput = dashboard.querySelector<HTMLInputElement>(".agent-input input:focus");
  if (focusedInput) return focusedInput.value;

  const inputs = Array.from(dashboard.querySelectorAll<HTMLInputElement>(".agent-input input"));
  const filledInput = inputs.find((input) => input.value.trim());
  return filledInput?.value || "";
}

function applyIntent(dashboard: HTMLElement) {
  const prompt = getActivePrompt(dashboard);
  const intent = detectIntentFromText(prompt);

  if (!prompt.trim() || intent === "default") {
    dashboard.removeAttribute("data-preview-intent");
    return;
  }

  dashboard.setAttribute("data-preview-intent", intent);
}

export function AgentDashboardContextController() {
  useEffect(() => {
    const dashboard = document.querySelector<HTMLElement>(".agentic-dashboard");
    if (!dashboard) return;

    const handleInput = () => applyIntent(dashboard);
    const handleFocus = () => applyIntent(dashboard);
    const handleBlur = () => window.setTimeout(() => applyIntent(dashboard), 0);

    dashboard.addEventListener("input", handleInput, true);
    dashboard.addEventListener("focusin", handleFocus, true);
    dashboard.addEventListener("focusout", handleBlur, true);
    applyIntent(dashboard);

    return () => {
      dashboard.removeEventListener("input", handleInput, true);
      dashboard.removeEventListener("focusin", handleFocus, true);
      dashboard.removeEventListener("focusout", handleBlur, true);
      dashboard.removeAttribute("data-preview-intent");
    };
  }, []);

  return null;
}
