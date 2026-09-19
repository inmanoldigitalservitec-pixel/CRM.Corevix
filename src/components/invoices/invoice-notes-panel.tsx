import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/crm/empty-state";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";

type NoteAuthor = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type InvoiceNoteRow = {
  id: string;
  company_id: string;
  invoice_id: string;
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

function authorLabel(author?: NoteAuthor | null) {
  return author?.full_name || author?.email || "Equipo Corevix";
}

export function InvoiceNotesPanel({
  invoiceId,
  invoiceNumber,
  canEdit,
  onChanged,
}: {
  invoiceId: string;
  invoiceNumber: string;
  canEdit: boolean;
  onChanged?: () => Promise<void> | void;
}) {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<InvoiceNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<InvoiceNoteRow | null>(null);

  const loadNotes = useCallback(async () => {
    if (!profile?.company_id) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("invoice_notes")
      .select(
        "id,company_id,invoice_id,author_profile_id,kind,content,created_at,updated_at,archived_at,author:profiles!invoice_notes_author_profile_id_fkey(id,full_name,email)",
      )
      .eq("company_id", profile.company_id)
      .eq("invoice_id", invoiceId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    setLoading(false);
    if (error) {
      toast.error(error.message || "No se pudieron cargar las notas de la factura.");
      return;
    }
    setNotes((data || []) as InvoiceNoteRow[]);
  }, [invoiceId, profile?.company_id]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const countLabel = useMemo(() => {
    if (!notes.length) return "Sin notas todavía";
    if (notes.length === 1) return "1 nota interna";
    return `${notes.length} notas internas`;
  }, [notes]);

  async function saveNote() {
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const content = draft.trim();
    if (!content) return toast.error("Escribe una nota antes de guardar.");

    setSaving(true);
    const request = selectedNote
      ? (supabase as any)
          .from("invoice_notes")
          .update({ content })
          .eq("id", selectedNote.id)
          .eq("company_id", profile.company_id)
      : (supabase as any)
          .from("invoice_notes")
          .insert({
            company_id: profile.company_id,
            invoice_id: invoiceId,
            author_profile_id: profile.id || null,
            kind: "internal",
            content,
          })
          .select("id")
          .single();

    const { data, error } = await request;
    setSaving(false);
    if (error) return toast.error(error.message || "No se pudo guardar la nota.");

    const editing = Boolean(selectedNote);
    const entityId = selectedNote?.id || data?.id || invoiceId;
    setDraft("");
    setSelectedNote(null);
    setDialogOpen(false);
    await logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: editing ? "invoice_note_updated" : "invoice_note_created",
      entityType: "invoice_notes",
      entityId,
      detail: `Nota interna ${editing ? "actualizada" : "creada"} en factura ${invoiceNumber}`,
      metadata: { invoice_id: invoiceId },
    }).catch(() => {});
    await loadNotes();
    await onChanged?.();
    toast.success(editing ? "Nota actualizada." : "Nota guardada.");
  }

  async function archiveNote(note: InvoiceNoteRow) {
    if (!profile?.company_id) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("invoice_notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", note.id)
      .eq("company_id", profile.company_id);
    setSaving(false);
    if (error) return toast.error(error.message || "No se pudo eliminar la nota.");

    if (selectedNote?.id === note.id) {
      setSelectedNote(null);
      setDraft("");
      setDialogOpen(false);
    }
    await logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "invoice_note_archived",
      entityType: "invoice_notes",
      entityId: note.id,
      detail: `Nota interna archivada en factura ${invoiceNumber}`,
      metadata: { invoice_id: invoiceId },
    }).catch(() => {});
    await loadNotes();
    await onChanged?.();
    toast.success("Nota eliminada.");
  }

  const openCreate = () => {
    setSelectedNote(null);
    setDraft("");
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            Notas de la factura
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Contexto interno, acuerdos y próximos pasos relacionados con esta factura.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {countLabel}
          </span>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={openCreate} disabled={saving} className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Crear nota
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadNotes()} disabled={loading || saving} className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>
      </div>

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => {
          if (saving) return;
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setSelectedNote(null);
            setDraft("");
          }
        }}
        title={selectedNote ? "Editar nota" : "Crear nota"}
        size="md"
        contentClassName="sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl"
        bodyClassName="sm:flex-none"
      >
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void saveNote(); }}>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe el contexto o próximo paso de esta factura..."
            className={`${crmFormStyles.textarea} min-h-[180px] sm:min-h-[160px]`}
            rows={6}
            disabled={!canEdit || saving}
          />
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving} className={`${crmFormStyles.cancelButton} h-11 w-full sm:h-10 sm:w-auto`}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canEdit || saving || !draft.trim()} className={`${crmFormStyles.primaryButton} h-11 w-full sm:h-10 sm:w-auto`}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {selectedNote ? "Guardar cambios" : "Guardar nota"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">Cargando notas...</div>
        ) : notes.length ? (
          notes.map((note) => (
            <article key={note.id} className="border-b border-slate-100 p-5 last:border-b-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">{authorLabel(note.author)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {relativeTimeLabel(note.updated_at)} · {formatDateTime(note.updated_at)}
                    {note.updated_at !== note.created_at ? ` · creada ${formatDateTime(note.created_at)}` : ""}
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1 self-start">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedNote(note); setDraft(note.content); setDialogOpen(true); }} disabled={saving} className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900">
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void archiveNote(note)} disabled={saving} className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-400 hover:text-rose-600">
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{note.content}</div>
            </article>
          ))
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              title="No hay notas todavía"
              description="Agrega la primera nota interna para mantener claro el seguimiento de esta factura."
              actionLabel={canEdit ? "Crear nota" : undefined}
              onAction={canEdit ? openCreate : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
