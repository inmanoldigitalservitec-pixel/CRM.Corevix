import { useEffect } from "react";

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

function getGrid() {
  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
}

function getPanel() {
  const asides = Array.from(document.querySelectorAll<HTMLElement>("aside"));
  return asides.find((aside) => aside.textContent?.includes("Envío rápido") || aside.querySelector('[title="Tarea"]')) || null;
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
    [data-corevix-wa-panel="true"] { overflow-x: hidden !important; scrollbar-width: thin; }
    [data-corevix-wa-panel="true"] section { border-radius: 22px !important; box-shadow: 0 10px 24px rgba(18,35,29,.065) !important; }
    [data-corevix-wa-main-button="true"], [data-corevix-wa-button="true"] { width: 100% !important; min-width: 0 !important; height: 42px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; border-radius: 16px !important; padding: 0 12px !important; white-space: nowrap !important; }
    [data-corevix-wa-main-button="true"] { background: #00a884 !important; border: 1px solid #00a884 !important; color: #fff !important; box-shadow: 0 10px 20px rgba(0,168,132,.18) !important; }
    [data-corevix-wa-button="true"] { background: #f7fbf9 !important; border: 1px solid #dce8e2 !important; color: #52645d !important; box-shadow: 0 6px 14px rgba(18,35,29,.045) !important; }
    [data-corevix-wa-label="true"] { pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 900; line-height: 1; }
    [data-corevix-wa-doc-actions="true"] { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 8px !important; width: 100% !important; }
    [data-corevix-wa-doc-card="true"] { border-color: #bcebd0 !important; background: linear-gradient(180deg,#f0fff6,#ffffff) !important; }
    [data-corevix-wa-doc-helper="true"] { margin-top: 8px; border-radius: 14px; background: #e9fff1; padding: 8px 10px; color: #52645d; font-size: 11px; font-weight: 700; line-height: 1.35; }
    [data-corevix-wa-empty-doc-helper="true"] { margin-top: 6px; color: #6c7f77; font-size: 11px; line-height: 1.35; }
    [data-whatsapp-task-slot] { display: block; margin-bottom: 8px; }
    @media (min-width: 1461px) { [data-corevix-wa-grid="true"] { grid-template-columns: 72px minmax(340px,390px) minmax(0,1fr) minmax(320px,340px) !important; } }
    @media (min-width: 1180px) and (max-width: 1460px) { [data-corevix-wa-grid="true"] { grid-template-columns: 66px minmax(330px,360px) minmax(0,1fr) 300px !important; } [data-corevix-wa-panel="true"] { display: block !important; } }
    @media (max-width: 1179px) { [data-corevix-wa-panel="true"] { display: none !important; } }
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
  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => {
    const txt = section.textContent || "";
    return txt.includes("Actividad") || txt.includes("Último mensaje:") || txt.includes("Última interacción:");
  }) || null;
}

function findQuickSendSection(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) => section.textContent?.includes("Envío rápido")) || null;
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
  if (activity?.parentElement && slot.nextElementSibling !== activity) activity.parentElement.insertBefore(slot, activity);
  else if (!activity && internal.nextElementSibling !== slot) internal.insertAdjacentElement("afterend", slot);
}

function enhanceQuickSend(panel: HTMLElement) {
  const section = findQuickSendSection(panel);
  if (!section) return;
  const emptyDoc = Array.from(section.querySelectorAll<HTMLElement>("p")).find((p) => p.textContent?.includes("No hay docs listos") || p.textContent?.includes("No hay documentos listos"));
  if (emptyDoc) {
    if (emptyDoc.textContent !== "No hay documentos listos") emptyDoc.textContent = "No hay documentos listos";
    const wrapper = emptyDoc.closest("div") as HTMLElement | null;
    if (wrapper && !wrapper.querySelector("[data-corevix-wa-empty-doc-helper]")) {
      const helper = document.createElement("p");
      helper.dataset.corevixWaEmptyDocHelper = "true";
      helper.textContent = "Crea una propuesta o factura y vuelve aquí para prepararla en el chat sin salir del flujo.";
      emptyDoc.insertAdjacentElement("afterend", helper);
    }
  }
  const prepareButton = section.querySelector<HTMLElement>('[title="Preparar mensaje"]');
  const openButton = section.querySelector<HTMLElement>('[title="Abrir documento"]');
  if (prepareButton) labelButton(prepareButton, "Preparar mensaje", true);
  if (openButton) labelButton(openButton, "Abrir");
  const actions = prepareButton?.parentElement || openButton?.parentElement;
  if (actions) setAttr(actions, "data-corevix-wa-doc-actions", "true");
  const docCard = prepareButton?.closest("div.rounded-2xl") as HTMLElement | null;
  if (docCard) {
    setAttr(docCard, "data-corevix-wa-doc-card", "true");
    if (!docCard.querySelector("[data-corevix-wa-doc-helper]")) {
      const helper = document.createElement("p");
      helper.dataset.corevixWaDocHelper = "true";
      helper.textContent = "Preparar mensaje coloca el texto en el input para revisarlo antes de enviarlo.";
      actions?.insertAdjacentElement("afterend", helper);
    }
  }
}

function enhanceOnce() {
  injectStyles();
  const grid = getGrid();
  if (grid) setAttr(grid, "data-corevix-wa-grid", "true");
  const panel = getPanel();
  if (!panel) return;
  setAttr(panel, "data-corevix-wa-panel", "true");
  if (panel.style.overflowX !== "hidden") panel.style.overflowX = "hidden";
  const main = panel.querySelector<HTMLElement>('[title="Crear lead"], [title="Crear cliente"], [title="Crear propuesta"], [title="Crear factura"], [title="Preparar seguimiento"], [title="Preparar"], [title="Ver"]');
  if (main) {
    const label = LABELS[main.getAttribute("title") || ""] || main.getAttribute("title") || "Continuar";
    labelButton(main, label, true);
    const row = main.parentElement;
    if (row) {
      if (row.style.display !== "grid") row.style.display = "grid";
      if (row.style.gridTemplateColumns !== "minmax(0px, 1fr)") row.style.gridTemplateColumns = "minmax(0,1fr)";
      if (row.style.gap !== "10px") row.style.gap = "10px";
    }
  }
  for (const [title, label] of Object.entries(LABELS)) {
    panel.querySelectorAll<HTMLElement>(`[title="${title}"]`).forEach((button) => labelButton(button, label, title === "Preparar mensaje"));
  }
  const firstDoc = panel.querySelector<HTMLElement>('[title="Crear propuesta"], [title="Crear factura"], [title="Preparar mensaje"]');
  if (firstDoc?.parentElement) setAttr(firstDoc.parentElement, "data-corevix-wa-doc-actions", "true");
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
    const timers = [window.setTimeout(run, 250), window.setTimeout(run, 900), window.setTimeout(run, 1500)];
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
  return null;
}
