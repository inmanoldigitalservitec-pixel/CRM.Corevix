import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/components/ai/AgentChat";

export const Route = createFileRoute("/ai-assistant")({
  component: AIAssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant — Corevix CRM" }] }),
});

function AIAssistantPage() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col bg-[#f7f9fc] p-4 text-[#111827] sm:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black tracking-tight">Corevix AI</h1>
        <p className="mt-1 text-sm font-semibold text-[#667085]">
          Chat conectado al agente local mediante el worker de Corevix.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <AgentChat />
      </div>
    </div>
  );
}
