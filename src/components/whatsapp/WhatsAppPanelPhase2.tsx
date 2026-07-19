import { useEffect } from "react";

const ACTION_LABELS: Record<string, string> = {
  "Crear lead": "Crear lead",
  "Crear cliente": "Crear cliente",
  "Crear propuesta": "Crear propuesta",
  "Crear factura": "Crear factura",
  "Preparar seguimiento": "Seguimiento",
  Preparar: "Preparar",
  Ver: "Ver",
  Tarea: "Crear tarea",
  Nota: "Nota",
  "Preparar mensaje": "Preparar mensaje",
  "Abrir documento": "Abrir",
};

function getWhatsappGrid() {
  return document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
}

function getRightAside() {
  const asides = Array.from(document.querySelectorAll<HTMLElement>("aside"));
  return (
    asides.find(
      (aside) =>
        aside.textContent?.includes("Envío rápido") ||
        aside.querySelector(
          '[title="Crear propuesta"], [title="Crear lead"], [title="Tarea"], [title="Preparar mensaje"]',
        ),
    ) || null
  );
}

function injectStyles() {
  if (document.getElementById("corevix-whatsapp-phase-2")) return;

  const style = document.createElement("style");
  style.id = "corevix-whatsapp-phase-2";
  style.textContent = `
    [data-corevix-wa-grid="true"] {
      min-width: 0;
    }

    [data-corevix-wa-panel="true"] {
      overflow-x: hidden !important;
      scrollbar-width: thin;
    }

    [data-corevix-wa-panel="true"] section,
    [data-corevix-wa-panel="true"] [data-corevix-wa-title-card="true"] {
      border-radius: 22px !important;
      box-shadow: 0 10px 24px rgba(18, 35, 29, 0.065) !important;
    }

    [data-corevix-wa-panel="true"] section {
      margin-bottom: 2px;
    }

    [data-corevix-wa-main-button="true"] {
      width: 100% !important;
      min-width: 0 !important;
      height: 42px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      border-radius: 16px !important;
      padding: 0 14px !important;
      background: #00a884 !important;
      border: 1px solid #00a884 !important;
      color: #ffffff !important;
      box-shadow: 0 10px 20px rgba(0, 168, 132, .18) !important;
      white-space: nowrap !important;
    }

    [data-corevix-wa-button="true"] {
      width: 100% !important;
      min-width: 0 !important;
      height: 42px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      border-radius: 16px !important;
      padding: 0 12px !important;
      white-space: nowrap !important;
      background: #f7fbf9 !important;
      border: 1px solid #dce8e2 !important;
      color: #52645d !important;
      box-shadow: 0 6px 14px rgba(18, 35, 29, .045) !important;
    }

    [data-corevix-wa-button-label="true"] {
      pointer-events: none;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
    }

    [data-corevix-wa-doc-actions="true"] {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      width: 100% !important;
    }

    [data-corevix-wa-doc-actions="true"] > * {
      min-width: 0 !important;
      width: 100% !important;
    }

    [data-whatsapp-task-slot] {
      display: block;
      margin-bottom: 8px;
    }

    @media (min-width: 1461px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 72px minmax(340px, 390px) minmax(0, 1fr) minmax(320px, 340px) !important;
      }
    }

    @media (min-width: 1180px) and (max-width: 1460px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 66px minmax(330px, 360px) minmax(0, 1fr) 300px !important;
      }
      [data-corevix-wa-panel="true"] {
        display: block !important;
      }
    }

    @media (max-width: 1179px) {
      [data-corevix-wa-panel="true"] {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function addButtonLabel(button: HTMLElement, label: string, primary = false) {
  button.dataset.corevixWaButton = primary ? "main" : "true";
  if (primary) button.dataset.corevixWaMainButton = "true";
  button.classList.remove("grid", "place-items-center", "w-10", "h-10", "w-9", "h-9");
  button.classList.add("flex", "items-center", "justify-center", "gap-2");

  const existing = button.querySelector<HTMLElement>("[data-corevix-wa-button-label]");
  if (existing) {
    existing.textContent = label;
    return;
  }

  const labelNode = document.createElement("span");
  labelNode.dataset.corevixWaButtonLabel = "true";
  labelNode.textContent = label;
  button.appendChild(labelNode);
}

function getSectionTitle(section: HTMLElement) {
  return section.querySelector("p")?.textContent?.trim().toLowerCase() || "";
}

function findActivitySection(aside: HTMLElement) {
  return (
    Array.from(aside.querySelectorAll<HTMLElement>("section")).find((section) => {
      const title = getSectionTitle(section);
      return (
        title === "actividad" ||
        section.textContent?.includes("Último mensaje:") ||
        section.textContent?.includes("Última interacción:")
      );
    }) || null
  );
}

function ensureTaskSlot(aside: HTMLElement) {
  const taskButton = aside.querySelector<HTMLElement>('[title="Tarea"]');
  const internalSection = taskButton?.closest("section") as HTMLElement | null;
  if (!internalSection) return;

  let slot = aside.querySelector<HTMLElement>("[data-whatsapp-task-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappTaskSlot = "true";
  }

  const activitySection = findActivitySection(aside);
  if (activitySection?.parentElement) {
    if (slot.nextElementSibling !== activitySection) {
      activitySection.parentElement.insertBefore(slot, activitySection);
    }
  } else if (internalSection.nextElementSibling !== slot) {
    internalSection.insertAdjacentElement("afterend", slot);
  }
}

function enhanceNextAction(aside: HTMLElement) {
  const nextButton = aside.querySelector<HTMLElement>(
    '[title="Crear lead"], [title="Crear cliente"], [title="Crear propuesta"], [title="Crear factura"], [title="Preparar seguimiento"], [title="Preparar"], [title="Ver"]',
  );
  if (!nextButton) return;

  const title = nextButton.getAttribute("title") || "Continuar";
  addButtonLabel(nextButton, ACTION_LABELS[title] || title, true);

  const card = nextButton.closest("section") as HTMLElement | null;
  if (!card) return;
  card.style.overflow = "hidden";
  card.style.cursor = "pointer";

  const row = nextButton.parentElement;
  if (row) {
    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(0, 1fr)";
    row.style.gap = "10px";
  }

  if (card.dataset.corevixWaClickReady !== "true") {
    card.dataset.corevixWaClickReady = "true";
    card.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a,button,input,textarea,select")) return;
      nextButton.click();
    });
  }
}

function enhanceDocuments(aside: HTMLElement) {
  aside
    .querySelectorAll<HTMLElement>('[title="Crear propuesta"]')
    .forEach((button) => addButtonLabel(button, "Propuesta"));
  aside
    .querySelectorAll<HTMLElement>('[title="Crear factura"]')
    .forEach((button) => addButtonLabel(button, "Factura"));
  aside
    .querySelectorAll<HTMLElement>('[title="Preparar mensaje"]')
    .forEach((button) => addButtonLabel(button, "Preparar", true));
  aside
    .querySelectorAll<HTMLElement>('[title="Abrir documento"]')
    .forEach((button) => addButtonLabel(button, "Abrir"));

  const firstDocButton = aside.querySelector<HTMLElement>(
    '[title="Crear propuesta"], [title="Crear factura"], [title="Preparar mensaje"]',
  );
  const actions = firstDocButton?.parentElement;
  if (actions) actions.dataset.corevixWaDocActions = "true";

  const emptyDocText = Array.from(aside.querySelectorAll<HTMLElement>("p")).find((p) =>
    p.textContent?.includes("No hay docs listos"),
  );
  if (emptyDocText) emptyDocText.textContent = "No hay documentos listos";
}

function enhanceInternalWork(aside: HTMLElement) {
  aside
    .querySelectorAll<HTMLElement>('[title="Tarea"]')
    .forEach((button) => addButtonLabel(button, "Tarea"));
  aside
    .querySelectorAll<HTMLElement>('[title="Nota"]')
    .forEach((button) => addButtonLabel(button, "Nota"));

  const taskButton = aside.querySelector<HTMLElement>('[title="Tarea"]');
  const section = taskButton?.closest("section") as HTMLElement | null;
  if (section && !section.previousElementSibling?.hasAttribute("data-corevix-wa-title-card")) {
    const title = document.createElement("div");
    title.dataset.corevixWaTitleCard = "true";
    title.className = "rounded-2xl border border-[#dce8e2] bg-white px-3 py-2 shadow-sm";
    title.innerHTML =
      '<p class="text-sm font-black text-[#12231d]">Trabajo interno</p><p class="mt-0.5 text-[11px] leading-4 text-[#6c7f77]">Crea tareas o notas sin salir del chat.</p>';
    section.insertAdjacentElement("beforebegin", title);
  }

  ensureTaskSlot(aside);
}

function enhancePanel() {
  injectStyles();

  const grid = getWhatsappGrid();
  if (grid) grid.dataset.corevixWaGrid = "true";

  const aside = getRightAside();
  if (!aside) return;
  aside.dataset.corevixWaPanel = "true";
  aside.style.overflowX = "hidden";

  enhanceNextAction(aside);
  enhanceDocuments(aside);
  enhanceInternalWork(aside);
}

export function WhatsAppPanelPhase2() {
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
