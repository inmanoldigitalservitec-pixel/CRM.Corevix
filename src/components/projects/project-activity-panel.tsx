import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  ProjectActivityTimeline,
  projectActivityIconFor,
  type ProjectActivityItem,
} from "@/components/projects/project-activity-timeline";

type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];

type ProfileRow = {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  email: string | null;
};

type ProjectTaskSnapshot = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type ProjectNoteSnapshot = {
  id: string;
  content: string;
  created_at?: string;
  updated_at: string;
  author_profile_id: string | null;
  author?: ProfileRow | null;
};

function toRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function actorLabel(profile: ProfileRow | null | undefined) {
  return profile?.full_name || profile?.email || "Equipo Corevix";
}

function previewText(value: string, max = 140) {
  const text = String(value || "").trim();
  if (!text) return "Sin detalles adicionales.";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

function entityLabel(entityType: string) {
  switch (entityType) {
    case "projects":
      return "Proyecto";
    case "tasks":
      return "Tarea";
    case "project_notes":
      return "Nota";
    default:
      return "Actividad";
  }
}

function titleForLog(log: ActivityLogRow) {
  const actionTitles: Record<string, string> = {
    project_created: "Proyecto creado",
    project_updated: "Proyecto actualizado",
    project_deleted: "Proyecto eliminado",
    task_created: "Tarea creada",
    task_updated: "Tarea actualizada",
    task_completed: "Tarea completada",
    task_deleted: "Tarea eliminada",
    project_note_created: "Nota agregada",
    project_note_updated: "Nota actualizada",
    project_note_deleted: "Nota archivada",
  };

  return actionTitles[log.action] || `${entityLabel(log.entity_type)} actualizada`;
}

function descriptionForLog(log: ActivityLogRow) {
  const detail = String(log.detail || "").trim();
  if (detail) return detail;

  switch (log.action) {
    case "project_created":
      return "Se registro el proyecto en el sistema.";
    case "project_updated":
      return "Se actualizaron los datos principales del proyecto.";
    case "task_created":
      return "Se creo una nueva tarea relacionada al proyecto.";
    case "task_updated":
      return "Se actualizo una tarea relacionada al proyecto.";
    case "task_completed":
      return "Se marco una tarea del proyecto como completada.";
    case "project_note_created":
      return "Se agrego una nota interna al proyecto.";
    case "project_note_updated":
      return "Se actualizo una nota interna del proyecto.";
    case "project_note_deleted":
      return "Se archivo una nota interna del proyecto.";
    default:
      return "Se registro un evento relacionado con este proyecto.";
  }
}

export function ProjectActivityPanel({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: ProjectTaskSnapshot[];
}) {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [notes, setNotes] = useState<ProjectNoteSnapshot[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latestRequestRef = useRef(0);
  const taskIdsKey = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => task.id).filter(Boolean)))
        .sort()
        .join(","),
    [tasks],
  );

  const loadActivity = useCallback(
    async (showLoadingState = false) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      if (!profile?.company_id) {
        if (latestRequestRef.current === requestId) {
          setLogs([]);
          setNotes([]);
          setProfilesById(new Map());
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      if (showLoadingState) {
        setLoading(true);
      }
      setRefreshing(true);

      const activityQuery =
        "id,action,entity_type,entity_id,detail,metadata,created_at,user_id,company_id";
      const taskIdSet = new Set(taskIdsKey ? taskIdsKey.split(",") : []);
      const queries: Promise<{
        data: ActivityLogRow[] | null;
        error: { message?: string } | null;
      }>[] = [
        (supabase as any)
          .from("activity_logs")
          .select(activityQuery)
          .eq("company_id", profile.company_id)
          .eq("entity_type", "projects")
          .eq("entity_id", projectId)
          .order("created_at", { ascending: false })
          .limit(80),
        (supabase as any)
          .from("activity_logs")
          .select(activityQuery)
          .eq("company_id", profile.company_id)
          .contains("metadata", { project_id: projectId })
          .order("created_at", { ascending: false })
          .limit(80),
        (supabase as any)
          .from("activity_logs")
          .select(activityQuery)
          .eq("company_id", profile.company_id)
          .contains("metadata", { related_project_id: projectId })
          .order("created_at", { ascending: false })
          .limit(80),
      ];

      if (taskIdSet.size > 0) {
        queries.push(
          (supabase as any)
            .from("activity_logs")
            .select(activityQuery)
            .eq("company_id", profile.company_id)
            .eq("entity_type", "tasks")
            .in("entity_id", Array.from(taskIdSet))
            .order("created_at", { ascending: false })
            .limit(120),
        );
      }

      const [results, notesResult] = await Promise.all([
        Promise.all(queries),
        (supabase as any)
          .from("project_notes")
          .select(
            "id,content,created_at,updated_at,author_profile_id,author:profiles!project_notes_author_profile_id_fkey(id,full_name,email)",
          )
          .eq("company_id", profile.company_id)
          .eq("project_id", projectId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);
      const firstError = results.find((result) => result.error)?.error;

      if (firstError) {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          toast.error(firstError.message || "No se pudo cargar la actividad del proyecto.");
        }
        return;
      }

      if (notesResult.error) {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          toast.error(notesResult.error.message || "No se pudo cargar la actividad del proyecto.");
        }
        return;
      }

      if (latestRequestRef.current !== requestId) {
        return;
      }

      const merged = results.flatMap((result) => result.data || []);
      setNotes((notesResult.data || []) as ProjectNoteSnapshot[]);

      const deduped = Array.from(
        new Map(merged.map((log: ActivityLogRow) => [log.id, log])).values(),
      )
        .filter((log) => {
          if (log.entity_type === "projects" && log.entity_id === projectId) return true;
          if (log.entity_type === "tasks" && log.entity_id && taskIdSet.has(log.entity_id))
            return true;
          const metadata = toRecord(log.metadata);
          return metadata.project_id === projectId || metadata.related_project_id === projectId;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLogs(deduped);

      const userIds = Array.from(
        new Set(deduped.map((log) => log.user_id).filter(Boolean)),
      ) as string[];
      if (userIds.length) {
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id,user_id,full_name,email")
          .in("user_id", userIds);

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setProfilesById(
          new Map(
            (profilesData || []).map((item: ProfileRow) => [String(item.user_id || item.id), item]),
          ),
        );
      } else {
        setProfilesById(new Map());
      }

      setLoading(false);
      setRefreshing(false);
    },
    [profile?.company_id, projectId, taskIdsKey],
  );

  useEffect(() => {
    void loadActivity(true);
  }, [loadActivity]);

  const items = useMemo<ProjectActivityItem[]>(() => {
    const logItems: ProjectActivityItem[] = logs.map((log) => {
      const activityVisual = projectActivityIconFor({
        action: log.action,
        entityType: log.entity_type,
      });
      return {
        id: log.id,
        title: titleForLog(log),
        description: descriptionForLog(log),
        createdAt: log.created_at,
        entityType: log.entity_type,
        entityLabel: entityLabel(log.entity_type),
        actorLabel: actorLabel(log.user_id ? profilesById.get(log.user_id) : null),
        icon: activityVisual.icon,
        toneClassName: activityVisual.toneClassName,
      };
    });

    const coveredTaskIds = new Set(
      logs
        .filter((log) => log.entity_type === "tasks" && log.entity_id)
        .map((log) => String(log.entity_id)),
    );
    const coveredNoteIds = new Set(
      logs
        .filter((log) => log.entity_type === "project_notes" && log.entity_id)
        .map((log) => String(log.entity_id)),
    );

    const noteItems: ProjectActivityItem[] = notes
      .map((note) => {
        if (coveredNoteIds.has(note.id)) return null;
        const activityVisual = projectActivityIconFor({
          action: "project_note_updated",
          entityType: "project_notes",
        });
        return {
          id: `note-fallback-${note.id}`,
          title: note.created_at === note.updated_at ? "Nota creada" : "Nota actualizada",
          description: previewText(note.content),
          createdAt: note.updated_at,
          entityType: "project_notes",
          entityLabel: "Nota",
          actorLabel: actorLabel(note.author || null),
          icon: activityVisual.icon,
          toneClassName: activityVisual.toneClassName,
        };
      })
      .filter(Boolean) as ProjectActivityItem[];

    const taskItems: ProjectActivityItem[] = tasks
      .map((task) => {
        if (coveredTaskIds.has(task.id)) return null;
        const activityVisual = projectActivityIconFor({
          action: task.status === "Completed" ? "task_completed" : "task_updated",
          entityType: "tasks",
        });
        return {
          id: `task-fallback-${task.id}`,
          title: task.status === "Completed" ? "Tarea completada" : "Tarea actualizada",
          description: task.title,
          createdAt: task.updated_at,
          entityType: "tasks",
          entityLabel: "Tarea",
          actorLabel: "Equipo Corevix",
          icon: activityVisual.icon,
          toneClassName: activityVisual.toneClassName,
        };
      })
      .filter(Boolean) as ProjectActivityItem[];

    return [...logItems, ...noteItems, ...taskItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 24);
  }, [logs, notes, profilesById, tasks]);

  const summaryLabel = useMemo(() => {
    if (!items.length) return "Sin actividad reciente";
    if (items.length === 1) return "1 evento reciente";
    return `${items.length} eventos recientes`;
  }, [items.length]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Actividad del proyecto
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Timeline con cambios recientes del proyecto, tareas relacionadas y notas internas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {summaryLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadActivity(false)}
              disabled={refreshing}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={
                index === 3 ? "px-4 py-4 sm:px-5" : "border-b border-slate-200/70 px-4 py-4 sm:px-5"
              }
            >
              <div className="flex gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-40 rounded-full bg-slate-100" />
                  <div className="h-3.5 w-56 max-w-full rounded-full bg-slate-100" />
                  <div className="h-3.5 w-full rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length ? (
        <ProjectActivityTimeline items={items} />
      ) : (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title="Sin actividad reciente"
          description="Cuando se actualice el proyecto, se creen tareas o se registren notas internas, el timeline aparecera aqui."
        />
      )}
    </div>
  );
}
