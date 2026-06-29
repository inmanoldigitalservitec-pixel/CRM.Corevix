import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/components/ai/AgentChat";
import "@/components/ai/AgenticDashboardInput.css";
import "@/components/ai/AgenticDashboardWidgets.css";

export const Route = createFileRoute("/ai-assistant")({
  component: AIAssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant — Corevix CRM" }] }),
});

function AIAssistantPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-[#fbfdff] text-[#111827]">
      <AgentChat fullscreen />
    </div>
  );
}
