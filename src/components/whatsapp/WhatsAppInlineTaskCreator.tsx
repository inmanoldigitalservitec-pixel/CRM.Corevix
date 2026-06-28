import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

type CreatedTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTaskForm() {
  return {
    title: "",
    description: "",
    due_date: isoToday(),
    priority: "Medium",
  };
}

function findWhatsappPanelTaskButton() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/tasks?conversationId="]'));
  return links.find((link) => (link.getAttribute("title") || "").toLowerCase() === "tarea") || links[0] || null;
}

function findPanelTarget(button: HTMLElement | null) {
  if (!button) return null;
  const section = button.closest("section");
  return section?.parentElement || section || null;
}

function readConversationName() {
  const panel = findWhatsappPanelTaskButton()?.closest("aside");
  const heading = panel?.querySelector<HTMLElement>("h3");
  return heading?.textContent?.trim() || "este contacto";
}

export function WhatsAppInlineTaskCreator() {
  const { profile, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<CreatedTask[]>([]);
  const [form, setForm] = useState(emptyTaskForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleTaskClick(event: MouseEvent) {
      const targetNode = event.target as HTMLElement | null;
      const link = targetNode?.closest<HTMLAnchorElement>('a[href^="/tasks?conversationId="]');
      if (!link) return;
      if ((link.getAttribute("title") || "").toLowerCase() !== "tarea") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const url = new URL(link.href, window.location.origin);
      setConversationId(url.searchParams.get("conversationId") || "");
      setTarget(findPanelTarget(link));
      setForm(emptyTaskForm());
      setCreatedTasks([]);
      setOpen(true);
    }

    document.addEventListener("click", handleTaskClick, true);
    return () => document.removeEventListener("click", handleTaskClick, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const observer = new MutationObserver(() => {
      const button = findWhatsappPanelTaskButton();
      const nextTarget = findPanelTarget(button);
      if (nextTarget) setTarget(nextTarget);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  const canRender = useMemo(() => mounted && open && target, [mounted, open, target]);

  async function handleSave() {
    if (!profile?.company_id) {
      toast.error("No se encontró la compañía activa.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    const contactName = readConversationName();
    const payload = {
      company_id: profile.company_id,
      title: form.title.trim(),
      description:
        form.description.trim() ||
        (conversationId ? `Tarea creada desde WhatsApp para ${contactName}. Conversación: ${conversationId}` : null),
      status: "To Do",
      priority: form.priority || "Medium",
      assigned_to: user?.id || profile.user_id || null,
      due_date: form.due_date || null,
    };

    setSaving(true);
    try {
      const db = supabase as any;
      const { data: inserted, error } = await db
        .from("tasks")
        .insert(payload)
        .select("id,title,description,due_date,priority")
        .single();

      if (error) throw error;

      const visibleTask: CreatedTask = {
        id: inserted?.id || crypto.randomUUID(),
        title: inserted?.title || payload.title,
        description: inserted?.description || payload.description,
        due_date: inserted?.due_date || payload.due_date,
        priority: inserted?.priority || payload.priority,
      };

      setCreatedTasks((prev) => [visibleTask, ...prev]);
      setForm(emptyTaskForm());

      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "task_created",
        entityType: "tasks",
        detail: `Tarea creada desde WhatsApp: ${payload.title}`,
        metadata: {
          source: "whatsapp-web",
          conversation_id: conversationId || null,
        },
      }).catch(() => {});

      toast.success("Tarea creada desde WhatsApp. Puedes crear otra.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  if (!canRender || !target) return null;

  return createPortal(
    <section className="rounded-2xl border border-[#bcebd0] bg-[#f0fff6] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-[#12231d]">
          <Clock3 className="h-4 w-4 text-[#008069]" />
          Nueva tarea
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-xl border border-[#cfe2d9] bg-white text-[#52645d] hover:bg-[#f7fbf9]"
          title="Cerrar"
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {createdTasks.length ? (
        <div className="mb-2 space-y-1.5">
          {createdTasks.slice(0, 2).map((task) => (
            <div key={task.id} className="rounded-xl border border-[#cfe2d9] bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-[#12231d]">{task.title}</p>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[#7b8d86]">
                To Do · {task.priority} · {task.due_date || "Sin fecha"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <Input
          autoFocus
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Título"
          className="h-9 rounded-xl border-[#dce8e2] bg-white text-sm"
        />
        <Textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Descripción opcional"
          rows={2}
          className="min-h-[58px] rounded-xl border-[#dce8e2] bg-white text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
            className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs"
          />
          <Select
            value={form.priority}
            onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="h-9 rounded-xl border-[#dce8e2] bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>
            Cerrar
          </Button>
          <Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !form.title.trim()}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar"}
          </Button>
        </div>
      </form>
    </section>,
    target,
  );
}
