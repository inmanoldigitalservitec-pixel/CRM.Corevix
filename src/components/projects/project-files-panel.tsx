import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Paperclip, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ProjectWorkspaceFormDialog } from "@/components/projects/project-workspace-form-dialog";

type ProjectDriveFileRow = {
  id: string;
  company_id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  thumbnail_link: string | null;
  icon_link: string | null;
  size_bytes: number | null;
  linked_type: "project" | "task";
  linked_id: string;
  created_by: string | null;
  created_at: string;
};

type ProjectTaskFileSnapshot = {
  id: string;
  title: string;
};

function extractGoogleDriveId(
  rawUrl: string,
): { id: string; type: "file" | "folder" | "unknown" } | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const pathname = url.pathname || "";
  const fileMatch = pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return { id: fileMatch[1], type: "file" };
  const folderMatch = pathname.match(/\/folders\/([^/]+)/);
  if (folderMatch?.[1]) return { id: folderMatch[1], type: "folder" };
  const docsMatch = pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
  if (docsMatch?.[2]) return { id: docsMatch[2], type: "file" };
  const queryId = url.searchParams.get("id");
  if (queryId) return { id: queryId, type: "unknown" };
  return null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "Link";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function fileKindLabel(file: ProjectDriveFileRow) {
  if (file.mime_type === "application/vnd.google-apps.folder") return "Carpeta";
  if (file.mime_type?.includes("spreadsheet")) return "Hoja";
  if (file.mime_type?.includes("presentation")) return "Presentación";
  if (file.mime_type?.includes("document")) return "Documento";
  return "Archivo";
}

function sourceLabel(file: ProjectDriveFileRow, taskTitleById: Map<string, string>) {
  if (file.linked_type === "project") return "Proyecto";
  const taskTitle = taskTitleById.get(file.linked_id);
  return taskTitle ? `Tarea · ${taskTitle}` : "Tarea";
}

export function ProjectFilesPanel({
  projectId,
  canEdit,
  tasks,
}: {
  projectId: string;
  canEdit: boolean;
  tasks: ProjectTaskFileSnapshot[];
}) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<ProjectDriveFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const taskIds = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.id).filter(Boolean))),
    [tasks],
  );
  const taskTitleById = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);

  const loadFiles = useCallback(async () => {
    if (!profile?.company_id) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const selectFields =
      "id,company_id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,linked_type,linked_id,created_by,created_at";
    const queries: Promise<{
      data: ProjectDriveFileRow[] | null;
      error: { message?: string } | null;
    }>[] = [
      (supabase as any)
        .from("drive_files")
        .select(selectFields)
        .eq("company_id", profile.company_id)
        .eq("linked_type", "project")
        .eq("linked_id", projectId)
        .order("created_at", { ascending: false })
        .limit(100),
    ];

    if (taskIds.length > 0) {
      queries.push(
        (supabase as any)
          .from("drive_files")
          .select(selectFields)
          .eq("company_id", profile.company_id)
          .eq("linked_type", "task")
          .in("linked_id", taskIds)
          .order("created_at", { ascending: false })
          .limit(150),
      );
    }

    const results = await Promise.all(queries);
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      toast.error(firstError.message || "No se pudieron cargar los archivos del proyecto.");
      setLoading(false);
      return;
    }

    const merged = results.flatMap((result) => result.data || []);
    const deduped = Array.from(new Map(merged.map((file) => [file.id, file])).values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setFiles(deduped as ProjectDriveFileRow[]);
    setLoading(false);
  }, [profile?.company_id, projectId, taskIds]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const fileCountLabel = useMemo(() => {
    if (!files.length) return "Sin archivos";
    if (files.length === 1) return "1 archivo";
    return `${files.length} archivos`;
  }, [files.length]);

  async function attachDriveUrl() {
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const rawUrl = driveUrlInput.trim();
    if (!rawUrl) return toast.error("Pega una URL de Google Drive.");
    const parsed = extractGoogleDriveId(rawUrl);
    if (!parsed) return toast.error("La URL de Google Drive no es válida.");

    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData.session?.user?.id || profile.user_id || null;
    const isFolder = parsed.type === "folder";
    const { error } = await (supabase as any).from("drive_files").insert({
      company_id: profile.company_id,
      drive_file_id: parsed.id,
      name: isFolder ? "Carpeta de Google Drive" : "Archivo de Google Drive",
      mime_type: isFolder ? "application/vnd.google-apps.folder" : null,
      web_view_link: rawUrl,
      web_content_link: null,
      thumbnail_link: null,
      icon_link: null,
      size_bytes: null,
      linked_type: "project",
      linked_id: projectId,
      created_by: authUserId,
    });
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo adjuntar el enlace de Drive.");

    setDriveUrlInput("");
    setDialogOpen(false);
    await loadFiles();
    toast.success("Enlace de Drive adjuntado.");
  }

  async function deleteDriveFile(file: ProjectDriveFileRow) {
    if (!canEdit) return toast.error("No tienes permiso para borrar archivos.");
    if (!window.confirm(`¿Eliminar "${file.name}" de este proyecto?`)) return;

    const { error } = await (supabase as any).from("drive_files").delete().eq("id", file.id);
    if (error) return toast.error(error.message || "No se pudo eliminar el archivo.");

    await loadFiles();
    toast.success("Archivo eliminado.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Archivos del proyecto
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Enlaces de Google Drive y referencias de trabajo vinculadas a este proyecto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {fileCountLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                Adjuntar enlace
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadFiles()}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <ProjectWorkspaceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setDialogOpen(open);
          if (!open) setDriveUrlInput("");
        }}
        title="Adjuntar enlace"
        description="Pega una URL de Google Drive para vincularla a este proyecto."
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void attachDriveUrl();
          }}
        >
          <div className="space-y-1.5">
            <Input
              value={driveUrlInput}
              onChange={(event) => setDriveUrlInput(event.target.value)}
              placeholder="Pega URL de Google Drive"
              className="h-11 rounded-2xl border-slate-200"
              disabled={saving}
            />
            <p className="text-[11px] text-slate-500">
              Puedes adjuntar archivos, carpetas, documentos, hojas o presentaciones de Drive.
            </p>
          </div>
          <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (saving) return;
                setDialogOpen(false);
                setDriveUrlInput("");
              }}
              disabled={saving}
              className="rounded-full px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={saving || !driveUrlInput.trim()}
              className="rounded-full border-slate-200 px-4"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Adjuntar
            </Button>
          </div>
        </form>
      </ProjectWorkspaceFormDialog>

      {loading ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={
                index === 2 ? "px-4 py-4 sm:px-5" : "border-b border-slate-200/70 px-4 py-4 sm:px-5"
              }
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-40 rounded-full bg-slate-100" />
                  <div className="h-3.5 w-32 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : files.length ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
          {files.map((file, index) => {
            const url = file.web_view_link || file.web_content_link;
            return (
              <article
                key={file.id}
                className={
                  index === files.length - 1
                    ? "px-4 py-4 sm:px-5"
                    : "border-b border-slate-200/70 px-4 py-4 sm:px-5"
                }
              >
                <div className="flex gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                    {file.icon_link ? (
                      <img src={file.icon_link} alt="" className="h-5 w-5" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {file.name}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {fileKindLabel(file)}
                          </span>
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                            {sourceLabel(file, taskTitleById)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatBytes(file.size_bytes)} · {formatDateTime(file.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-8 rounded-full border-slate-200 px-3 text-xs"
                          >
                            <a href={url} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Abrir
                            </a>
                          </Button>
                        ) : null}
                        {canEdit ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => void deleteDriveFile(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Paperclip className="h-5 w-5" />}
          title="Sin archivos vinculados"
          description="Adjunta enlaces de Google Drive para tener documentos, carpetas y recursos del proyecto en un solo lugar."
        />
      )}
    </div>
  );
}
