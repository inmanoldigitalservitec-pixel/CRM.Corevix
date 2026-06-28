import { useEffect } from "react";

const BUTTON_LABELS: Record<string, string> = {
  "Crear propuesta": "Crear propuesta",
  "Crear factura": "Crear factura",
  Tarea: "Tarea",
  Nota: "Nota",
  "Preparar mensaje": "Enviar",
  "Abrir documento": "Abrir",
};

function getRightAside() {
  const asides = Array.from(document.querySelectorAll<HTMLElement>("aside"));
  return (
    asides.find((aside) =>
      aside.textContent?.includes("Envío rápido") ||
      aside.querySelector('[title="Crear propuesta"], [title="Tarea"], [title="Preparar mensaje"]'),
    ) || null
  );
}

function ensureReadableButton(element: HTMLElement, label: string) {
  if (element.dataset.corevixLabelEnhanced === label) return;

  element.dataset.corevixLabelEnhanced = label;
  element.classList.remove("grid", "place-items-center");
  element.classList.add("flex", "items-center", "justify-center", "gap-2");

  const existing = element.querySelector<HTMLElement>("[data-corevix-button-label]");
  if (existing) {
    existing.textContent = label;
    return;
  }

  const span = document.createElement("span");
  span.dataset.corevixButtonLabel = "true";
  span.textContent = label;
  span.className = "text-[11px] font-black leading-none";
  element.appendChild(span);
}

function ensureSectionTitle(beforeNode: HTMLElement, title: string, subtitle?: string) {
  const parent = beforeNode.parentElement;
  if (!parent) return;

  const key = title.toLowerCase().replace(/\s+/g, "-");
  if (parent.querySelector(`[data-corevix-section-title="${key}"]`)) return;

  const header = document.createElement("div");
  header.dataset.corevixSectionTitle = key;
  header.className = "mb-2 rounded-2xl border border-[#dce8e2] bg-white px-3 py-2 shadow-sm";
  header.innerHTML = `
    <p class="text-sm font-black text-[#12231d]">${title}</p>
    ${subtitle ? `<p class="mt-0.5 text-[11px] leading-4 text-[#6c7f77]">${subtitle}</p>` : ""}
  `;
  parent.insertBefore(header, beforeNode);
}

function enhancePanel() {
  const aside = getRightAside();
  if (!aside) return;

  for (const [title, label] of Object.entries(BUTTON_LABELS)) {
    aside.querySelectorAll<HTMLElement>(`[title="${title}"]`).forEach((element) => ensureReadableButton(element, label));
  }

  const taskButton = aside.querySelector<HTMLElement>('[title="Tarea"]');
  const internalSection = taskButton?.closest("section") as HTMLElement | null;
  if (internalSection && !internalSection.querySelector("p")) {
    ensureSectionTitle(internalSection, "Trabajo interno", "Crea tareas o notas sin salir del chat.");
  }

  const proposalButton = aside.querySelector<HTMLElement>('[title="Crear propuesta"]');
  const docsBox = proposalButton?.closest("div.rounded-2xl") as HTMLElement | null;
  const noDocsText = docsBox?.querySelector("p");
  if (noDocsText && noDocsText.textContent?.includes("No hay docs listos")) {
    noDocsText.textContent = "No hay documentos listos";
  }
}

export function WhatsAppPanelLabelsEnhancer() {
  useEffect(() => {
    enhancePanel();
    const observer = new MutationObserver(enhancePanel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
