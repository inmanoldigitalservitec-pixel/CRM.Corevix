import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Inbox,
  Receipt,
  Reply,
  SearchCheck,
} from "lucide-react";

type FilterKey = "all" | "unread" | "pending" | "proposal" | "invoice" | "task" | "closed";

type FilterOption = {
  key: FilterKey;
  label: string;
  icon: ReactNode;
};

const FILTERS: FilterOption[] = [
  { key: "all", label: "Todos", icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: "unread", label: "No leídos", icon: <SearchCheck className="h-3.5 w-3.5" /> },
  { key: "pending", label: "Sin responder", icon: <Reply className="h-3.5 w-3.5" /> },
  { key: "proposal", label: "Con propuesta", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "invoice", label: "Con factura", icon: <Receipt className="h-3.5 w-3.5" /> },
  { key: "task", label: "Con tarea", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { key: "closed", label: "Cerrados", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

function getChannelRow() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) =>
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
    return (
      className.includes("w-full") &&
      className.includes("text-left") &&
      (className.includes("border-b") || className.includes("group"))
    );
  });
}

function buttonHasUnread(button: HTMLElement) {
  return Array.from(button.querySelectorAll("span")).some((span) =>
    /^\d+$/.test((span.textContent || "").trim()),
  );
}

function buttonMatches(button: HTMLElement, active: FilterKey) {
  if (active === "all") return true;
  const text = (button.textContent || "").toLowerCase();
  if (active === "unread") return buttonHasUnread(button);
  if (active === "pending")
    return (
      buttonHasUnread(button) ||
      text.includes("pendiente") ||
      text.includes("seguimiento") ||
      text.includes("responder")
    );
  if (active === "proposal")
    return text.includes("propuesta") || text.includes("cotiz") || text.includes("quote");
  if (active === "invoice")
    return text.includes("factura") || text.includes("pago") || text.includes("invoice");
  if (active === "task")
    return text.includes("tarea") || text.includes("seguimiento") || text.includes("llamar");
  if (active === "closed")
    return text.includes("cerrado") || text.includes("cerrada") || text.includes("closed");
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
  const [open, setOpen] = useState(false);
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
    return FILTERS.reduce<Record<FilterKey, number>>(
      (acc, option) => {
        acc[option.key] = countForFilter(option.key);
        return acc;
      },
      {} as Record<FilterKey, number>,
    );
  }, [version]);

  const activeOption = FILTERS.find((option) => option.key === active) || FILTERS[0];

  if (!slot) return null;

  return createPortal(
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Filtro CRM</p>
        {active !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setActive("all");
              setOpen(false);
              window.requestAnimationFrame(() => applyFilter("all"));
            }}
            className="text-[10px] font-bold text-blue-700 hover:underline"
          >
            limpiar
          </button>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-black text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-blue-700"
        >
          <span className="flex min-w-0 items-center gap-2">
            {activeOption.icon}
            <span className="truncate">{activeOption.label}</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {counts[activeOption.key] ?? 0}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-10 z-50 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5">
            {FILTERS.map((option) => {
              const selected = active === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setActive(option.key);
                    setOpen(false);
                    window.requestAnimationFrame(() => applyFilter(option.key));
                  }}
                  className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-left text-xs font-black transition ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-white" : "bg-slate-100"}`}
                  >
                    {counts[option.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>,
    slot,
  );
}
