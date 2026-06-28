import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Save, StickyNote, X } from "lucide-react";
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

type PanelMode = "task" | "note";

type CreatedTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
};

type CreatedNote = {
  id: string;
  body: string;
  created_at: string;
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

function findTaskSlot() {
  return document.querySelector<HTMLElement>("[data-whatsapp-task-slot]");
}

function findWhatsappPanelTaskButton() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/tasks?conversationId="]'));
  return links.find((link) => (link.getAttribute("title") || "").toLowerCase() === "tarea") || links[0] || null;
}

function findWhatsappPanelNoteButton() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[title="Nota"]'));
  return buttons[0] || null;
}

function findPanelTarget(button: HTMLElement | null) {
  const slot = findTaskSlot();
  if (slot) return slot;
  if (!button) return null;
  const section = button.closest("section");
  return section?.parentElement || section || null;
}

function readConversationName() {
  const panel = findTaskSlot()?.closest("aside") || findWhatsappPanelTaskButton()?.closest("aside") || findWhatsappPanelNoteButton()?.closest("aside");
  const heading = panel?.querySelector<HTMLElement>("h3");
  return heading?.textContent?.trim() || "este contacto";
}

function readConversationIdFromPanel() {
  const link = findWhatsappPanelTaskButton();
  if (!link) return "";
  try {
    const url = new URL(link.href, window.location.origin);
    return url.searchParams.get("conversationId") || "";
  } catch {
    return "";
  }
}

export function WhatsAppInlineTaskCreator() {
  const { profile, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>("task");
  const [saving, setSaving] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<CreatedTask[]>([]);
  const [createdNotes, setCreatedNotes] = useState<CreatedNote[]>([]);
  const [form, setForm] = useState(emptyTaskForm);
  const [noteBody, setNoteBody] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function openPanel(nextMode: PanelMode, nextConversationId: string) {
      setConversationId(nextConversationId || readConversationIdFromPanel() || "");
      setTarget(findTaskSlot() || findPanelTarget(nextMode === "task" ? findWhatsappPanelTaskButton() : findWhatsappPanelNoteButton()));
      setMode(nextMode);
      setForm(emptyTaskForm());
      setNoteBody("");
      setOpen(true);
    }

    function handleTaskClick(event: MouseEvent) {
      const targetNode = event.target as HTMLElement | null;
      const link = targetNode?.closest<HTMLAnchorElement>('a[href^="/tasks?conversationId="]');
      if (!link) return;
      if ((link.getAttribute("title") || "").toLowerCase() !== "tarea") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const url = new URL(link.href, window.location.origin);
      openPanel("task", url.searchParams.get("conversationId") || "");
    }

    function handleNoteClick(event: MouseEvent) {
      const targetNode = event.target as HTMLElement | null;
      const button = targetNode?.closest<HTMLButtonElement>('button[title="Nota"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openPanel("note", readConversationIdFromPanel());
    }

    function handleOrganizedPanelTask(event: Event) {
      const detail = (event as CustomEvent<{ conversationId?: string }>).detail;
      openPanel("task", detail?.conversationId || "");
    }

    document.addEventListener("click", handleTaskClick, true);
    document.addEventListener("click", handleNoteClick, true);
    window.addEventListener("corevix:whatsapp-open-task", handleOrganizedPanelTask);
    return () => {
      document.removeEventListener("click", handleTaskClick, true);
      document.removeEventListener("click", handleNoteClick, true);
      window.removeEventListener("corevix:whatsapp-open-task", handleOrganizedPanelTask);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const observer = new MutationObserver(() => {
      const nextTarget = findTaskSlot() || findPanelTarget(mode === "task" ? findWhatsappPanelTaskButton() : findWhatsappPanelNoteButton());
      if (nextTarget) setTarget(nextTarget);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open, mode]);

  const canRender = useMemo(() => mounted && open && target, [mounted, open, target]);

  async function handleSaveTask() {
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
        entityId: visibleTask.id,
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

  async function handleSaveNote() {
    if (!profile?.company_id) {
      toast.error("No se encontró la compañía activa.");
      return;
    }
    const cleanNote = noteBody.trim();
    if (!cleanNote) {
      toast.error("Escribe una nota interna");
      return;
    }

    const contactName = readConversationName();
    setSaving(true);
    try {
      await logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "internal_note_created",
        entityType: "whatsapp_conversation",
        detail: `Nota interna en WhatsApp para ${contactName}: ${cleanNote}`,
        metadata: {
          source: "whatsapp-web",
          conversation_id: conversationId || null,
          note: cleanNote,
        },
        dedupeWindowSeconds: 0,
      });

      setCreatedNotes((prev) => [
        { id: crypto.randomUUID(), body: cleanNote, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setNoteBody("");
      toast.success("Nota interna guardada.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar la nota");
    } finally {
      setSaving(false);
    }
  }

  if (!canRender || !target) return null;

  return createPortal(
    <section className="rounded-2xl border border-[#bcebd0] bg-[#f0fff6] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[#12231d]">
          {mode === "task" ? <Clock3 className="h-4 w-4 shrink-0 text-[#008069]" /> : <StickyNote className="h-4 w-4 shrink-0 text-[#008069]" />}
          <span className="truncate">{mode === "task" ? "Crear tarea interna" : "Agregar nota interna"}</span>
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

      <p className="mb-2 rounded-xl bg-white/80 px-3 py-2 text-[11px] leading-4 text-[#60736b]">
        Esto es interno. El cliente no verá estas tareas ni notas.
      </p>

      {mode === "task" && createdTasks.length ? (
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

      {mode === "note" && createdNotes.length ? (
        <div className="mb-2 space-y-1.5">
          {createdNotes.slice(0, 2).map((note) => (
            <div key={note.id} className="rounded-xl border border-[#cfe2d9] bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-bold text-[#12231d]">{note.body}</p>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" />
              </div>
              <p className="mt-0.5 text-[11px] text-[#7b8d86]">Guardada ahora</p>
            </div>
          ))}
        </div>
      ) : null}

      {mode === "task" ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveTask();
          }}
        >
          <Input
            autoFocus
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Título de la tarea"
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
      ) : (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveNote();
          }}
        >
          <Textarea
            autoFocus
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Escribe una nota para el equipo..."
            rows={4}
            className="min-h-[92px] rounded-xl border-[#dce8e2] bg-white text-sm"
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => setOpen(false)} disabled={saving}>
              Cerrar
            </Button>
            <Button type="submit" size="sm" className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]" disabled={saving || !noteBody.trim()}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar nota"}
            </Button>
          </div>
        </form>
      )}
    </section>,
    target,
  );
}
