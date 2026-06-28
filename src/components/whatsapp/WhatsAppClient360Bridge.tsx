import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, FileText, MessageCircle, Receipt, StickyNote } from "lucide-react";

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getWhatsappContextPanel() {
  return Array.from(document.querySelectorAll<HTMLElement>("aside")).find((aside) =>
    aside.textContent?.includes("Envío rápido") || aside.querySelector('[title="Tarea"]'),
  ) || null;
}

function readWhatsappConversationId() {
  const link = document.querySelector<HTMLAnchorElement>('a[href^="/tasks?conversationId="]');
  if (!link) return "";
  try {
    return new URL(link.href, window.location.origin).searchParams.get("conversationId") || "";
  } catch {
    return "";
  }
}

function readWhatsappContactSearch() {
  const panel = getWhatsappContextPanel();
  const heading = panel?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
  const subtitle = Array.from(panel?.querySelectorAll<HTMLElement>("p") || [])
    .map((p) => p.textContent?.trim() || "")
    .find((text) => /\+?\d{7,}/.test(text));
  return subtitle || heading;
}

function enhanceWhatsappProfileButton() {
  const panel = getWhatsappContextPanel();
  if (!panel) return;
  const profileLink = panel.querySelector<HTMLAnchorElement>('a[href="/clients"], a[title="Ver perfil"]');
  if (!profileLink) return;
  const search = readWhatsappContactSearch();
  const conversationId = readWhatsappConversationId();
  const url = new URL("/clients", window.location.origin);
  if (search) url.searchParams.set("clientSearch", search);
  if (conversationId) url.searchParams.set("conversationId", conversationId);
  url.searchParams.set("from", "whatsapp");
  profileLink.href = `${url.pathname}${url.search}`;
  profileLink.title = "Abrir Cliente 360";
}

function applyClientSearchFromUrl() {
  const url = new URL(window.location.href);
  const search = url.searchParams.get("clientSearch") || url.searchParams.get("phone") || "";
  if (!search) return;
  const input = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar clientes"]');
  if (!input) return;
  if (input.value.trim() === search.trim()) return;
  setNativeInputValue(input, search);
}

function applyWhatsappSearchFromUrl() {
  const url = new URL(window.location.href);
  const search = url.searchParams.get("clientSearch") || url.searchParams.get("phone") || "";
  if (!search) return;
  const input = document.querySelector<HTMLInputElement>('input[placeholder="Buscar o iniciar un chat"]');
  if (!input) return;
  if (input.value.trim() === search.trim()) return;
  setNativeInputValue(input, search);
}

function getClient360Slot() {
  const productCard = document.querySelector<HTMLElement>('[data-demo="client-360-products"]');
  if (!productCard) return null;
  let slot = document.querySelector<HTMLElement>("[data-whatsapp-client360-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappClient360Slot = "true";
  }
  const targetGrid = productCard.closest(".grid") as HTMLElement | null;
  const target = targetGrid || productCard;
  if (target.previousElementSibling !== slot) target.insertAdjacentElement("beforebegin", slot);
  return slot;
}

function readSelectedClientName() {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]') || document.body;
  const headings = Array.from(dialog.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .map((item) => item.textContent?.trim() || "")
    .filter(Boolean);
  return headings.find((text) => !["Cliente 360", "Contactos", "Proyectos"].includes(text)) || "este cliente";
}

function readSelectedClientSearch() {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]') || document.body;
  const text = dialog.textContent || "";
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.trim();
  return phone || readSelectedClientName();
}

function Client360WhatsAppCard() {
  const clientSearch = readSelectedClientSearch();
  const chatUrl = `/whatsapp-web?clientSearch=${encodeURIComponent(clientSearch)}`;

  return (
    <section className="rounded-[18px] border border-[#bcebd0] bg-[#f0fff6] p-4 shadow-[0_10px_24px_rgba(18,35,29,.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[#00a884] text-white">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#12231d]">WhatsApp 360</h3>
              <p className="text-xs text-[#60736b]">Mensajes, tareas y notas internas conectadas al cliente.</p>
            </div>
          </div>
        </div>
        <a
          href={chatUrl}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#00a884] px-3 text-xs font-black text-white hover:bg-[#008f72]"
        >
          Abrir chat <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#dce8e2] bg-white px-3 py-2">
          <MessageCircle className="mb-1 h-4 w-4 text-[#008069]" />
          <p className="text-[11px] font-black text-[#12231d]">Conversaciones</p>
          <p className="text-[10px] text-[#60736b]">WhatsApp/Messenger/Instagram</p>
        </div>
        <div className="rounded-2xl border border-[#dce8e2] bg-white px-3 py-2">
          <StickyNote className="mb-1 h-4 w-4 text-[#008069]" />
          <p className="text-[11px] font-black text-[#12231d]">Notas</p>
          <p className="text-[10px] text-[#60736b]">Internas del equipo</p>
        </div>
        <div className="rounded-2xl border border-[#dce8e2] bg-white px-3 py-2">
          <Clock3 className="mb-1 h-4 w-4 text-[#008069]" />
          <p className="text-[11px] font-black text-[#12231d]">Tareas</p>
          <p className="text-[10px] text-[#60736b]">Seguimiento CRM</p>
        </div>
        <div className="rounded-2xl border border-[#dce8e2] bg-white px-3 py-2">
          <FileText className="mb-1 h-4 w-4 text-[#008069]" />
          <p className="text-[11px] font-black text-[#12231d]">Docs</p>
          <p className="text-[10px] text-[#60736b]">Propuestas/facturas</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href="/tasks" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
          <Clock3 className="h-3.5 w-3.5" /> Ver tareas
        </a>
        <a href="/proposals" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
          <FileText className="h-3.5 w-3.5" /> Propuestas
        </a>
        <a href="/invoices" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-2.5 text-[11px] font-black text-[#52645d] hover:bg-[#f7fbf9]">
          <Receipt className="h-3.5 w-3.5" /> Facturas
        </a>
      </div>
    </section>
  );
}

export function WhatsAppClient360Bridge({ mode }: { mode: "whatsapp" | "clients" }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let frame = 0;
    const run = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (mode === "whatsapp") {
          enhanceWhatsappProfileButton();
          applyWhatsappSearchFromUrl();
        } else {
          applyClientSearchFromUrl();
          setSlot(getClient360Slot());
          setVersion((prev) => prev + 1);
        }
      });
    };
    run();
    const timers = [window.setTimeout(run, 300), window.setTimeout(run, 1000), window.setTimeout(run, 1800)];
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", run, true);
    return () => {
      timers.forEach(window.clearTimeout);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("click", run, true);
    };
  }, [mode]);

  const card = useMemo(() => {
    version;
    return <Client360WhatsAppCard />;
  }, [version]);

  if (mode !== "clients" || !slot) return null;
  return createPortal(card, slot);
}
