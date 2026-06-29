import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/components/ai/AgentChat";

export const Route = createFileRoute("/ai-assistant")({
  component: AIAssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant - Corevix CRM" }] }),
});

function AIAssistantPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden bg-white text-[#111827]">
      <AgentChat fullscreen />
    </div>
  );
}
