import { MessageSquare } from "lucide-react";

export function WhatsappEmptyState({
  title = "Selecciona una conversación",
  subtitle = "Elige una conversación a la izquierda para ver los mensajes",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-muted/10">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
        <MessageSquare className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
