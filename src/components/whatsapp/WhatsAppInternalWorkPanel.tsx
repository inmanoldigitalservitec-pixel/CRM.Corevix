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
import { openGlobalTaskCreate } from "@/components/tasks/global-task-create-host";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
type Mode = "task" | "note";
type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
};
type NoteItem = { id: string; body: string; created_at: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTask() {
  return { title: "", description: "", due_date: today(), priority: "Medium" };
}

function keyOf(id: string) {
  return id || "__sin_conversacion__";
}

function slot() {
  return document.querySelector<HTMLElement>("[data-whatsapp-task-slot]");
}

function taskButton() {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href^="/tasks?conversationId="]'),
  );
  return (
    links.find((link) => (link.getAttribute("title") || "").toLowerCase() === "tarea") ||
    links[0] ||
    null
  );
}

function noteButton() {
  return document.querySelector<HTMLButtonElement>('button[title="Nota"]');
}

function panelTarget(button: HTMLElement | null) {
  const directSlot = slot();
  if (directSlot) return directSlot;
  const section = button?.closest("section");
  return section?.parentElement || section || null;
}

function conversationIdFromTaskButton() {
  const button = taskButton();
  if (!button) return "";
  try {
    return new URL(button.href, window.location.origin).searchParams.get("conversationId") || "";
  } catch {
    return "";
  }
}

function contactName() {
  const panel =
    slot()?.closest("aside") || taskButton()?.closest("aside") || noteButton()?.closest("aside");
  return panel?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "este contacto";
}

function taskFromRow(row: any): TaskItem {
  return {
    id: String(row?.id || crypto.randomUUID()),
    title: String(row?.title || "Tarea"),
    description: row?.description || null,
    due_date: row?.due_date || null,
    priority: row?.priority || "Medium",
  };
}

function noteFromRow(row: any): NoteItem {
  return {
    id: String(row?.id || crypto.randomUUID()),
    body: String(row?.body || row?.metadata?.note || row?.detail || "Nota interna"),
    created_at: row?.created_at || new Date().toISOString(),
  };
}

export function WhatsAppInternalWorkPanel() {
  const { profile, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("task");
  const [conversationId, setConversationId] = useState("");
  const [form, setForm] = useState(emptyTask);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasksByChat, setTasksByChat] = useState<Record<string, TaskItem[]>>({});
  const [notesByChat, setNotesByChat] = useState<Record<string, NoteItem[]>>({});

  const chatKey = keyOf(conversationId);
  const tasks = tasksByChat[chatKey] || [];
  const notes = notesByChat[chatKey] || [];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function openPanel(nextMode: Mode, id: string) {
      const nextId = id || conversationIdFromTaskButton();
      setConversationId(nextId);
      setMode(nextMode);
      setTarget(panelTarget(nextMode === "task" ? taskButton() : noteButton()));
      setForm(emptyTask());
      setNote("");
      setOpen(true);
    }

    function onClick(event: MouseEvent) {
      const node = event.target as HTMLElement | null;
      const task = node?.closest<HTMLAnchorElement>('a[href^="/tasks?conversationId="]');
      const noteAction = node?.closest<HTMLButtonElement>('button[title="Nota"]');
      if (!task && !noteAction) return;
      if (task && (task.getAttribute("title") || "").toLowerCase() !== "tarea") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (task) {
        openGlobalTaskCreate({
          initialValues: {
            title: "Seguimiento WhatsApp",
            description: "Tarea creada desde WhatsApp Web.",
          },
        });
      } else {
        openPanel("note", conversationIdFromTaskButton());
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!open || !profile?.company_id || !conversationId) return;
    let cancelled = false;
    const db = supabase as any;
    const k = keyOf(conversationId);

    async function load() {
      setLoading(true);
      try {
        let tasksResult = await db
          .from("tasks")
          .select("id,title,description,due_date,priority,created_at")
          .eq("company_id", profile!.company_id)
          .eq("whatsapp_conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(5);
        if (tasksResult.error) {
          tasksResult = await db
            .from("tasks")
            .select("id,title,description,due_date,priority,created_at")
            .eq("company_id", profile!.company_id)
            .ilike("description", `%Conversación: ${conversationId}%`)
            .order("created_at", { ascending: false })
            .limit(5);
        }
        if (!cancelled && !tasksResult.error)
          setTasksByChat((prev) => ({ ...prev, [k]: (tasksResult.data || []).map(taskFromRow) }));
      } catch {
        if (!cancelled) setTasksByChat((prev) => ({ ...prev, [k]: prev[k] || [] }));
      }

      try {
        const notesResult = await db
          .from("whatsapp_internal_notes")
          .select("id,body,created_at")
          .eq("company_id", profile!.company_id)
          .eq("whatsapp_conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!cancelled && !notesResult.error)
          setNotesByChat((prev) => ({ ...prev, [k]: (notesResult.data || []).map(noteFromRow) }));
      } catch {
        if (!cancelled) setNotesByChat((prev) => ({ ...prev, [k]: prev[k] || [] }));
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, profile?.company_id]);

  const canRender = useMemo(() => mounted && open && target, [mounted, open, target]);

  async function saveTask() {
    if (!profile?.company_id || !form.title.trim()) return;
    const marker = conversationId ? `Conversación: ${conversationId}` : "";
    const description = `${form.description.trim() || `Tarea creada desde WhatsApp para ${contactName()}.`}${marker ? `\n\n${marker}` : ""}`;
    const basePayload = {
      company_id: profile.company_id,
      title: form.title.trim(),
      description,
      status: "To Do",
      priority: form.priority || "Medium",
      assigned_to: user?.id || profile.user_id || null,
      due_date: form.due_date || null,
    };
    const relationalPayload = {
      ...basePayload,
      whatsapp_conversation_id: conversationId || null,
      whatsapp_channel: "whatsapp-web",
    };

    setSaving(true);
    try {
      const db = supabase as any;
      let result = await db
        .from("tasks")
        .insert(relationalPayload)
        .select("id,title,description,due_date,priority")
        .single();
      if (result.error)
        result = await db
          .from("tasks")
          .insert(basePayload)
          .select("id,title,description,due_date,priority")
          .single();
      if (result.error) throw result.error;
      const item = taskFromRow(result.data || basePayload);
      setTasksByChat((prev) => ({
        ...prev,
        [chatKey]: [item, ...(prev[chatKey] || [])].slice(0, 5),
      }));
      setForm(emptyTask());
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "task_created",
        entityType: "tasks",
        entityId: item.id,
        detail: `Tarea creada desde WhatsApp: ${basePayload.title}`,
        metadata: { source: "whatsapp-web", conversation_id: conversationId || null },
      }).catch(() => {});
      toast.success("Tarea creada para este chat.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    if (!profile?.company_id || !note.trim()) return;
    const body = note.trim();
    setSaving(true);
    try {
      const db = supabase as any;
      let item: NoteItem | null = null;
      const result = await db
        .from("whatsapp_internal_notes")
        .insert({
          company_id: profile.company_id,
          whatsapp_conversation_id: conversationId || null,
          whatsapp_channel: "whatsapp-web",
          body,
          created_by: user?.id || profile.user_id || null,
        })
        .select("id,body,created_at")
        .single();
      if (!result.error) item = noteFromRow(result.data);
      await logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "internal_note_created",
        entityType: "whatsapp_conversation",
        detail: `Nota interna en WhatsApp para ${contactName()}: ${body}`,
        metadata: { source: "whatsapp-web", conversation_id: conversationId || null, note: body },
        dedupeWindowSeconds: 0,
      });
      if (!item) item = { id: crypto.randomUUID(), body, created_at: new Date().toISOString() };
      setNotesByChat((prev) => ({
        ...prev,
        [chatKey]: [item!, ...(prev[chatKey] || [])].slice(0, 5),
      }));
      setNote("");
      toast.success("Nota interna guardada para este chat.");
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
          {mode === "task" ? (
            <Clock3 className="h-4 w-4 shrink-0 text-[#008069]" />
          ) : (
            <StickyNote className="h-4 w-4 shrink-0 text-[#008069]" />
          )}
          <span className="truncate">
            {mode === "task" ? "Crear tarea interna" : "Agregar nota interna"}
          </span>
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
        Esto es interno y pertenece solo a este chat. El cliente no lo verá.
      </p>
      {loading ? (
        <p className="mb-2 text-[11px] font-bold text-[#7b8d86]">Cargando historial interno...</p>
      ) : null}

      {mode === "task" && tasks.length ? (
        <div className="mb-2 space-y-1.5">
          {tasks.slice(0, 3).map((task) => (
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

      {mode === "note" && notes.length ? (
        <div className="mb-2 space-y-1.5">
          {notes.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-xl border border-[#cfe2d9] bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-bold text-[#12231d]">{item.body}</p>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00a884]" />
              </div>
              <p className="mt-0.5 text-[11px] text-[#7b8d86]">Nota interna</p>
            </div>
          ))}
        </div>
      ) : null}

      {mode === "task" ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveTask();
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-xl"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cerrar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]"
              disabled={saving || !form.title.trim()}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar"}
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNote();
          }}
        >
          <Textarea
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Escribe una nota para el equipo..."
            rows={4}
            className="min-h-[92px] rounded-xl border-[#dce8e2] bg-white text-sm"
          />
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-xl"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cerrar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 flex-1 rounded-xl bg-[#00a884] hover:bg-[#008f72]"
              disabled={saving || !note.trim()}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "..." : "Guardar nota"}
            </Button>
          </div>
        </form>
      )}
    </section>,
    target,
  );
}
