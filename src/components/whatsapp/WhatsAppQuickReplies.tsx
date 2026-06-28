import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Plus, Sparkles } from "lucide-react";

type QuickReply = {
  label: string;
  message: string;
};

function getPanel() {
  return Array.from(document.querySelectorAll<HTMLElement>("aside")).find((aside) =>
    aside.textContent?.includes("Envío rápido") || aside.querySelector('[title="Tarea"]'),
  ) || null;
}

function getContactName() {
  const name = getPanel()?.querySelector<HTMLElement>("h3")?.textContent?.trim();
  return name && name !== "C" ? name : "";
}

function getQuickSendSection() {
  const panel = getPanel();
  if (!panel) return null;
  return Array.from(panel.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.textContent?.includes("Envío rápido"),
  ) || null;
}

function ensureSlot() {
  const quickSend = getQuickSendSection();
  if (!quickSend) return null;
  let slot = getPanel()?.querySelector<HTMLElement>("[data-whatsapp-quick-replies-slot]");
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.whatsappQuickRepliesSlot = "true";
  }
  if (quickSend.nextElementSibling !== slot) quickSend.insertAdjacentElement("afterend", slot);
  return slot;
}

function getComposerInput() {
  return document.querySelector<HTMLInputElement>('input[placeholder="Escribe un mensaje"], input[placeholder="Instagram está en modo lectura"]');
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.focus();
}

function insertMessage(message: string) {
  const input = getComposerInput();
  if (!input || input.disabled) return;
  const current = input.value.trim();
  const next = current ? `${current}\n\n${message}` : message;
  setNativeInputValue(input, next);
}

function buildReplies(): QuickReply[] {
  const panelText = getPanel()?.textContent || "";
  const name = getContactName();
  const greeting = name ? `Hola ${name},` : "Hola,";
  const hasInvoice = panelText.includes("Factura") && !panelText.includes("No hay documentos listos");
  const hasProposal = panelText.includes("Propuesta") && !panelText.includes("No hay documentos listos");
  const noDocs = panelText.includes("No hay documentos listos") || panelText.includes("No hay docs listos");
  const leadNew = panelText.includes("Crear lead") || panelText.includes("Sin registrar");

  const general = [
    { label: "Dar seguimiento", message: `${greeting} paso a darte seguimiento. ¿Pudiste revisar la información que te compartimos?` },
    { label: "Pedir confirmación", message: `${greeting} ¿me confirmas si deseas que avancemos con el próximo paso?` },
    { label: "Agendar", message: `${greeting} si te parece bien, podemos coordinar un horario para revisar los detalles.` },
    { label: "Cerrar conversación", message: `${greeting} quedo pendiente por aquí. Cuando tengas cualquier duda o quieras avanzar, me escribes con confianza.` },
  ];

  if (hasInvoice) {
    return [
      { label: "Enviar factura", message: `${greeting} te comparto la factura para que puedas revisarla. Cualquier duda me dices y te ayudo con gusto.` },
      { label: "Recordar pago", message: `${greeting} paso por aquí para dar seguimiento a la factura pendiente. Cuando puedas, me confirmas si todo está correcto.` },
      { label: "Confirmar pago", message: `${greeting} gracias por el pago. En cuanto lo confirmemos internamente, seguimos con el próximo paso.` },
      { label: "Enviar comprobante", message: `${greeting} cuando puedas, envíame el comprobante de pago para validarlo con el equipo.` },
      ...general,
    ];
  }

  if (hasProposal) {
    return [
      { label: "Enviar propuesta", message: `${greeting} te comparto la propuesta para que puedas revisarla con calma. Estoy pendiente por cualquier ajuste.` },
      { label: "Explicar paquete", message: `${greeting} te explico brevemente: la propuesta incluye lo necesario para avanzar de forma ordenada, con alcance claro y próximos pasos definidos.` },
      { label: "Agendar llamada", message: `${greeting} si prefieres, podemos coordinar una llamada corta para revisar la propuesta juntos y aclarar cualquier duda.` },
      { label: "Solicitar aprobación", message: `${greeting} ¿me confirmas si la propuesta está aprobada para avanzar con el próximo paso?` },
      ...general,
    ];
  }

  if (leadNew || noDocs) {
    return [
      { label: "Saludo", message: `${greeting} gracias por escribirnos. Cuéntame un poco más sobre lo que necesitas y con gusto te oriento.` },
      { label: "Pedir datos", message: `${greeting} para ayudarte mejor, ¿me puedes confirmar tu nombre, tipo de servicio que buscas y para cuándo lo necesitas?` },
      { label: "Enviar servicios", message: `${greeting} trabajamos soluciones digitales y comerciales adaptadas a cada cliente. Si me das más detalles, te recomiendo la mejor opción.` },
      { label: "Pedir presupuesto", message: `${greeting} para orientarte mejor, ¿tienes un presupuesto aproximado o rango en mente?` },
      ...general,
    ];
  }

  return general;
}

export function WhatsAppQuickReplies() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const run = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSlot(ensureSlot());
        setVersion((prev) => prev + 1);
      });
    };
    run();
    const timers = [window.setTimeout(run, 300), window.setTimeout(run, 1000)];
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", run, true);
    return () => {
      timers.forEach(window.clearTimeout);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("click", run, true);
    };
  }, []);

  const replies = useMemo(() => buildReplies(), [version]);
  const selectedLabel = replies[0]?.label || "Seleccionar respuesta";
  if (!slot) return null;

  return createPortal(
    <section className="rounded-2xl border border-[#dce8e2] bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#008069]" />
          <p className="text-sm font-black text-[#12231d]">Respuestas rápidas</p>
        </div>
        <button
          type="button"
          onClick={() => alert("Pendiente: aquí abriremos el creador de respuestas rápidas personalizadas.")}
          className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#bcebd0] bg-[#e9fff1] px-2 text-[11px] font-black text-[#008069] hover:bg-[#d9fdd3]"
          title="Crear respuesta rápida"
        >
          <Plus className="h-3.5 w-3.5" /> Crear
        </button>
      </div>
      <p className="mb-2 text-[11px] leading-4 text-[#60736b]">Elige una respuesta. Se coloca en el input para revisar antes de enviar.</p>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] px-3 text-left text-xs font-black text-[#52645d] shadow-sm hover:border-[#bcebd0] hover:bg-[#e9fff1] hover:text-[#008069]"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-12 z-50 max-h-72 overflow-y-auto rounded-2xl border border-[#dce8e2] bg-white p-2 shadow-[0_18px_38px_rgba(18,35,29,.16)]">
            {replies.map((reply) => (
              <button
                key={reply.label}
                type="button"
                onClick={() => {
                  insertMessage(reply.message);
                  setOpen(false);
                }}
                className="flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-[#f1f8f5]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-[#12231d]">{reply.label}</span>
                  <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#60736b]">{reply.message}</span>
                </span>
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#008069]" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>,
    slot,
  );
}
