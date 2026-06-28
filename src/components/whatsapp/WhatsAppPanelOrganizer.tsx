import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Receipt,
  Send,
  StickyNote,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type PanelSnapshot = {
  name: string;
  subtitle: string;
  channel: string;
  state: string;
  activity: string;
  windowState: string;
  remaining: string;
  conversationId: string;
};

function emptySnapshot(): PanelSnapshot {
  return {
    name: "Selecciona un chat",
    subtitle: "Contexto CRM",
    channel: "canal",
    state: "estado",
    activity: "Última actividad de la conversación.",
    windowState: "—",
    remaining: "—",
    conversationId: "",
  };
}

function getRightAside() {
  const asides = Array.from(document.querySelectorAll<HTMLElement>("aside"));
  return asides.find((aside) => aside.textContent?.includes("Envío rápido") || aside.querySelector('a[href^="/tasks?conversationId="]')) || null;
}

function readSnapshot(aside: HTMLElement | null): PanelSnapshot {
  if (!aside) return emptySnapshot();
  const name = aside.querySelector("h3")?.textContent?.trim() || "Contacto";
  const subtitle = aside.querySelector("p")?.textContent?.trim() || "Conversación CRM";
  const chips = Array.from(aside.querySelectorAll("span"))
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean);
  const activity = Array.from(aside.querySelectorAll("p"))
    .map((node) => node.textContent?.trim() || "")
    .find((text) => text.toLowerCase().includes("últim")) || "Sin actividad reciente.";
  const taskLink = aside.querySelector<HTMLAnchorElement>('a[href^="/tasks?conversationId="]');
  const url = taskLink ? new URL(taskLink.href, window.location.origin) : null;

  return {
    name,
    subtitle,
    channel: chips[0] || "canal",
    state: chips[1] || "estado",
    activity,
    windowState: chips.find((chip) => ["abierta", "cerrada"].includes(chip.toLowerCase())) || "—",
    remaining: aside.textContent?.match(/Restante:\s*([^A\n]+)/)?.[1]?.trim() || "—",
    conversationId: url?.searchParams.get("conversationId") || "",
  };
}

export function WhatsAppPanelOrganizer() {
  const [aside, setAside] = useState<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState<PanelSnapshot>(emptySnapshot);

  useEffect(() => {
    function sync() {
      const nextAside = getRightAside();
      setAside(nextAside);
      setSnapshot(readSnapshot(nextAside));
      if (nextAside) {
        nextAside.style.position = "relative";
        nextAside.style.overflow = "hidden";
      }
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const taskHref = useMemo(() => `/tasks?conversationId=${encodeURIComponent(snapshot.conversationId)}`, [snapshot.conversationId]);
  const proposalHref = useMemo(() => `/proposals?conversationId=${encodeURIComponent(snapshot.conversationId)}`, [snapshot.conversationId]);
  const invoiceHref = useMemo(() => `/invoices?conversationId=${encodeURIComponent(snapshot.conversationId)}`, [snapshot.conversationId]);

  if (!aside) return null;

  return createPortal(
    <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-[#f9fcfa] p-3 text-[#12231d]">
      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d9fdd3] text-sm font-black text-[#008069]">
            {snapshot.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "C"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black">{snapshot.name}</h3>
            <p className="truncate text-[11px] text-[#6c7f77]">{snapshot.subtitle}</p>
            <div className="mt-2 flex gap-1.5">
              <span className="truncate rounded-full bg-[#edf6f2] px-2 py-1 text-[10px] font-bold text-[#52645d]">
                {snapshot.channel}
              </span>
              <span className="truncate rounded-full bg-[#d9fdd3] px-2 py-1 text-[10px] font-bold text-[#008069]">
                {snapshot.state}
              </span>
            </div>
          </div>
          <PanelIconButton title="Perfil" href="/clients" icon={<UserRound className="h-4 w-4" />} />
        </div>
      </div>

      <div className="mb-2 rounded-3xl border border-[#bcebd0] bg-[#e9fff1] p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#008069]">Guía rápida</p>
            <h4 className="text-base font-black">Qué hacer ahora</h4>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#00a884] text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <GuideStep icon={<Users className="h-3.5 w-3.5" />} label="Lead" active={snapshot.state.toLowerCase().includes("lead") || snapshot.state.toLowerCase().includes("open")} />
          <GuideStep icon={<FileText className="h-3.5 w-3.5" />} label="Cotizar" />
          <GuideStep icon={<Receipt className="h-3.5 w-3.5" />} label="Cobrar" />
        </div>
      </div>

      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black">Enviar al cliente</p>
          <Send className="h-4 w-4 text-[#00a884]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton title="Propuesta" href={proposalHref} icon={<FileText className="h-4 w-4" />} label="Propuesta" />
          <ActionButton title="Factura" href={invoiceHref} icon={<Receipt className="h-4 w-4" />} label="Factura" />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[#6c7f77]">
          Crea o abre documentos para copiarlos y enviarlos sin salir del chat.
        </p>
      </div>

      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black">Trabajo interno</p>
          <Clock3 className="h-4 w-4 text-[#00a884]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton title="Tarea" href={taskHref} icon={<Clock3 className="h-4 w-4" />} label="Tarea" />
          <button
            type="button"
            title="Nota"
            onClick={() => toast.info("Notas rápidas: pendiente conectar modal interno.")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] text-xs font-black text-[#52645d] hover:bg-[#edf6f2]"
          >
            <StickyNote className="h-4 w-4" />
            Nota
          </button>
        </div>
      </div>

      <div className="mb-2 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-black">Estado de atención</p>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${snapshot.windowState.toLowerCase() === "abierta" ? "bg-[#d9fdd3] text-[#008069]" : "bg-[#edf6f2] text-[#52645d]"}`}>
            {snapshot.windowState}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Metric icon={<CalendarClock className="h-3.5 w-3.5" />} label="Restante" value={snapshot.remaining} />
          <Metric icon={<Bot className="h-3.5 w-3.5" />} label="Bot" value="CRM" />
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-3xl border border-[#dce8e2] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00a884]" />
          <p className="text-sm font-black">Actividad</p>
        </div>
        <p className="line-clamp-4 text-[11px] leading-4 text-[#60736b]">{snapshot.activity}</p>
      </div>
    </div>,
    aside,
  );
}

function PanelIconButton({ href, title, icon }: { href: string; title: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      title={title}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dce8e2] bg-[#f7fbf9] text-[#52645d] hover:bg-[#edf6f2]"
    >
      {icon}
    </a>
  );
}

function GuideStep({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`rounded-2xl border px-2 py-2 text-center text-[10px] font-black ${active ? "border-[#a8e8c3] bg-white text-[#008069]" : "border-[#cfe2d9] bg-[#f7fbf9] text-[#52645d]"}`}>
      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#00a884]">{icon}</div>
      {label}
    </div>
  );
}

function ActionButton({ href, title, icon, label }: { href: string; title: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      title={title}
      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] text-xs font-black text-[#52645d] hover:bg-[#edf6f2]"
    >
      {icon}
      {label}
    </a>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7fbf9] p-2">
      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#00a884]">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8d86]">{label}</p>
      <p className="truncate text-xs font-black text-[#12231d]">{value || "—"}</p>
    </div>
  );
}
