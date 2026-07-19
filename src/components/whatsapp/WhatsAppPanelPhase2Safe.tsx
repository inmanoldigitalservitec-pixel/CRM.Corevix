import { useEffect } from "react";
import { WhatsAppOperationalFilters } from "@/components/whatsapp/WhatsAppOperationalFilters";
import { WhatsAppQuickReplies } from "@/components/whatsapp/WhatsAppQuickReplies";

const LABELS: Record<string, string> = {
  "Crear lead": "Crear lead",
  "Crear cliente": "Crear cliente",
  "Crear propuesta": "Crear propuesta",
  "Crear factura": "Crear factura",
  "Preparar seguimiento": "Seguimiento",
  Tarea: "Crear tarea",
  Nota: "Agregar nota",
  "Preparar mensaje": "Preparar mensaje",
  "Abrir documento": "Abrir",
};

const CHANNEL_LABELS = ["Todos", "WhatsApp", "Messenger", "Instagram"];

function getGrid() {
  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
}

function getPanel() {
  const asides = Array.from(document.querySelectorAll<HTMLElement>("aside"));
  return (
    asides.find(
      (aside) =>
        aside.textContent?.includes("Envío rápido") || aside.querySelector('[title="Tarea"]'),
    ) || null
  );
}

function setAttr(element: HTMLElement, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function injectStyles() {
  if (document.getElementById("corevix-wa-phase2-safe")) return;
  const style = document.createElement("style");
  style.id = "corevix-wa-phase2-safe";
  style.textContent = `
    [data-corevix-wa-grid="true"] { min-width: 0; }
    [data-corevix-wa-grid="true"] > aside:first-child { display: none !important; }
    [data-corevix-wa-panel="true"] { overflow-x: hidden !important; scrollbar-width: thin; }
    [data-corevix-wa-panel="true"] section { border-radius: 0 !important; box-shadow: none !important; }
    [data-corevix-wa-main-button="true"], [data-corevix-wa-button="true"] { width: 100% !important; min-width: 0 !important; height: 36px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 7px !important; border-radius: 10px !important; padding: 0 10px !important; white-space: nowrap !important; box-shadow: none !important; }
    [data-corevix-wa-main-button="true"] { background: #2563eb !important; border: 1px solid #2563eb !important; color: #fff !important; }
    [data-corevix-wa-main-button="true"]:hover { background: #1d4ed8 !important; border-color: #1d4ed8 !important; }
    [data-corevix-wa-button="true"] { background: #fff !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; }
    [data-corevix-wa-button="true"]:hover { background: #f8fafc !important; color: #1d4ed8 !important; }
    [data-corevix-wa-label="true"] { pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 900; line-height: 1; }
    [data-corevix-wa-doc-actions="true"] { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 7px !important; width: 100% !important; }
    [data-corevix-wa-doc-card="true"] { border-color: #e2e8f0 !important; background: #fff !important; box-shadow: none !important; }
    [data-corevix-wa-doc-helper="true"] { margin-top: 7px; border-top: 1px solid #e2e8f0; padding: 7px 0 0; color: #64748b; font-size: 10.5px; font-weight: 700; line-height: 1.25; }
    [data-corevix-wa-empty-doc-helper="true"] { margin-top: 5px; color: #64748b; font-size: 10.5px; line-height: 1.3; }
    [data-corevix-wa-next="true"] { padding: 10px !important; border-radius: 0 !important; }
    [data-corevix-wa-next="true"] p { margin: 0 !important; }
    [data-corevix-wa-next="true"] [data-corevix-wa-main-button="true"] { height: 34px !important; }
    [data-corevix-wa-next="true"] .text-xs { font-size: 10.5px !important; line-height: 1.2 !important; }
    [data-corevix-wa-channel-row="true"] { display: flex !important; flex-wrap: nowrap !important; gap: 6px !important; overflow-x: auto !important; padding-bottom: 1px !important; scrollbar-width: none !important; }
    [data-corevix-wa-channel-row="true"]::-webkit-scrollbar { display: none !important; }
    [data-corevix-wa-channel-button="true"] { height: 31px !important; flex: 0 0 auto !important; padding: 0 10px !important; border-radius: 999px !important; font-size: 12px !important; line-height: 1 !important; }
    [data-whatsapp-task-slot], [data-whatsapp-quick-replies-slot], [data-whatsapp-operational-filters-slot] { display: block; margin-bottom: 8px; }
    @media (min-width: 1461px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(350px,390px) minmax(0,1fr) minmax(300px,320px) !important; } }
    @media (min-width: 1180px) and (max-width: 1460px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(330px,360px) minmax(0,1fr) 292px !important; } [data-corevix-wa-panel="true"] { display: block !important; } }
    @media (min-width: 981px) and (max-width: 1179px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(320px,350px) minmax(0,1fr) !important; } [data-corevix-wa-panel="true"] { display: none !important; } }
    @media (max-width: 980px) { [data-corevix-wa-grid="true"] { grid-template-columns: minmax(280px,360px) minmax(0,1fr) !important; } [data-corevix-wa-panel="true"] { display: none !important; } }
    @media (max-width: 760px) { [data-corevix-wa-grid="true"] { grid-template-columns: 1fr !important; } }
  `;
  document.head.appendChild(style);
}

function labelButton(button: HTMLElement, label: string, primary = false) {
  setAttr(button, "data-corevix-wa-button", primary ? "main" : "true");
  if (primary) setAttr(button, "data-corevix-wa-main-button", "true");
  button.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9");
  button.classList.add("flex", "items-center", "justify-center", "gap-2");
  let span = button.querySelector<HTMLElement>("[data-corevix-wa-label]");
  if (!span) {
    span = document.createElement("span");
    span.dataset.corevixWaLabel = "true";
    button.appendChild(span);
  }
  if (span.textContent !== label) span.textContent = label;
}

function findActivitySection(panel: HTMLElement) {
  return (
    Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => {
      const txt = section.textContent || "";
      return (
        txt.includes("Actividad") ||
        txt.includes("Último mensaje:") ||
        txt.includes("Última interacción:")
      );
    }) || null
  );
}

function findQuickSendSection(panel: HTMLElement) {
  return (
    Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) =>
      section.textContent?.includes("Envío rápido"),
    ) || null
  );
}

function findNextSection(panel: HTMLElement) {
  return (
    Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => {
      const txt = section.textContent || "";
      return (
        txt.includes("SIGUIENTE") ||
        txt.includes("Crear lead") ||
        txt.includes("Plantilla") ||
        txt.includes("Crear propuesta") ||
        txt.includes("Crear factura")
      );
    }) || null
  );
}

function enhanceLeftRail() {
  const grid = getGrid();
  if (!grid) return;
  const firstAside = grid.firstElementChild as HTMLElement | null;
  if (firstAside?.tagName.toLowerCase() === "aside") firstAside.style.display = "none";
}

function enhanceChannelFilters() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => CHANNEL_LABELS.includes((button.textContent || "").trim()),
  );
  if (!buttons.length) return;
  const row = buttons[0].parentElement;
  if (row) setAttr(row, "data-corevix-wa-channel-row", "true");
  buttons.forEach((button) => setAttr(button, "data-corevix-wa-channel-button", "true"));
}

function ensureTaskSlot(panel: HTMLElement) {
  const task = panel.querySelector<HTMLElement>('[title="Tarea"]');
  const internal = task?.closest("section") as HTMLElement | null;
  if (!internal) return;
  let slot = panel.querySelector<HTMLElement>("[data-whatsapp-task-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappTaskSlot = "true";
  }
  const activity = findActivitySection(panel);
  if (activity?.parentElement && slot.nextElementSibling !== activity)
    activity.parentElement.insertBefore(slot, activity);
  else if (!activity && internal.nextElementSibling !== slot)
    internal.insertAdjacentElement("afterend", slot);
}

function enhanceQuickSend(panel: HTMLElement) {
  const section = findQuickSendSection(panel);
  if (!section) return;
  const emptyDoc = Array.from(section.querySelectorAll<HTMLElement>("p")).find(
    (p) =>
      p.textContent?.includes("No hay docs listos") ||
      p.textContent?.includes("No hay documentos listos"),
  );
  if (emptyDoc) {
    if (emptyDoc.textContent !== "No hay documentos listos")
      emptyDoc.textContent = "No hay documentos listos";
    const wrapper = emptyDoc.closest("div") as HTMLElement | null;
    if (wrapper && !wrapper.querySelector("[data-corevix-wa-empty-doc-helper]")) {
      const helper = document.createElement("p");
      helper.dataset.corevixWaEmptyDocHelper = "true";
      helper.textContent =
        "Crea una propuesta o factura y vuelve aquí para prepararla en el chat sin salir del flujo.";
      emptyDoc.insertAdjacentElement("afterend", helper);
    }
  }
  const prepareButton = section.querySelector<HTMLElement>('[title="Preparar mensaje"]');
  const openButton = section.querySelector<HTMLElement>('[title="Abrir documento"]');
  if (prepareButton) labelButton(prepareButton, "Preparar mensaje", true);
  if (openButton) labelButton(openButton, "Abrir");
  const actions = prepareButton?.parentElement || openButton?.parentElement;
  if (actions) setAttr(actions, "data-corevix-wa-doc-actions", "true");
  const docCard =
    (prepareButton?.closest("[data-corevix-wa-doc-card]") as HTMLElement | null) ||
    ((prepareButton?.parentElement?.parentElement as HTMLElement | null) ?? null);
  if (docCard) {
    setAttr(docCard, "data-corevix-wa-doc-card", "true");
    if (!docCard.querySelector("[data-corevix-wa-doc-helper]")) {
      const helper = document.createElement("p");
      helper.dataset.corevixWaDocHelper = "true";
      helper.textContent =
        "Preparar mensaje coloca el texto en el input para revisarlo antes de enviarlo.";
      actions?.insertAdjacentElement("afterend", helper);
    }
  }
}

function enhanceNextAction(panel: HTMLElement) {
  const section = findNextSection(panel);
  if (!section) return;
  setAttr(section, "data-corevix-wa-next", "true");
  const main = section.querySelector<HTMLElement>(
    '[title="Crear lead"], [title="Crear cliente"], [title="Crear propuesta"], [title="Crear factura"], [title="Preparar seguimiento"], [title="Preparar"], [title="Ver"]',
  );
  if (main) {
    const label =
      LABELS[main.getAttribute("title") || ""] || main.getAttribute("title") || "Continuar";
    labelButton(main, label, true);
  }
}

function enhanceOnce() {
  injectStyles();
  const grid = getGrid();
  if (grid) setAttr(grid, "data-corevix-wa-grid", "true");
  enhanceLeftRail();
  enhanceChannelFilters();
  const panel = getPanel();
  if (!panel) return;
  setAttr(panel, "data-corevix-wa-panel", "true");
  if (panel.style.overflowX !== "hidden") panel.style.overflowX = "hidden";

  enhanceNextAction(panel);
  for (const [title, label] of Object.entries(LABELS)) {
    panel
      .querySelectorAll<HTMLElement>(`[title="${title}"]`)
      .forEach((button) => labelButton(button, label, title === "Preparar mensaje"));
  }
  const firstDoc = panel.querySelector<HTMLElement>(
    '[title="Crear propuesta"], [title="Crear factura"], [title="Preparar mensaje"]',
  );
  if (firstDoc?.parentElement)
    setAttr(firstDoc.parentElement, "data-corevix-wa-doc-actions", "true");
  enhanceQuickSend(panel);
  ensureTaskSlot(panel);
}

export function WhatsAppPanelPhase2Safe() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        enhanceOnce();
      });
    };
    run();
    const timers = [
      window.setTimeout(run, 250),
      window.setTimeout(run, 900),
      window.setTimeout(run, 1500),
    ];
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", run);
    document.addEventListener("click", run, true);
    return () => {
      timers.forEach(window.clearTimeout);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", run);
      document.removeEventListener("click", run, true);
    };
  }, []);
  return (
    <>
      <WhatsAppOperationalFilters />
      <WhatsAppQuickReplies />
    </>
  );
}
