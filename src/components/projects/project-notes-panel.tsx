import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, FileText, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/crm/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";

type NoteAuthor = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ProjectNoteRow = {
  id: string;
  company_id: string;
  project_id: string;
  author_profile_id: string | null;
  kind: string;
  content: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  author?: NoteAuthor | null;
};

function formatDateTime(value: string) {
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

function authorLabel(author: NoteAuthor | null | undefined) {
  return author?.full_name || author?.email || "Equipo Corevix";
}

function relativeTimeLabel(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(days, "day");
}

export function ProjectNotesPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<ProjectNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const loadNotes = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("project_notes")
      .select(
        "id,company_id,project_id,author_profile_id,kind,content,created_at,updated_at,archived_at,author:profiles!project_notes_author_profile_id_fkey(id,full_name,email)",
      )
      .eq("company_id", profile.company_id)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message || "No se pudieron cargar las notas del proyecto.");
      setLoading(false);
      return;
    }

    setNotes(data || []);
    setLoading(false);
  }, [profile?.company_id, projectId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const noteCountLabel = useMemo(() => {
    if (!notes.length) return "Sin notas todavía";
    if (notes.length === 1) return "1 nota interna";
    return `${notes.length} notas internas`;
  }, [notes]);

  async function handleCreateNote() {
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    if (!draft.trim()) return toast.error("Escribe una nota antes de guardar.");

    setSaving(true);
    const content = draft.trim();
    const { error } = await (supabase as any).from("project_notes").insert({
      company_id: profile.company_id,
      project_id: projectId,
      author_profile_id: profile.id || null,
      kind: "internal",
      content,
    });
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo guardar la nota.");

    setDraft("");
    setComposerOpen(false);
    await loadNotes();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_note_created",
      entityType: "project_notes",
      detail: `Nota interna creada en proyecto (${content.slice(0, 80)})`,
      metadata: { project_id: projectId },
    }).catch(() => {});
    toast.success("Nota guardada.");
  }

  async function handleSaveEdit(note: ProjectNoteRow) {
    if (!editingId || !profile?.company_id) return;
    if (!editingContent.trim()) return toast.error("La nota no puede quedar vacía.");

    setSaving(true);
    const content = editingContent.trim();
    const { error } = await (supabase as any)
      .from("project_notes")
      .update({ content })
      .eq("id", note.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo actualizar la nota.");

    setEditingId(null);
    setEditingContent("");
    await loadNotes();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_note_updated",
      entityType: "project_notes",
      entityId: note.id,
      detail: `Nota interna actualizada en proyecto (${content.slice(0, 80)})`,
      metadata: { project_id: projectId },
    }).catch(() => {});
    toast.success("Nota actualizada.");
  }

  async function handleArchiveNote(note: ProjectNoteRow) {
    if (!profile?.company_id) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("project_notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", note.id)
      .eq("company_id", profile.company_id);
    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo eliminar la nota.");

    if (editingId === note.id) {
      setEditingId(null);
      setEditingContent("");
    }
    await loadNotes();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "project_note_deleted",
      entityType: "project_notes",
      entityId: note.id,
      detail: `Nota interna archivada en proyecto (${note.content.slice(0, 80)})`,
      metadata: { project_id: projectId },
    }).catch(() => {});
    toast.success("Nota eliminada.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Notas del proyecto
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Contexto interno, decisiones y próximos pasos del equipo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {noteCountLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComposerOpen((open) => !open)}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {composerOpen ? "Cerrar" : "Crear nota"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadNotes()}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>

        {composerOpen ? (
          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe una nota sobre este proyecto…"
              className="min-h-[92px] resize-y rounded-2xl border-slate-200 bg-white text-sm leading-6 shadow-none"
              disabled={!canEdit || saving}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Visible para el equipo interno del CRM.
              </p>
              <Button
                type="button"
                onClick={handleCreateNote}
                disabled={!canEdit || saving || !draft.trim()}
                className="h-8 rounded-full px-3 text-xs font-semibold"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Guardar nota
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">
            Cargando notas del proyecto...
          </div>
        ) : notes.length ? (
          notes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <article
                key={note.id}
                className="border-b border-slate-200/80 px-4 py-4 last:border-b-0 sm:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {authorLabel(note.author)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {relativeTimeLabel(note.updated_at)} · {formatDateTime(note.updated_at)}
                      {note.updated_at !== note.created_at
                        ? ` · creada ${formatDateTime(note.created_at)}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-start">
                    {canEdit ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditingContent(note.content);
                          }}
                          disabled={saving}
                          className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleArchiveNote(note)}
                          disabled={saving}
                          className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      className="min-h-[110px] resize-y rounded-2xl border-slate-200 text-sm leading-6 shadow-none"
                      disabled={saving}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingContent("");
                        }}
                        disabled={saving}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleSaveEdit(note)}
                        disabled={saving}
                        className="h-8 rounded-full px-3 text-xs font-semibold"
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Guardar cambios
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                    {note.content}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No hay notas en este proyecto"
              description="Agrega la primera nota interna para capturar contexto, decisiones y próximos pasos."
              actionLabel={canEdit ? "Crear nota" : undefined}
              onAction={() => setComposerOpen(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
