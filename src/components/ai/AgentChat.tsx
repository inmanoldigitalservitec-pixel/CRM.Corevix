import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { extractAgentReply, getAgentUrl, sendAgentMessage } from "@/lib/agentClient";

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = ["Qué debo hacer hoy", "Resume mis leads", "Tareas atrasadas", "Facturas por cobrar"];

export function AgentChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hola, soy Corevix AI. Escríbeme para probar la conexión con el agente." },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSend(raw = text) {
    const userText = raw.trim();
    if (!userText || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setText("");
    setLoading(true);
    try {
      const data = await sendAgentMessage(userText);
      setMessages((prev) => [...prev, { role: "assistant", content: extractAgentReply(data) }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error conectando con Corevix AI: ${error?.message || "No se pudo conectar."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-sm ${compact ? "" : "min-h-[620px]"}`}>
      <div className="border-b border-[#e6eaf0] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf5ff] text-[#1d62f9]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[#111827]">Corevix AI</h2>
            <p className="truncate text-xs font-semibold text-[#667085]">Agente conectado · {getAgentUrl()}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div key={index} className={isUser ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${isUser ? "bg-[#1d62f9] text-white" : "border border-[#e6eaf0] bg-white text-[#111827]"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[#e6eaf0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#667085] shadow-sm">
              <Sparkles className="h-4 w-4 animate-pulse text-[#1d62f9]" /> Pensando...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#e6eaf0] px-4 py-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STARTERS.map((starter) => (
            <button key={starter} type="button" onClick={() => handleSend(starter)} disabled={loading} className="shrink-0 rounded-full border border-[#dbe7ff] bg-white px-3 py-1.5 text-xs font-extrabold text-[#1d62f9] hover:bg-[#f0f6ff] disabled:opacity-50">
              {starter}
            </button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); handleSend(); }}>
          <input className="h-11 flex-1 rounded-2xl border border-[#e6eaf0] px-3 text-sm font-semibold text-[#111827] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#1d62f9]/30" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pregúntale algo a Corevix AI..." />
          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1d62f9] text-white shadow-[0_14px_26px_rgba(29,98,249,0.28)] disabled:opacity-50" type="submit" disabled={loading || !text.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
