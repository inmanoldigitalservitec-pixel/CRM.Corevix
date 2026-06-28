import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, Save, X } from "lucide-react";
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

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function readSelectedProjectTitle() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"] h2, [data-radix-dialog-title], [data-slot="sheet-title"], h2',
    ),
  );

  const title = candidates
    .map((node) => node.textContent?.trim() || "")
    .find((text) => Boolean(text) && !["Nueva tarea", "Nuevo proyecto", "Editar proyecto"].includes(text));

  return title || "";
}

function findTasksContainer() {
  return document.querySelector<HTMLElement>('[data-demo="projects-tasks"]');
}

function findTasksList(container: HTMLElement | null) {
  if (!container) return null;
  return Array.from(container.children).find((child) => child instanceof HTMLElement && child.className.includes("mt-3")) as HTMLElement | null;
}

export function InlineProjectTaskCreator() {
  const { profile, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: isoToday(),
    priority: "Medium",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function syncTarget() {
      const container = findTasksContainer();
      setTarget(findTasksList(container) || container);
    }

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleCreateTaskClick(event: MouseEvent) {
      const targetNode = event.target as HTMLElement | null;
      const button = targetNode?.closest("button");
      if (!button) return;
      const container = button.closest('[data-demo="projects-tasks"]');
      if (!container) return;
      const label = button.textContent?.trim().toLowerCase() || "";
      if (!label.includes("crear tarea")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setProjectTitle(readSelectedProjectTitle());
      setForm({ title: "", description: "", due_date: isoToday(), priority: "Medium" });
      setTarget(findTasksList(container as HTMLElement) || (container as HTMLElement));
      setOpen(true);
    }

    document.addEventListener("click", handleCreateTaskClick, true);
    return () => document.removeEventListener("click", handleCreateTaskClick, true);
  }, []);

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

    const title = projectTitle || readSelectedProjectTitle();
    if (!title) {
      toast.error("No se pudo identificar el proyecto seleccionado.");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const { data: projects, error: projectError } = await db
        .from("projects")
        .select("id, client_id, lead_id, deal_id, manager, name")
        .eq("company_id", profile.company_id)
        .eq("name", title)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (projectError) throw projectError;
      const project = Array.isArray(projects) ? projects[0] : null;
      if (!project?.id) {
        toast.error("No encontré ese proyecto en la base de datos.");
        return;
      }

      const { error: insertError } = await db.from("tasks").insert({
        company_id: profile.company_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: "To Do",
        priority: form.priority || "Medium",
        assigned_to: user?.id || profile.user_id || null,
        due_date: form.due_date || null,
        related_project_id: project.id,
        related_client_id: project.client_id || null,
        related_lead_id: project.lead_id || null,
        related_deal_id: project.deal_id || null,
      });

      if (insertError) throw insertError;

      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "task_created",
        entityType: "tasks",
        detail: `Tarea creada desde proyecto: ${form.title.trim()}`,
        metadata: {
          related_project_id: project.id,
          related_client_id: project.client_id || null,
          related_deal_id: project.deal_id || null,
        },
      }).catch(() => {});

      toast.success("Tarea creada");
      setOpen(false);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  if (!canRender || !target) return null;

  return createPortal(
    <form
      className="mb-2 rounded-xl border bg-background/70 p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Nueva tarea
        </div>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"
          onClick={() => setOpen(false)}
          disabled={saving}
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Input
          autoFocus
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Título de la tarea"
          className="h-9"
        />
        <Textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Descripción opcional"
          rows={2}
          className="min-h-[62px]"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
            className="h-9"
          />
          <Select
            value={form.priority}
            onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="h-9">
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
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving || !form.title.trim()} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </form>,
    target,
  );
}
