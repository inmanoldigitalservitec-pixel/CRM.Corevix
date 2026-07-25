import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, FolderOpen, Paperclip, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type ClientDriveFileRow = {
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
  linked_type: "client";
  linked_id: string;
  created_by: string | null;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
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
  if (!value || value <= 0) return "Archivo";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function fileKindLabel(file: ClientDriveFileRow) {
  if (file.mime_type === "application/vnd.google-apps.folder") return "Carpeta";
  if (file.mime_type?.includes("image")) return "Imagen";
  if (file.mime_type?.includes("pdf")) return "PDF";
  if (file.mime_type?.includes("spreadsheet")) return "Hoja";
  if (file.mime_type?.includes("presentation")) return "Presentación";
  if (file.mime_type?.includes("document")) return "Documento";
  return "Archivo";
}

function uploadClientFileWithProgress(args: {
  clientId: string;
  file: File;
  token: string;
  onProgress: (percent: number) => void;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("client_id", args.clientId);
    body.append("file", args.file);

    xhr.open("POST", `${supabaseUrl}/functions/v1/drive-upload-file`);
    xhr.setRequestHeader("Authorization", `Bearer ${args.token}`);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      args.onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onerror = () => reject(new Error("No se pudo subir el archivo a Google Drive."));
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = payload?.detail ? ` Detalle: ${String(payload.detail)}` : "";
        reject(
          new Error(`${payload?.error || "No se pudo subir el archivo a Google Drive."}${detail}`),
        );
        return;
      }
      resolve(payload);
    };
    xhr.send(body);
  });
}

export function ClientFilesPanel({
  clientId,
  clientName,
  driveFolderUrl,
  canEdit,
}: {
  clientId: string;
  clientName: string;
  driveFolderUrl?: string | null;
  canEdit: boolean;
}) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<ClientDriveFileRow[]>([]);
  const [folderUrl, setFolderUrl] = useState(driveFolderUrl || "");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setFolderUrl(driveFolderUrl || "");
  }, [driveFolderUrl]);

  const loadFiles = useCallback(async () => {
    if (!profile?.company_id) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("drive_files")
      .select(
        "id,company_id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,linked_type,linked_id,created_by,created_at",
      )
      .eq("company_id", profile.company_id)
      .eq("linked_type", "client")
      .eq("linked_id", clientId)
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los archivos del cliente.");
      setLoading(false);
      return;
    }

    setFiles(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [clientId, profile?.company_id]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const fileCountLabel = useMemo(() => {
    if (!files.length) return "Sin archivos";
    if (files.length === 1) return "1 archivo";
    return `${files.length} archivos`;
  }, [files.length]);

  async function uploadFile(file: File) {
    if (!canEdit) return toast.error("No tienes permiso para subir archivos.");
    if (!file) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");

    setUploading(true);
    setUploadProgress(0);
    try {
      const payload = await uploadClientFileWithProgress({
        clientId,
        file,
        token,
        onProgress: setUploadProgress,
      });
      if (payload?.folder_url) setFolderUrl(String(payload.folder_url));
      await loadFiles();
      toast.success("Archivo subido al cliente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteDriveFile(file: ClientDriveFileRow) {
    if (!canEdit) return toast.error("No tienes permiso para borrar archivos.");
    if (!window.confirm(`¿Eliminar "${file.name}" de este cliente?`)) return;

    const { error } = await (supabase as any).from("drive_files").delete().eq("id", file.id);
    if (error) return toast.error(error.message || "No se pudo eliminar el archivo.");

    await loadFiles();
    toast.success("Archivo eliminado del cliente.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />

      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Archivos del cliente
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Documentos, imágenes y recursos externos vinculados a {clientName}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {fileCountLabel}
            </span>
            {folderUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <a href={folderUrl} target="_blank" rel="noreferrer">
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  Abrir carpeta
                </a>
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 rounded-full bg-blue-600 px-3 text-xs font-semibold text-white shadow-none hover:bg-blue-700"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Subir archivo
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadFiles()}
              disabled={loading || uploading}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
        {uploading ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-blue-700">
              <span>Subiendo archivo</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        ) : null}
      </div>

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
                          <p className="max-w-full truncate text-sm font-semibold text-slate-900">
                            {file.name}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {fileKindLabel(file)}
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
          title="Sin archivos del cliente"
          description="Sube el primer archivo externo para mantener los recursos de este cliente en un solo lugar."
          actionLabel={canEdit ? "Subir archivo" : undefined}
          onAction={canEdit ? () => fileInputRef.current?.click() : undefined}
        />
      )}
    </div>
  );
}
