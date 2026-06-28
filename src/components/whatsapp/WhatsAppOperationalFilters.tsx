import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, Inbox, Receipt, Reply, SearchCheck } from "lucide-react";

type FilterKey = "all" | "unread" | "pending" | "proposal" | "invoice" | "task" | "closed";

type FilterOption = {
  key: FilterKey;
  label: string;
  icon: JSX.Element;
};

const FILTERS: FilterOption[] = [
  { key: "all", label: "Todos", icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: "unread", label: "No leídos", icon: <SearchCheck className="h-3.5 w-3.5" /> },
  { key: "pending", label: "Sin responder", icon: <Reply className="h-3.5 w-3.5" /> },
  { key: "proposal", label: "Propuesta", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "invoice", label: "Factura", icon: <Receipt className="h-3.5 w-3.5" /> },
  { key: "task", label: "Tarea", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { key: "closed", label: "Cerrados", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

function getChannelRow() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) =>
    ["Todos", "WhatsApp", "Messenger", "Instagram"].includes((button.textContent || "").trim()),
  );
  return buttons[0]?.parentElement || null;
}

function ensureSlot() {
  const channelRow = getChannelRow();
  if (!channelRow) return null;
  let slot = document.querySelector<HTMLElement>("[data-whatsapp-operational-filters-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappOperationalFiltersSlot = "true";
  }
  if (channelRow.nextElementSibling !== slot) channelRow.insertAdjacentElement("afterend", slot);
  return slot;
}

function getConversationButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) => {
    const className = String(button.className || "");
    return className.includes("mb-1") && className.includes("w-full") && className.includes("text-left");
  });
}

function buttonHasUnread(button: HTMLElement) {
  return Array.from(button.querySelectorAll("span")).some((span) => /^\d+$/.test((span.textContent || "").trim()));
}

function buttonMatches(button: HTMLElement, active: FilterKey) {
  if (active === "all") return true;
  const text = (button.textContent || "").toLowerCase();
  if (active === "unread") return buttonHasUnread(button);
  if (active === "pending") return buttonHasUnread(button) || text.includes("pendiente") || text.includes("seguimiento") || text.includes("responder");
  if (active === "proposal") return text.includes("propuesta") || text.includes("cotiz") || text.includes("quote");
  if (active === "invoice") return text.includes("factura") || text.includes("pago") || text.includes("invoice");
  if (active === "task") return text.includes("tarea") || text.includes("seguimiento") || text.includes("llamar");
  if (active === "closed") return text.includes("cerrado") || text.includes("cerrada") || text.includes("closed");
  return true;
}

function applyFilter(active: FilterKey) {
  getConversationButtons().forEach((button) => {
    button.style.display = buttonMatches(button, active) ? "" : "none";
  });
}

function countForFilter(active: FilterKey) {
  return getConversationButtons().filter((button) => buttonMatches(button, active)).length;
}

export function WhatsAppOperationalFilters() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<FilterKey>("all");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let frame = 0;
    const run = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSlot(ensureSlot());
        applyFilter(active);
        setVersion((prev) => prev + 1);
      });
    };
    run();
    const timers = [window.setTimeout(run, 250), window.setTimeout(run, 900)];
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", run, true);
    return () => {
      timers.forEach(window.clearTimeout);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("click", run, true);
    };
  }, [active]);

  const counts = useMemo(() => {
    version;
    return FILTERS.reduce<Record<FilterKey, number>>((acc, option) => {
      acc[option.key] = countForFilter(option.key);
      return acc;
    }, {} as Record<FilterKey, number>);
  }, [version]);

  if (!slot) return null;

  return createPortal(
    <div className="mt-2 rounded-2xl border border-[#e0ebe6] bg-[#f7fbf9] p-2 shadow-inner">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#6c7f77]">Filtros CRM</p>
        <button
          type="button"
          onClick={() => {
            setActive("all");
            window.requestAnimationFrame(() => applyFilter("all"));
          }}
          className="text-[10px] font-bold text-[#008069] hover:underline"
        >
          limpiar
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((option) => {
          const selected = active === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setActive(option.key);
                window.requestAnimationFrame(() => applyFilter(option.key));
              }}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black transition ${
                selected
                  ? "border-[#a8e8c3] bg-[#d9fdd3] text-[#007a5d]"
                  : "border-[#dce8e2] bg-white text-[#52645d] hover:border-[#bddfd0] hover:bg-[#f4faf7]"
              }`}
            >
              {option.icon}
              <span>{option.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-white/70" : "bg-[#edf6f2]"}`}>
                {counts[option.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    slot,
  );
}
