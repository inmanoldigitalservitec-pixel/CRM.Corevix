import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TaskRichTextEditor } from "@/components/tasks/task-detail-dialog";

export type ReminderType = "reminder" | "call" | "meeting" | "demo";

export type ReminderCreateInitialValues = {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  type?: ReminderType;
  location?: string;
  relatedLeadId?: string | null;
  relatedClientId?: string | null;
  relatedDealId?: string | null;
  relatedProposalId?: string | null;
  contextLabel?: string;
};

export type ReminderEventRow = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  related_lead_id: string | null;
  related_client_id: string | null;
  related_deal_id: string | null;
  related_proposal_id: string | null;
};

type ReminderCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string | null;
  currentUserId?: string | null;
  initialValues?: ReminderCreateInitialValues;
  onCreated?: (event: ReminderEventRow) => void | Promise<void>;
  canCreate?: boolean;
};

const typeLabels: Record<ReminderType, string> = {
  reminder: "Recordatorio",
  call: "Llamada",
  meeting: "Reunión",
  demo: "Demo",
};

function toLocalInput(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ReminderCreateDialog({
  open,
  onOpenChange,
  companyId,
  currentUserId,
  initialValues,
  onCreated,
  canCreate = true,
}: ReminderCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [type, setType] = useState<ReminderType>("reminder");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialValues?.title || "");
    setDescription(initialValues?.description || "");
    setDescriptionHtml("");
    setType(initialValues?.type || "reminder");
    setStartAt(toLocalInput(initialValues?.startAt));
    setEndAt(initialValues?.endAt ? toLocalInput(initialValues.endAt) : "");
    setAllDay(Boolean(initialValues?.allDay));
    setLocation(initialValues?.location || "");
  }, [open, initialValues]);

  const dateLabel = useMemo(() => {
    if (!startAt) return "Sin fecha";
    return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(startAt),
    );
  }, [startAt]);

  const close = () => {
    if (!saving) onOpenChange(false);
  };

  const submit = async () => {
    if (!canCreate) {
      toast.error("No tienes permiso para crear recordatorios.");
      return;
    }
    if (!companyId || !currentUserId) {
      toast.error("No se pudo identificar tu sesión.");
      return;
    }
    if (!title.trim()) {
      toast.error("El título del recordatorio es obligatorio.");
      return;
    }
    const startIso = toIso(startAt);
    if (!startIso) {
      toast.error("Selecciona una fecha y hora válida.");
      return;
    }
    const endIso = endAt ? toIso(endAt) : null;
    if (endAt && !endIso) {
      toast.error("La fecha de finalización no es válida.");
      return;
    }

    setSaving(true);
    const payload = {
      company_id: companyId,
      user_id: currentUserId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      type,
      status: "scheduled",
      start_at: startIso,
      end_at: endIso,
      all_day: allDay,
      related_lead_id: initialValues?.relatedLeadId || null,
      related_client_id: initialValues?.relatedClientId || null,
      related_deal_id: initialValues?.relatedDealId || null,
      related_proposal_id: initialValues?.relatedProposalId || null,
      metadata: { created_from: "contextual_reminder_panel" },
    };

    try {
      const { data, error } = await (supabase as any)
        .from("calendar_events")
        .insert(payload)
        .select(
          "id,company_id,user_id,title,description,location,type,status,start_at,end_at,all_day,related_lead_id,related_client_id,related_deal_id,related_proposal_id",
        )
        .single();
      if (error) throw error;
      toast.success("Recordatorio creado.");
      await onCreated?.(data as ReminderEventRow);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el recordatorio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="w-[calc(100vw-20px)] max-w-[980px] gap-0 overflow-hidden rounded-[18px] border-slate-200 bg-white p-0 shadow-2xl">
        <DialogTitle className="sr-only">Nuevo recordatorio</DialogTitle>
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between gap-4 border-b px-6 py-5">
            <div className="min-w-0 flex-1">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título del recordatorio..."
                className="h-auto border-0 p-0 text-xl font-extrabold shadow-none focus-visible:ring-0"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{typeLabels[type]}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
                </span>
                {initialValues?.contextLabel ? (
                  <span className="truncate rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    {initialValues.contextLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={close} disabled={saving}>
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_300px]">
            <main className="min-w-0 p-6">
              <Label className="mb-2 block text-sm font-bold text-slate-800">Descripción</Label>
              <TaskRichTextEditor
                html={descriptionHtml}
                plainText={description}
                onChange={({ html, text }) => {
                  setDescriptionHtml(html);
                  setDescription(text);
                }}
                className="min-h-[300px]"
              />
              <div className="mt-4">
                <Label className="mb-2 block text-sm font-bold text-slate-800">Notas rápidas</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Contexto del seguimiento, temas a tratar o próximos pasos..."
                  className="min-h-[90px]"
                />
              </div>
            </main>

            <aside className="border-t bg-slate-50/70 p-6 md:border-l md:border-t-0">
              <div className="mb-4 flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                <Clock3 className="h-4 w-4 text-slate-400" /> Detalles del recordatorio
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo</Label>
                  <Select value={type} onValueChange={(value) => setType(value as ReminderType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Inicio</Label>
                  <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fin (opcional)</Label>
                  <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
                  Todo el día
                </label>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> Lugar
                  </Label>
                  <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Teléfono, oficina, Google Meet..." />
                </div>
                <div className="rounded-xl border bg-white p-3 text-xs font-semibold text-slate-500">
                  {initialValues?.relatedLeadId ? "Se vinculará al prospecto actual." : null}
                  {initialValues?.relatedClientId ? "Se vinculará al cliente actual." : null}
                  {initialValues?.relatedDealId ? "Se vinculará a la oportunidad actual." : null}
                  {initialValues?.relatedProposalId ? "Se vinculará a la propuesta actual." : null}
                </div>
              </div>
            </aside>
          </div>

          <footer className="flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="ghost" onClick={close} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={() => void submit()} disabled={saving || !title.trim()}>
              {saving ? "Creando..." : "Crear recordatorio"}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
