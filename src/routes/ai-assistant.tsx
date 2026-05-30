import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai-assistant")({
  component: AIAssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant — Corevix CRM" }] }),
});

function AIAssistantPage() {
  const features = [
    "Summarize client history",
    "Draft WhatsApp replies",
    "Draft email replies",
    "Generate proposal text",
    "Suggest next follow-up",
    "Score lead quality",
    "Summarize project status",
    "Generate sales call notes",
    "Convert conversation into task",
    "Create follow-up recommendations",
  ];

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1><p className="text-sm text-muted-foreground">AI-powered features to boost productivity</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(f => (
          <Card key={f} className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">{f}</span>
            <Button variant="outline" size="sm" className="text-xs">Coming Soon</Button>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
