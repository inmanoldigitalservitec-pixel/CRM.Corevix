import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import {
  defaultTimeEntryFormValues,
  ProjectTimeEntryForm,
  type ProjectTimeEntryDraft,
  type ProjectTimeEntryFormValues,
} from "@/components/projects/project-time-entry-form";
import { ProjectTimeSummary } from "@/components/projects/project-time-summary";

type TaskSnapshot = {
  id: string;
  title: string;
};

type ProjectTimeEntryRow = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  entry_date: string;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function minutesToHoursInput(minutes: number) {
  return String(Math.round((minutes / 60) * 100) / 100);
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

function formatEntryDate(value: string) {
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function toDraft(entry: ProjectTimeEntryRow): ProjectTimeEntryDraft {
  return {
    id: entry.id,
    entry_date: entry.entry_date,
    duration_hours: minutesToHoursInput(entry.duration_minutes),
    task_id: entry.task_id || "none",
    is_billable: entry.is_billable,
    description: entry.description || "",
  };
}

export function ProjectTimesheetsPanel({
  projectId,
  canEdit,
  tasks,
}: {
  projectId: string;
  canEdit: boolean;
  tasks: TaskSnapshot[];
}) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<ProjectTimeEntryRow[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTimeEntryDraft | null>(null);

  const taskTitleById = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);

  const loadEntries = useCallback(async () => {
    if (!profile?.company_id) {
      setEntries([]);
      setProfilesById(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("project_time_entries")
      .select("id,task_id,profile_id,entry_date,duration_minutes,description,is_billable,created_at,updated_at")
      .eq("company_id", profile.company_id)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message || "No se pudieron cargar las horas del proyecto.");
      setLoading(false);
      return;
    }

    const rows = (data || []) as ProjectTimeEntryRow[];
    setEntries(rows);

    const profileIds = Array.from(new Set(rows.map((row) => row.profile_id).filter(Boolean)));
    if (profileIds.length) {
      const { data: profileRows, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("id,full_name,email")
        .in("id", profileIds);

      if (profilesError) {
        toast.error(profilesError.message || "No se pudo resolver el equipo de las horas.");
      } else {
        setProfilesById(
          new Map(((profileRows || []) as ProfileRow[]).map((row) => [row.id, row])),
        );
      }
    } else {
      setProfilesById(new Map());
    }

    setLoading(false);
  }, [profile?.company_id, projectId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const summary = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
    const billableMinutes = entries
      .filter((entry) => entry.is_billable)
      .reduce((sum, entry) => sum + entry.duration_minutes, 0);
    const nonBillableMinutes = totalMinutes - billableMinutes;

    return {
      total: formatHours(totalMinutes),
      billable: formatHours(billableMinutes),
      nonBillable: formatHours(nonBillableMinutes),
      entries: String(entries.length),
    };
  }, [entries]);

  const entryCountLabel = useMemo(() => {
    if (!entries.length) return "Sin horas";
    if (entries.length === 1) return "1 entrada";
    return `${entries.length} entradas`;
  }, [entries.length]);

  function parseMinutesFromValues(values: ProjectTimeEntryFormValues) {
    const hours = Number(values.duration_hours);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    return Math.round(hours * 60);
  }

  async function handleCreate(values: ProjectTimeEntryFormValues) {
    if (!profile?.company_id || !profile.id) return toast.error("No se pudo identificar tu usuario.");
    const durationMinutes = parseMinutesFromValues(values);
    if (!durationMinutes) return toast.error("Indica una duración válida.");

    setSaving(true);
    const { error } = await (supabase as any).from("project_time_entries").insert({
      company_id: profile.company_id,
      project_id: projectId,
      task_id: values.task_id === "none" ? null : values.task_id,
      profile_id: profile.id,
      entry_date: values.entry_date,
      duration_minutes: durationMinutes,
      description: values.description.trim() || null,
      is_billable: values.is_billable,
    });
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo guardar la hora.");

    setComposerOpen(false);
    await loadEntries();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id,
      action: "project_time_entry_created",
      entityType: "project_time_entries",
      detail: `Tiempo registrado: ${formatHours(durationMinutes)}`,
      metadata: {
        project_id: projectId,
        task_id: values.task_id === "none" ? null : values.task_id,
        duration_minutes: durationMinutes,
        is_billable: values.is_billable,
      },
    }).catch(() => {});
    toast.success("Hora registrada.");
  }

  async function handleUpdate(values: ProjectTimeEntryFormValues) {
    if (!editing?.id || !profile?.company_id) return;
    const durationMinutes = parseMinutesFromValues(values);
    if (!durationMinutes) return toast.error("Indica una duración válida.");

    setSaving(true);
    const { error } = await (supabase as any)
      .from("project_time_entries")
      .update({
        task_id: values.task_id === "none" ? null : values.task_id,
        entry_date: values.entry_date,
        duration_minutes: durationMinutes,
        description: values.description.trim() || null,
        is_billable: values.is_billable,
      })
      .eq("id", editing.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo actualizar la hora.");

    setEditing(null);
    await loadEntries();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_time_entry_updated",
      entityType: "project_time_entries",
      entityId: editing.id,
      detail: `Hora actualizada: ${formatHours(durationMinutes)}`,
      metadata: {
        project_id: projectId,
        task_id: values.task_id === "none" ? null : values.task_id,
        duration_minutes: durationMinutes,
        is_billable: values.is_billable,
      },
    }).catch(() => {});
    toast.success("Hora actualizada.");
  }

  async function handleArchive(entry: ProjectTimeEntryRow) {
    if (!profile?.company_id) return;
    if (!window.confirm("¿Eliminar esta entrada de horas?")) return;

    setSaving(true);
    const { error } = await (supabase as any)
      .from("project_time_entries")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", entry.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo eliminar la entrada.");

    if (editing?.id === entry.id) setEditing(null);
    await loadEntries();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_time_entry_deleted",
      entityType: "project_time_entries",
      entityId: entry.id,
      detail: `Hora eliminada: ${formatHours(entry.duration_minutes)}`,
      metadata: { project_id: projectId, task_id: entry.task_id },
    }).catch(() => {});
    toast.success("Entrada eliminada.");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">Horas del proyecto</h3>
            <p className="mt-1 text-sm text-slate-500">
              Registro operativo de tiempo trabajado, con separación básica entre horas facturables e internas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {entryCountLabel}
            </span>
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
                {composerOpen ? "Cerrar" : "Registrar horas"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadEntries()}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <ProjectTimeSummary
        total={summary.total}
        billable={summary.billable}
        nonBillable={summary.nonBillable}
        entries={summary.entries}
      />

      {composerOpen ? (
        <ProjectTimeEntryForm
          initialValues={defaultTimeEntryFormValues()}
          saving={saving}
          submitLabel="Guardar horas"
          tasks={tasks}
          onCancel={() => setComposerOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {editing ? (
        <ProjectTimeEntryForm
          initialValues={editing}
          saving={saving}
          submitLabel="Actualizar horas"
          tasks={tasks}
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      ) : null}

      <div className="rounded-[24px] border border-slate-200/80 bg-white">
        <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
          <h4 className="text-sm font-semibold text-slate-900">Actividad reciente</h4>
          <p className="mt-1 text-xs text-slate-500">Últimas sesiones registradas para este proyecto.</p>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-slate-500 sm:px-5">Cargando horas del proyecto...</div>
        ) : entries.length ? (
          <div className="divide-y divide-slate-200/80">
            {entries.map((entry) => {
              const member = entry.profile_id ? profilesById.get(entry.profile_id) : null;
              const taskTitle = entry.task_id ? taskTitleById.get(entry.task_id) : null;
              return (
                <article key={entry.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          {formatHours(entry.duration_minutes)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 font-semibold ${
                            entry.is_billable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {entry.is_billable ? "Facturable" : "Interna"}
                        </span>
                        <span className="text-slate-500">{formatEntryDate(entry.entry_date)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {member?.full_name || member?.email || "Miembro del equipo"}
                        </p>
                        {taskTitle ? <p className="text-xs text-slate-500">Tarea: {taskTitle}</p> : null}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {entry.description || "Sin descripción adicional."}
                      </p>
                    </div>

                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setComposerOpen(false);
                            setEditing(toDraft(entry));
                          }}
                          className="h-8 rounded-full px-3 text-xs text-slate-500"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleArchive(entry)}
                          className="h-8 rounded-full px-3 text-xs text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 sm:px-5">
            <EmptyState
              icon={<Clock3 className="h-5 w-5" />}
              title="Sin horas registradas"
              description="Cuando el equipo empiece a reportar tiempo, aquí verás el resumen y las entradas recientes."
            />
          </div>
        )}
      </div>
    </div>
  );
}
