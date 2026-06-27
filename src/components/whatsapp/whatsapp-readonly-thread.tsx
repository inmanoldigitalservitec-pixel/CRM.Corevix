import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Phone, Bot, Check, CheckCheck, Clock, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";
import { WhatsappStatusBadge } from "@/components/whatsapp/whatsapp-status-badge";
import { formatServiceWindowRemaining } from "@/lib/whatsapp/service-window";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(messages: CrmWhatsappMessageRow[]) {
  const groups: Array<{ day: string; items: CrmWhatsappMessageRow[] }> = [];
  let current = "";
  for (const m of messages) {
    const day = new Date(m.created_at).toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (day !== current) {
      current = day;
      groups.push({ day, items: [m] });
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }
  return groups;
}

export function WhatsappReadonlyThread({
  title,
  subtitle,
  status,
  botEnabled,
  messages,
  loading,
  error,
  emptyHint,
  className,
  onSendMessage,
  sending,
  sendError,
  isServiceWindowOpen,
  lastInboundAt,
  serviceWindowExpiresAt,
  remainingServiceWindowMs,
}: {
  title: string;
  subtitle?: string;
  status?: string | null;
  botEnabled?: boolean | null;
  messages: CrmWhatsappMessageRow[];
  loading: boolean;
  error: string | null;
  emptyHint?: string;
  className?: string;
  onSendMessage?: (content: string) => Promise<void>;
  sending?: boolean;
  sendError?: string | null;
  isServiceWindowOpen?: boolean;
  lastInboundAt?: string | null;
  serviceWindowExpiresAt?: string | null;
  remainingServiceWindowMs?: number;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");

  const groups = useMemo(() => groupByDay(messages), [messages]);
  const serviceWindowLabel = useMemo(
    () => formatServiceWindowRemaining(remainingServiceWindowMs || 0),
    [remainingServiceWindowMs],
  );
  const serviceWindowClosed = !isServiceWindowOpen;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [messages.length]);

  const deliveryIcon: Record<string, React.ReactNode> = {
    sent: <Check className="h-3 w-3 text-muted-foreground" />,
    delivered: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
    read: <CheckCheck className="h-3 w-3 text-primary" />,
    failed: <Clock className="h-3 w-3 text-destructive" />,
  };

  return (
    <section
      data-demo="whatsapp-active-thread"
      className={cn(
        "h-full min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#efeae2] border-r border-black/10",
        className,
      )}
    >
      <header className="shrink-0 h-[60px] bg-[#f0f2f5] border-b border-black/10 flex items-center justify-between px-4.5 gap-3 min-w-0 sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <WhatsappAvatar name={title} size={34} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.015em] truncate text-slate-900">
                {title}
              </div>
              <div className="hidden sm:block">
                <WhatsappStatusBadge status={status} className="h-[22px] px-2 text-[10px]" />
              </div>
            </div>
            {subtitle ? (
              <div className="text-[12px] text-slate-500 truncate flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{subtitle}</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 h-5 text-[10px] font-medium",
                    botEnabled === false
                      ? "bg-muted/30 text-muted-foreground border-border/60"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/15 dark:text-emerald-200 dark:border-emerald-800/40",
                  )}
                >
                  <Bot className="h-3 w-3" />
                  {botEnabled === false ? "Bot OFF" : "Bot ON"}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="h-9 w-9 rounded-full border-0 bg-transparent grid place-items-center text-slate-500 hover:bg-black/5">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 bg-[#efeae2] relative before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.38] before:bg-[radial-gradient(circle_at_12px_12px,rgba(120,113,108,0.22)_1.2px,transparent_1.3px),radial-gradient(circle_at_32px_28px,rgba(120,113,108,0.16)_1px,transparent_1.2px),linear-gradient(45deg,transparent_0_46%,rgba(120,113,108,0.12)_46%_47%,transparent_47%_100%)] before:[background-size:48px_48px,56px_56px,72px_72px]">
        <div className="relative z-10 h-full">
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando mensajes…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">{emptyHint || "No hay mensajes."}</div>
          ) : (
            <div className="max-w-[860px] mx-auto">
              {groups.map((g) => (
                <div key={g.day}>
                  <div className="flex justify-center my-4">
                    <span className="h-6 inline-flex items-center text-[11px] text-slate-500 bg-white/80 border border-black/5 rounded-full px-3 shadow-sm">
                      {g.day}
                    </span>
                  </div>
                  {g.items.map((m) => {
                    const out = (m.direction || "") === "outbound";
                    const content =
                      m.content ||
                      (m.message_type === "interactive_button" ? m.button_title : null) ||
                      "";
                    const statusKey = String(m.delivery_status ?? "").toLowerCase();
                    return (
                      <div
                        key={m.message_id}
                        className={cn("flex mb-2", out ? "justify-end" : "justify-start")}
                      >
                        <div className="max-w-[min(560px,76%)]">
                          <div
                            className={cn(
                              "relative rounded-[9px] px-3.5 py-2.5 pb-5 text-[13.5px] leading-[1.38] tracking-[-0.012em] shadow-[0_1px_1px_rgba(0,0,0,0.10)]",
                              out
                                ? "bg-[#d9fdd3] text-slate-900 border-transparent rounded-br-[3px]"
                                : "bg-white text-slate-900 border-transparent rounded-bl-[3px]",
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">{content}</div>
                            <div className="absolute right-2.5 bottom-1 text-[10px] text-slate-400 inline-flex items-center gap-1">
                              <span>{formatTime(m.created_at)}</span>
                              {out && m.delivery_status ? (deliveryIcon[statusKey] ?? null) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 bg-[#f0f2f5] border-t border-black/10 px-5 py-3.5">
        <div className="max-w-[860px] mx-auto flex items-end gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {!serviceWindowClosed ? (
              <div
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800 w-fit shadow-sm"
                title={
                  serviceWindowExpiresAt
                    ? `Expira ${new Date(serviceWindowExpiresAt).toLocaleString()}`
                    : undefined
                }
              >
                Ventana activa: puedes responder libremente. Quedan {serviceWindowLabel}.
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 min-h-11 max-h-28 resize-none rounded-full border-0 bg-white px-4.5 py-3 text-[13.5px] leading-[1.25] outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-white/60 shadow-sm placeholder:text-slate-400"
                placeholder={
                  serviceWindowClosed
                    ? "Usa una plantilla aprobada para continuar esta conversación."
                    : "Escribe una respuesta…"
                }
                value={text}
                disabled={!onSendMessage || Boolean(sending) || serviceWindowClosed}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter") return;
                  if (e.shiftKey) return;
                  e.preventDefault();
                  if (serviceWindowClosed) return;
                  if (!onSendMessage) return;
                  const trimmed = text.trim();
                  if (!trimmed || sending) return;
                  try {
                    await onSendMessage(trimmed);
                    setText("");
                  } catch {
                    // Keep input as-is on failure.
                  }
                }}
              />
              <button
                type="button"
                className={cn(
                  "h-11 w-11 rounded-full bg-emerald-500 text-white grid place-items-center transition-colors hover:bg-emerald-600 shadow-sm",
                  !onSendMessage ||
                    Boolean(sending) ||
                    serviceWindowClosed ||
                    text.trim().length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "opacity-100",
                )}
                disabled={
                  !onSendMessage ||
                  Boolean(sending) ||
                  serviceWindowClosed ||
                  text.trim().length === 0
                }
                onClick={async () => {
                  if (serviceWindowClosed) return;
                  if (!onSendMessage) return;
                  const trimmed = text.trim();
                  if (!trimmed || sending) return;
                  try {
                    await onSendMessage(trimmed);
                    setText("");
                  } catch {
                    // Keep input as-is on failure.
                  }
                }}
                title={
                  serviceWindowClosed
                    ? "La ventana de WhatsApp está cerrada"
                    : !onSendMessage
                      ? "Selecciona una conversación"
                      : sending
                        ? "Enviando…"
                        : "Enviar"
                }
              >
                {sending ? (
                  <span className="text-[12px]">…</span>
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        {sendError ? (
          <div
            className="mt-2 max-w-[860px] mx-auto text-[11px] text-destructive truncate"
            title={sendError}
          >
            {sendError}
          </div>
        ) : null}
      </footer>
    </section>
  );
}
