import { useEffect } from "react";

const BUTTON_LABELS: Record<string, string> = {
  "Crear lead": "Crear lead",
  "Crear cliente": "Crear cliente",
  "Crear propuesta": "Crear propuesta",
  "Crear factura": "Crear factura",
  "Preparar seguimiento": "Seguimiento",
  Preparar: "Preparar",
  Ver: "Ver",
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
      aside.querySelector('[title="Crear propuesta"], [title="Crear lead"], [title="Tarea"], [title="Preparar mensaje"]'),
    ) || null
  );
}

function getWhatsappGrid() {
  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
}

function injectResponsiveStyles() {
  if (document.getElementById("corevix-whatsapp-responsive-fixes")) return;

  const style = document.createElement("style");
  style.id = "corevix-whatsapp-responsive-fixes";
  style.textContent = `
    [data-corevix-whatsapp-panel="true"] {
      scrollbar-width: thin;
      overflow-x: hidden !important;
    }

    [data-corevix-whatsapp-panel="true"] section,
    [data-corevix-whatsapp-panel="true"] [data-corevix-section-title] {
      border-radius: 22px !important;
      box-shadow: 0 10px 24px rgba(18, 35, 29, 0.07) !important;
    }

    [data-corevix-button-label="true"] {
      pointer-events: none;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    [data-corevix-doc-actions="true"] {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      width: 100% !important;
    }

    [data-corevix-doc-actions="true"] > * {
      min-width: 0 !important;
      width: 100% !important;
    }

    [data-whatsapp-task-slot] {
      display: block;
      margin-bottom: 8px;
    }

    @media (max-width: 1460px) {
      [data-corevix-whatsapp-right-aside="true"] {
        display: block !important;
        width: 300px !important;
      }
    }

    @media (max-width: 1180px) {
      [data-corevix-whatsapp-right-aside="true"] {
        display: none !important;
      }
    }

    @media (max-width: 980px) {
      [data-corevix-whatsapp-grid="true"] {
        grid-template-columns: 58px minmax(280px, 340px) minmax(0, 1fr) !important;
      }
    }

    @media (max-width: 760px) {
      [data-corevix-whatsapp-grid="true"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function applyResponsiveLayout() {
  const grid = getWhatsappGrid();
  if (grid) {
    grid.dataset.corevixWhatsappGrid = "true";
    const width = window.innerWidth;
    if (width >= 1460) {
      grid.style.gridTemplateColumns = "72px minmax(340px, 390px) minmax(0, 1fr) minmax(320px, 340px)";
    } else if (width >= 1180) {
      grid.style.gridTemplateColumns = "66px minmax(330px, 360px) minmax(0, 1fr) 300px";
    } else if (width >= 980) {
      grid.style.gridTemplateColumns = "58px minmax(300px, 340px) minmax(0, 1fr)";
    }
  }

  const aside = getRightAside();
  if (aside) {
    aside.dataset.corevixWhatsappRightAside = "true";
    aside.dataset.corevixWhatsappPanel = "true";
    aside.style.overflowX = "hidden";
  }
}

function ensureReadableButton(element: HTMLElement, label: string, variant: "primary" | "soft" | "icon" = "soft") {
  if (element.dataset.corevixLabelEnhanced === `${label}:${variant}`) return;

  element.dataset.corevixLabelEnhanced = `${label}:${variant}`;
  element.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9", "min-w-fit");
  element.classList.add("flex", "items-center", "justify-center", "gap-2");

  element.style.width = "100%";
  element.style.minWidth = "0";
  element.style.height = variant === "primary" ? "42px" : "40px";
  element.style.borderRadius = "16px";
  element.style.padding = "0 12px";
  element.style.whiteSpace = "nowrap";

  if (variant === "primary") {
    element.style.background = "#00a884";
    element.style.color = "#ffffff";
    element.style.boxShadow = "0 10px 20px rgba(0, 168, 132, .18)";
    element.style.border = "1px solid #00a884";
  } else {
    element.style.background = "#f7fbf9";
    element.style.color = "#52645d";
    element.style.border = "1px solid #dce8e2";
    element.style.boxShadow = "0 6px 14px rgba(18, 35, 29, .05)";
  }

  const existing = element.querySelector<HTMLElement>("[data-corevix-button-label]");
  if (existing) {
    existing.textContent = label;
    return;
  }

  const span = document.createElement("span");
  span.dataset.corevixButtonLabel = "true";
  span.textContent = label;
  span.className = "text-[11px] font-black leading-none whitespace-nowrap truncate";
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

function enhanceNextActionCard(aside: HTMLElement) {
  const nextButton = aside.querySelector<HTMLElement>(
    '[title="Crear lead"], [title="Crear cliente"], [title="Crear propuesta"], [title="Crear factura"], [title="Preparar seguimiento"], [title="Preparar"], [title="Ver"]',
  );
  if (!nextButton) return;

  const label = BUTTON_LABELS[nextButton.getAttribute("title") || ""] || "Continuar";
  ensureReadableButton(nextButton, label, "primary");

  const card = nextButton.closest("section") as HTMLElement | null;
  if (!card) return;

  card.dataset.corevixNextActionEnhanced = "true";
  card.classList.add("cursor-pointer", "transition", "hover:shadow-md");
  card.style.overflow = "hidden";

  const headerRow = nextButton.parentElement;
  if (headerRow) {
    headerRow.style.display = "grid";
    headerRow.style.gridTemplateColumns = "minmax(0, 1fr)";
    headerRow.style.gap = "10px";
    headerRow.style.alignItems = "stretch";
  }

  if (card.dataset.corevixNextActionClick !== "true") {
    card.dataset.corevixNextActionClick = "true";
    card.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a,button,input,textarea,select")) return;
      nextButton.click();
    });
  }
}

function enhanceDocumentActions(aside: HTMLElement) {
  const proposalButtons = aside.querySelectorAll<HTMLElement>('[title="Crear propuesta"]');
  const invoiceButtons = aside.querySelectorAll<HTMLElement>('[title="Crear factura"]');
  proposalButtons.forEach((element) => ensureReadableButton(element, "Propuesta"));
  invoiceButtons.forEach((element) => ensureReadableButton(element, "Factura"));

  const firstDocButton = proposalButtons[0] || invoiceButtons[0];
  const actionsRow = firstDocButton?.parentElement as HTMLElement | null;
  if (actionsRow) {
    actionsRow.dataset.corevixDocActions = "true";
  }

  aside.querySelectorAll<HTMLElement>('[title="Preparar mensaje"]').forEach((element) => ensureReadableButton(element, "Enviar", "primary"));
  aside.querySelectorAll<HTMLElement>('[title="Abrir documento"]').forEach((element) => ensureReadableButton(element, "Abrir"));
}

function findActivitySection(aside: HTMLElement) {
  return Array.from(aside.querySelectorAll<HTMLElement>("section")).find((section) => {
    const title = section.querySelector("p")?.textContent?.trim().toLowerCase() || "";
    return title === "actividad" || section.textContent?.includes("Último mensaje:") || section.textContent?.includes("Última interacción:");
  }) || null;
}

function ensureTaskSlot(aside: HTMLElement, internalSection: HTMLElement | null) {
  if (!internalSection) return;
  let slot = aside.querySelector<HTMLElement>("[data-whatsapp-task-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappTaskSlot = "true";
  }

  const activitySection = findActivitySection(aside);
  const parent = activitySection?.parentElement || internalSection.parentElement;
  if (!parent) return;

  const desiredPrevious = internalSection.nextElementSibling;
  if (activitySection) {
    if (slot.nextElementSibling !== activitySection) {
      parent.insertBefore(slot, activitySection);
    }
  } else if (desiredPrevious !== slot) {
    internalSection.insertAdjacentElement("afterend", slot);
  }
}

function enhanceInternalActions(aside: HTMLElement) {
  aside.querySelectorAll<HTMLElement>('[title="Tarea"]').forEach((element) => ensureReadableButton(element, "Tarea"));
  aside.querySelectorAll<HTMLElement>('[title="Nota"]').forEach((element) => ensureReadableButton(element, "Nota"));

  const taskButton = aside.querySelector<HTMLElement>('[title="Tarea"]');
  const internalSection = taskButton?.closest("section") as HTMLElement | null;
  if (internalSection && !internalSection.querySelector("p")) {
    ensureSectionTitle(internalSection, "Trabajo interno", "Crea tareas o notas sin salir del chat.");
  }
  ensureTaskSlot(aside, internalSection);
}

function enhancePanel() {
  injectResponsiveStyles();
  applyResponsiveLayout();

  const aside = getRightAside();
  if (!aside) return;

  enhanceNextActionCard(aside);
  enhanceDocumentActions(aside);
  enhanceInternalActions(aside);

  const noDocsText = Array.from(aside.querySelectorAll<HTMLElement>("p")).find((p) =>
    p.textContent?.includes("No hay docs listos"),
  );
  if (noDocsText) {
    noDocsText.textContent = "No hay documentos listos";
  }
}

export function WhatsAppPanelLabelsEnhancer() {
  useEffect(() => {
    enhancePanel();
    const observer = new MutationObserver(enhancePanel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", enhancePanel);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", enhancePanel);
    };
  }, []);

  return null;
}
