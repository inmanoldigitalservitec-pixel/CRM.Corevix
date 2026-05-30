import { useState } from "react";
import { FileText, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  bodyText: string;
  isApproved: boolean;
}

const sampleTemplates: Template[] = [
  { id: "t1", name: "welcome_message", language: "en", category: "MARKETING", bodyText: "Hello {{1}}! Welcome to {{2}}. We're glad to have you. How can we help you today?", isApproved: true },
  { id: "t2", name: "appointment_reminder", language: "en", category: "UTILITY", bodyText: "Hi {{1}}, this is a reminder about your appointment on {{2}} at {{3}}. Reply YES to confirm or NO to reschedule.", isApproved: true },
  { id: "t3", name: "follow_up", language: "en", category: "MARKETING", bodyText: "Hi {{1}}, we wanted to follow up on our conversation about {{2}}. Do you have any questions? We'd love to help!", isApproved: true },
  { id: "t4", name: "invoice_notification", language: "en", category: "UTILITY", bodyText: "Hello {{1}}, your invoice #{{2}} for ${{3}} is now available. Due date: {{4}}. Please let us know if you have questions.", isApproved: true },
  { id: "t5", name: "thank_you", language: "en", category: "MARKETING", bodyText: "Thank you, {{1}}! We appreciate your business with {{2}}. Please don't hesitate to reach out anytime.", isApproved: true },
  { id: "t6", name: "promo_offer", language: "es", category: "MARKETING", bodyText: "¡Hola {{1}}! Tenemos una oferta especial para ti: {{2}}. Válido hasta {{3}}. ¡No te lo pierdas!", isApproved: false },
];

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ open, onClose, onSelect }: TemplateSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = sampleTemplates.filter(
    (t) => t.name.includes(search.toLowerCase()) || t.bodyText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Message Templates
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => { onSelect(t); onClose(); }}
                className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{t.name}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px] h-4">{t.language.toUpperCase()}</Badge>
                    <Badge variant={t.isApproved ? "default" : "secondary"} className="text-[9px] h-4">
                      {t.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.bodyText}</p>
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">{t.category}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
