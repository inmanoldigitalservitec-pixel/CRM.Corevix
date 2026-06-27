import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, MessageCircle, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaMessageRow } from "@/lib/meta/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resolveMessageStamp(message: MetaMessageRow) {
  return message.sent_at || message.created_at;
}

function groupByDay(messages: MetaMessageRow[]) {
  const groups: Array<{ day: string; items: MetaMessageRow[] }> = [];
  let current = "";
  for (const m of messages) {
    const stamp = resolveMessageStamp(m);
    const day = new Date(stamp).toLocaleDateString([], {
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

export function MessengerReadonlyThread({
  title,
  subtitle,
  status,
  avatarUrl,
  messages,
  loading,
  error,
  emptyHint,
  onSendMessage,
  sending,
  className,
}: {
  title: string;
  subtitle?: string;
  status?: string | null;
  avatarUrl?: string | null;
  messages: MetaMessageRow[];
  loading: boolean;
  error: string | null;
  emptyHint?: string;
  onSendMessage?: (content: string) => Promise<void>;
  sending?: boolean;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");

  const groups = useMemo(() => groupByDay(messages), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [messages.length]);

  return (
    <section
      data-demo="messenger-active-thread"
      className={cn(
        "h-full min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#efeae2] border-r border-black/10",
        className,
      )}
    >
      <header className="shrink-0 h-[60px] bg-[#f0f2f5] border-b border-black/10 flex items-center justify-between px-4.5 gap-3 min-w-0 sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <WhatsappAvatar name={title} imageUrl={avatarUrl || null} size={34} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.015em] truncate text-slate-900">
                {title}
              </div>
              <span className="inline-flex items-center h-[22px] px-2 rounded-full border text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                Messenger
              </span>
            </div>
            {subtitle ? (
              <div className="text-[12px] text-slate-500 truncate flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{subtitle}</span>
                {status ? (
                  <>
                    <span className="mx-1 text-muted-foreground/50">·</span>
                    <span>{status}</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-8 bg-[#efeae2] relative before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.38] before:bg-[radial-gradient(circle_at_12px_12px,rgba(120,113,108,0.22)_1.2px,transparent_1.3px),radial-gradient(circle_at_32px_28px,rgba(120,113,108,0.16)_1px,transparent_1.2px),linear-gradient(45deg,transparent_0_46%,rgba(120,113,108,0.12)_46%_47%,transparent_47%_100%)] before:[background-size:48px_48px,56px_56px,72px_72px]">
        <div className="relative z-10 h-full">
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando mensajes de Messenger…</div>
          ) : error ? (
            <div className="text-sm text-destructive">
              No se pudieron cargar los mensajes de Messenger.
            </div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {emptyHint || "Sin mensajes todavía."}
            </div>
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
                    const out = m.direction === "outbound";
                    const text = m.text || "";
                    const attachmentsCount = Array.isArray(m.attachments)
                      ? m.attachments.length
                      : 0;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex mb-2", out ? "justify-end" : "justify-start")}
                      >
                        <div className="max-w-[min(560px,76%)]">
                          <div
                            className={cn(
                              "relative rounded-[9px] px-3.5 py-2.5 pb-6 text-[13.5px] leading-[1.38] tracking-[-0.012em] shadow-[0_1px_1px_rgba(0,0,0,0.10)]",
                              out
                                ? "bg-[#d9fdd3] text-slate-900 border-transparent rounded-br-[3px]"
                                : "bg-white text-slate-900 border-transparent rounded-bl-[3px]",
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">
                              {text || "Mensaje con adjuntos"}
                            </div>
                            {attachmentsCount > 0 ? (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                <Paperclip className="h-3 w-3" />
                                <span>
                                  {attachmentsCount} adjunto{attachmentsCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            ) : null}
                            <div className="absolute right-2.5 bottom-1 text-[10px] text-slate-400">
                              {formatTime(resolveMessageStamp(m))}
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
          <textarea
            className="flex-1 min-h-11 max-h-28 resize-none rounded-full border-0 bg-white px-4.5 py-3 text-[13.5px] leading-[1.25] outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-white/60 shadow-sm placeholder:text-slate-400"
            placeholder="Escribe una respuesta por Messenger…"
            value={text}
            disabled={!onSendMessage || Boolean(sending)}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              if (e.shiftKey) return;
              e.preventDefault();
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
              "h-11 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center gap-2 px-4 transition-colors hover:bg-emerald-600 shadow-sm",
              !onSendMessage || Boolean(sending) || text.trim().length === 0
                ? "opacity-50 cursor-not-allowed"
                : "opacity-100",
            )}
            disabled={!onSendMessage || Boolean(sending) || text.trim().length === 0}
            onClick={async () => {
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
              !onSendMessage ? "Selecciona una conversación" : sending ? "Enviando…" : "Enviar"
            }
          >
            {sending ? (
              <span className="text-[12px]">Enviando…</span>
            ) : (
              <span className="text-[12px] font-semibold">Enviar</span>
            )}
            {sending ? null : <SendHorizontal className="h-4 w-4" />}
          </button>
        </div>
      </footer>
    </section>
  );
}
