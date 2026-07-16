import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import {
  defaultMilestoneFormValues,
  ProjectMilestoneForm,
  type ProjectMilestoneDraft,
  type ProjectMilestoneFormValues,
} from "@/components/projects/project-milestone-form";
import {
  ProjectMilestoneList,
  type ProjectMilestoneRow,
} from "@/components/projects/project-milestone-list";

function formatProjectWindow(startDate: string | null | undefined, dueDate: string | null | undefined) {
  if (!startDate && !dueDate) return null;
  const start = startDate || "sin inicio";
  const end = dueDate || "sin entrega";
  return `Ventana del proyecto: ${start} → ${end}`;
}

function toDraft(milestone: ProjectMilestoneRow): ProjectMilestoneDraft {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description || "",
    target_date: milestone.target_date || "",
    status: milestone.status,
    progress_pct: String(milestone.progress_pct ?? 0),
  };
}

export function ProjectMilestonesPanel({
  projectId,
  canEdit,
  projectStartDate,
  projectDueDate,
}: {
  projectId: string;
  canEdit: boolean;
  projectStartDate: string | null;
  projectDueDate: string | null;
}) {
  const { profile } = useAuth();
  const [milestones, setMilestones] = useState<ProjectMilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneDraft | null>(null);

  const projectWindowLabel = useMemo(
    () => formatProjectWindow(projectStartDate, projectDueDate),
    [projectDueDate, projectStartDate],
  );

  const loadMilestones = useCallback(async () => {
    if (!profile?.company_id) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("project_milestones")
      .select("id,title,description,target_date,status,progress_pct,sort_order,created_at,updated_at")
      .eq("company_id", profile.company_id)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los hitos del proyecto.");
      setLoading(false);
      return;
    }

    setMilestones((data || []) as ProjectMilestoneRow[]);
    setLoading(false);
  }, [profile?.company_id, projectId]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const milestoneCountLabel = useMemo(() => {
    if (!milestones.length) return "Sin hitos";
    if (milestones.length === 1) return "1 hito";
    return `${milestones.length} hitos`;
  }, [milestones.length]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return milestones.filter((milestone) => {
      if (!milestone.target_date) return false;
      if (milestone.status === "completed" || milestone.status === "cancelled") return false;
      return new Date(`${milestone.target_date}T00:00:00`).getTime() < today.getTime();
    }).length;
  }, [milestones]);

  async function handleCreate(values: ProjectMilestoneFormValues) {
    if (!profile?.company_id) {
      toast.error("No se pudo identificar tu compañía.");
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any).from("project_milestones").insert({
      company_id: profile.company_id,
      project_id: projectId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      target_date: values.target_date || null,
      status: values.status,
      progress_pct: Math.max(0, Math.min(100, Number(values.progress_pct || 0))),
      sort_order: milestones.length,
      created_by: profile.id || null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo crear el hito.");
      return;
    }

    setComposerOpen(false);
    await loadMilestones();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_milestone_created",
      entityType: "project_milestones",
      detail: `Hito creado: ${values.title.trim()}`,
      metadata: { project_id: projectId, target_date: values.target_date || null },
    }).catch(() => {});
    toast.success("Hito creado.");
  }

  async function handleUpdate(values: ProjectMilestoneFormValues) {
    if (!editing?.id || !profile?.company_id) return;

    setSaving(true);
    const { error } = await (supabase as any)
      .from("project_milestones")
      .update({
        title: values.title.trim(),
        description: values.description.trim() || null,
        target_date: values.target_date || null,
        status: values.status,
        progress_pct: Math.max(0, Math.min(100, Number(values.progress_pct || 0))),
      })
      .eq("id", editing.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo actualizar el hito.");
      return;
    }

    setEditing(null);
    await loadMilestones();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_milestone_updated",
      entityType: "project_milestones",
      entityId: editing.id,
      detail: `Hito actualizado: ${values.title.trim()}`,
      metadata: { project_id: projectId, target_date: values.target_date || null },
    }).catch(() => {});
    toast.success("Hito actualizado.");
  }

  async function handleArchive(milestone: ProjectMilestoneRow) {
    if (!profile?.company_id) return;
    if (!window.confirm(`¿Eliminar el hito "${milestone.title}"?`)) return;

    setSaving(true);
    const { error } = await (supabase as any)
      .from("project_milestones")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", milestone.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) {
      toast.error(error.message || "No se pudo eliminar el hito.");
      return;
    }

    if (editing?.id === milestone.id) setEditing(null);
    await loadMilestones();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_milestone_deleted",
      entityType: "project_milestones",
      entityId: milestone.id,
      detail: `Hito archivado: ${milestone.title}`,
      metadata: { project_id: projectId },
    }).catch(() => {});
    toast.success("Hito eliminado.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Hitos del proyecto
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Fechas clave, entregables y checkpoints operativos para llevar control del proyecto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {milestoneCountLabel}
            </span>
            {overdueCount ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                {overdueCount} vencido{overdueCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setComposerOpen((open) => !open);
                }}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {composerOpen ? "Cerrar" : "Crear hito"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadMilestones()}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {composerOpen ? (
        <ProjectMilestoneForm
          initialValues={defaultMilestoneFormValues()}
          projectWindowLabel={projectWindowLabel}
          saving={saving}
          submitLabel="Guardar hito"
          onCancel={() => setComposerOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {editing ? (
        <ProjectMilestoneForm
          initialValues={editing}
          projectWindowLabel={projectWindowLabel}
          saving={saving}
          submitLabel="Guardar cambios"
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      ) : null}

      {loading ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={index === 2 ? "px-4 py-4 sm:px-5" : "border-b border-slate-200/70 px-4 py-4 sm:px-5"}
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-40 rounded-full bg-slate-100" />
                  <div className="h-3.5 w-24 rounded-full bg-slate-100" />
                  <div className="h-3.5 w-full rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : milestones.length ? (
        <ProjectMilestoneList
          milestones={milestones}
          canEdit={canEdit}
          onEdit={(milestone) => {
            setComposerOpen(false);
            setEditing(toDraft(milestone));
          }}
          onDelete={handleArchive}
        />
      ) : (
        <EmptyState
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Sin hitos todavía"
          description="Crea hitos para llevar control de entregables, fechas clave y avances importantes del proyecto."
        />
      )}

      {!milestones.length && !loading && (projectStartDate || projectDueDate) ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <CalendarClock className="h-4 w-4" />
            Ventana del proyecto
          </div>
          <p className="mt-1">{projectWindowLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
