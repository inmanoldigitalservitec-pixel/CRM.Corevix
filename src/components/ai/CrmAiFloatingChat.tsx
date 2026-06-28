import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const QUICK_CHIPS: string[] = [
  "¿Qué debo hacer hoy?",
  "Leads sin seguimiento",
  "Facturas por cobrar",
  "Tareas atrasadas",
  "Resumen del pipeline",
  "Proyectos activos",
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function escapeText(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderInline(text: string) {
  const parts: Array<{ type: "text" | "code"; value: string }> = [];
  const chunks = text.split("`");
  for (let i = 0; i < chunks.length; i++) {
    const value = chunks[i] ?? "";
    parts.push({ type: i % 2 === 1 ? "code" : "text", value });
  }

  return parts.map((p, idx) => {
    if (p.type === "code") {
      return (
        <code
          key={idx}
          className="rounded-md bg-[#eef2f6] px-1.5 py-0.5 text-[12px] font-semibold text-[#111827]"
        >
          {p.value}
        </code>
      );
    }
    return <span key={idx}>{p.value}</span>;
  });
}

function renderBasicMarkdown(text: string) {
  const blocks = text.split("```");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const chunk = blocks[i] ?? "";
    const isCode = i % 2 === 1;
    if (isCode) {
      nodes.push(
        <pre
          key={`code_${i}`}
          className="mt-2 overflow-auto rounded-xl border border-[#e6eaf0] bg-[#0b1220] p-3 text-[12px] text-white"
        >
          <code>{chunk.replace(/^\w+\n/, "")}</code>
        </pre>,
      );
      continue;
    }

    const lines = chunk.split("\n");
    let listBuffer: string[] = [];
    const flushList = (key: string) => {
      if (listBuffer.length === 0) return;
      nodes.push(
        <ul
          key={key}
          className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[#111827]"
        >
          {listBuffer.map((li, idx) => (
            <li key={idx}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      listBuffer = [];
    };

    lines.forEach((rawLine, lineIdx) => {
      const line = rawLine ?? "";
      const m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m) {
        listBuffer.push(m[1] || "");
        return;
      }
      flushList(`list_${i}_${lineIdx}`);

      const safe = escapeText(line);
      const withBold = safe.split("**");
      const rendered: React.ReactNode[] = [];
      for (let bi = 0; bi < withBold.length; bi++) {
        const seg = withBold[bi] ?? "";
        const content = renderInline(seg);
        if (bi % 2 === 1) rendered.push(<strong key={`b_${bi}`}>{content}</strong>);
        else rendered.push(<span key={`b_${bi}`}>{content}</span>);
      }

      nodes.push(
        <p
          key={`p_${i}_${lineIdx}`}
          className={line.trim() ? "text-[13px] leading-relaxed text-[#111827]" : "h-2"}
        >
          {rendered}
        </p>,
      );
    });

    flushList(`list_${i}_end`);
  }

  return <div className="space-y-1">{nodes}</div>;
}

async function readInvokeError(
  err: unknown,
): Promise<{ message: string; isGeminiNotConfigured: boolean }> {
  const fallback = {
    message: "No se pudo procesar tu solicitud. Intenta de nuevo.",
    isGeminiNotConfigured: false,
  };
  if (!err || typeof err !== "object") return fallback;

  const anyErr = err as any;
  const baseMessage = typeof anyErr.message === "string" ? anyErr.message : "";

  const response: Response | undefined = anyErr.context;
  if (!response || typeof response !== "object" || typeof (response as any).text !== "function") {
    const msg = baseMessage || fallback.message;
    const notConfigured = /gemini|gemini_settings|not configured|no configurad/i.test(msg);
    return { message: msg, isGeminiNotConfigured: notConfigured };
  }

  try {
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json().catch(() => null);
      const msgFromJson =
        (json &&
          (json.error ||
            json.message ||
            json.detail ||
            json?.data?.error ||
            json?.data?.message)) ||
        baseMessage ||
        fallback.message;
      const msg = typeof msgFromJson === "string" ? msgFromJson : JSON.stringify(msgFromJson);
      const notConfigured =
        /gemini|gemini_settings|not configured|no configurad/i.test(msg) ||
        json?.code === "gemini_not_configured";
      return { message: msg, isGeminiNotConfigured: Boolean(notConfigured) };
    }

    const text = await response.text().catch(() => "");
    const msg = text || baseMessage || fallback.message;
    const notConfigured = /gemini|gemini_settings|not configured|no configurad/i.test(msg);
    return { message: msg, isGeminiNotConfigured: notConfigured };
  } catch {
    const msg = baseMessage || fallback.message;
    const notConfigured = /gemini|gemini_settings|not configured|no configurad/i.test(msg);
    return { message: msg, isGeminiNotConfigured: notConfigured };
  }
}

export function CrmAiFloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const greeting = useMemo<ChatMessage>(
    () => ({
      id: "greeting",
      role: "assistant",
      content:
        "Hola, soy tu asistente del CRM. Puedo ayudarte a revisar leads, oportunidades, facturas, tareas y próximos pasos.",
    }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    if (!hasOpenedOnce) {
      setHasOpenedOnce(true);
      setMessages((prev) => (prev.length > 0 ? prev : [greeting]));
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, hasOpenedOnce, greeting]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const sendMessage = async (raw: string) => {
    const content = raw.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: uid("user"), role: "user", content };
    const loadingMsg: ChatMessage = {
      id: "loading",
      role: "assistant",
      content: "Analizando CRM...",
    };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("crm-ai-assistant", {
        body: { message: content },
      });

      if (error) {
        const parsed = await readInvokeError(error);
        const friendly = parsed.isGeminiNotConfigured
          ? "Gemini no está configurado. Ve a Settings > AI / Gemini."
          : parsed.message;
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== "loading")
            .concat([{ id: uid("assistant"), role: "assistant", content: friendly }]),
        );
        return;
      }

      const reply =
        typeof data === "string"
          ? data
          : (data && (data.reply || data.response || data.message || data.content)) ||
            JSON.stringify(data ?? "");

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "loading")
          .concat([{ id: uid("assistant"), role: "assistant", content: String(reply || "") }]),
      );
    } catch (err) {
      const parsed = await readInvokeError(err);
      const friendly = parsed.isGeminiNotConfigured
        ? "Gemini no está configurado. Ve a Settings > AI / Gemini."
        : parsed.message;
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "loading")
          .concat([{ id: uid("assistant"), role: "assistant", content: friendly }]),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-2xl bg-[#1d62f9] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_18px_45px_rgba(29,98,249,0.35)] hover:opacity-95"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
      >
        <Sparkles className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">AI</span>
      </button>

      {open && (
        <div
          className="fixed z-[70] inset-x-4 bottom-4 top-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:left-auto sm:h-[620px] sm:w-[420px] sm:max-h-[calc(100vh-120px)]"
          role="dialog"
          aria-label="Chat con asistente del CRM"
        >
          <div className="h-full w-full rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e6eaf0] bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-[#edf5ff] text-[#1d62f9] grid place-items-center shrink-0">
                    <Bot className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-extrabold tracking-[-0.02em] text-[#111827] truncate">
                      Asistente Corevix
                    </div>
                    <div className="mt-0.5 text-[12px] font-semibold text-[#667085] truncate">
                      Pregunta sobre leads, ventas, tareas o proyectos
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-xl border border-[#e6eaf0] bg-white grid place-items-center text-[#667085] hover:bg-[#f9fafc]"
                  aria-label="Cerrar"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-auto bg-[#fbfcfe] px-4 py-4 space-y-3">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm " +
                        (isUser
                          ? "bg-[#1d62f9] text-white"
                          : "bg-white border border-[#e6eaf0] text-[#111827]")
                      }
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        <div className="whitespace-pre-wrap">{renderBasicMarkdown(m.content)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#e6eaf0] bg-white px-4 py-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_CHIPS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-[#dbe7ff] bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#1d62f9] hover:bg-[#f0f6ff]"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu pregunta…"
                  className="flex-1 h-11 rounded-2xl border border-[#e6eaf0] bg-white px-3 text-[13px] font-semibold text-[#111827] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#1d62f9]/30"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="h-11 w-11 rounded-2xl bg-[#1d62f9] text-white grid place-items-center shadow-[0_14px_26px_rgba(29,98,249,0.28)] disabled:opacity-50"
                  aria-label="Enviar"
                >
                  <Send className="h-[18px] w-[18px]" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
