import { useEffect } from "react";

type ActionKind = "navigate" | "prompt";
type IntentKey = "priorities" | "invoices" | "pipeline" | "messages" | "default";

type RealAction = {
  label: string;
  kind: ActionKind;
  value: string;
  primary?: boolean;
};

const actionsByIntent: Record<IntentKey, RealAction[]> = {
  priorities: [
    { label: "Revisar prioridades", kind: "prompt", value: "Dame mis prioridades reales de hoy del CRM", primary: true },
    { label: "Ver tareas", kind: "navigate", value: "/tasks" },
    { label: "Ver leads", kind: "navigate", value: "/leads" },
  ],
  invoices: [
    { label: "Listar pendientes", kind: "prompt", value: "Muestrame las facturas pendientes no pagadas", primary: true },
    { label: "Ver facturas", kind: "navigate", value: "/invoices" },
    { label: "Priorizar cobros", kind: "prompt", value: "Prioriza mis cobros pendientes y dime cual debo atender primero" },
  ],
  pipeline: [
    { label: "Listar oportunidades", kind: "prompt", value: "Muestrame las oportunidades abiertas y cual debo priorizar", primary: true },
    { label: "Ver pipeline", kind: "navigate", value: "/pipeline" },
    { label: "Ver propuestas", kind: "navigate", value: "/proposals" },
  ],
  messages: [
    { label: "Priorizar mensajes", kind: "prompt", value: "Que mensajes tengo pendientes y cual debo responder primero", primary: true },
    { label: "Abrir WhatsApp", kind: "navigate", value: "/whatsapp" },
    { label: "Abrir Email", kind: "navigate", value: "/email" },
  ],
  default: [
    { label: "Resumen del CRM", kind: "prompt", value: "Dame un resumen del CRM de hoy", primary: true },
    { label: "Ver dashboard", kind: "navigate", value: "/dashboard" },
    { label: "Ver tareas", kind: "navigate", value: "/tasks" },
  ],
};

function getIntent(dashboard: HTMLElement): IntentKey {
  const previewIntent = dashboard.getAttribute("data-preview-intent") as IntentKey | null;
  if (previewIntent && previewIntent in actionsByIntent) return previewIntent;

  const highlightedContext = dashboard.querySelector<HTMLElement>(".left-context .context-card.is-highlighted");
  const context = highlightedContext?.dataset.context;

  if (context === "invoices") return "invoices";
  if (context === "pipeline") return "pipeline";
  if (context === "messages") return "messages";
  if (context === "priorities") return "priorities";

  return "default";
}

function getWritableInput(dashboard: HTMLElement) {
  const chatInput = dashboard.querySelector<HTMLInputElement>(".chat-input-dock .agent-input input");
  if (chatInput && chatInput.offsetParent !== null) return chatInput;

  const heroInput = dashboard.querySelector<HTMLInputElement>(".welcome .agent-input input");
  if (heroInput) return heroInput;

  return dashboard.querySelector<HTMLInputElement>(".agent-input input");
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function sendPrompt(dashboard: HTMLElement, prompt: string) {
  const input = getWritableInput(dashboard);
  if (!input) return;

  setNativeValue(input, prompt);
  input.focus();

  const form = input.closest("form");
  if (form) {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return;
  }

  const sendButton = dashboard.querySelector<HTMLButtonElement>(".send-btn");
  sendButton?.click();
}

function navigateTo(path: string) {
  window.location.assign(path);
}

function renderActions(dashboard: HTMLElement) {
  const panel = dashboard.querySelector<HTMLElement>('[data-context="actions"] .panel-actions');
  if (!panel) return;

  const intent = getIntent(dashboard);
  const signature = `${intent}:${actionsByIntent[intent].map((action) => action.label).join("|")}`;

  if (panel.dataset.realActionsSignature === signature) return;

  panel.dataset.realActionsSignature = signature;
  panel.replaceChildren();

  for (const action of actionsByIntent[intent]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.primary ? "action-btn real-action-btn" : "ghost-btn real-action-btn";
    button.textContent = action.label;
    button.dataset.actionKind = action.kind;
    button.dataset.actionValue = action.value;
    button.addEventListener("click", () => {
      if (action.kind === "navigate") {
        navigateTo(action.value);
        return;
      }

      sendPrompt(dashboard, action.value);
    });

    panel.appendChild(button);
  }
}

export function AgentDashboardRealActionsController() {
  useEffect(() => {
    const dashboard = document.querySelector<HTMLElement>(".agentic-dashboard");
    if (!dashboard) return;

    const render = () => renderActions(dashboard);
    const observer = new MutationObserver(render);

    observer.observe(dashboard, {
      attributes: true,
      attributeFilter: ["data-preview-intent"],
      childList: true,
      subtree: true,
    });

    render();

    return () => observer.disconnect();
  }, []);

  return null;
}
