import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarClock, Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { CommercialEntityPicker } from "./commercial-entity-picker";
import {
  CHANNELS,
  OUTCOMES,
  ENTITY_PERMISSION_MODULE,
  currentTimezone,
  localDateTimeInput,
} from "./commercial-follow-up-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  createFollowUp,
  getFollowUp,
  recordInteraction,
  type CommercialEntityRef,
  type CommercialChannel,
  type CommercialOutcome,
  type FollowUpPriority,
  type CreateFollowUpInput,
  type RecordInteractionInput,
} from "@/lib/commercial-follow-ups";

export type CommercialFollowUpMode = "schedule" | "interaction";
export type CommercialFollowUpOpenRequest = {
  mode?: CommercialFollowUpMode;
  entity?: CommercialEntityRef;
  entityLabel?: string;
  followUpId?: string;
  assigneeUserId?: string;
  channel?: string;
  objective?: string;
};

type TeamMember = { user_id: string; full_name: string | null; email: string | null };

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CommercialFollowUpPanel({
  open,
  onOpenChange,
  request,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: CommercialFollowUpOpenRequest;
  onSaved?: () => void;
}) {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const [mode, setMode] = useState<CommercialFollowUpMode>(request.mode || "schedule");
  const [entity, setEntity] = useState<CommercialEntityRef | null>(request.entity || null);
  const [entityLabel, setEntityLabel] = useState(request.entityLabel || "");
  const [channel, setChannel] = useState<CommercialChannel>(
    (request.channel as CommercialChannel) || "call",
  );
  const [objective, setObjective] = useState(request.objective || "");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    localDateTimeInput(new Date(Date.now() + 60 * 60_000)),
  );
  const [timezone, setTimezone] = useState(currentTimezone);
  const [assigneeUserId, setAssigneeUserId] = useState(
    request.assigneeUserId || profile?.user_id || user?.id || "",
  );
  const [priority, setPriority] = useState<FollowUpPriority>("medium");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [createLinkedTask, setCreateLinkedTask] = useState(false);
  const [occurredAt, setOccurredAt] = useState(() => localDateTimeInput());
  const [outcome, setOutcome] = useState<CommercialOutcome>("contacted");
  const [completeCurrent, setCompleteCurrent] = useState(true);
  const [nextStep, setNextStep] = useState("");
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextScheduledAt, setNextScheduledAt] = useState(() =>
    localDateTimeInput(new Date(Date.now() + 24 * 60 * 60_000)),
  );
  const [nextObjective, setNextObjective] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savingRef = useRef(false);
  const draftSignatureRef = useRef("");
  const draftKeyRef = useRef("");

  const fixedEntity = Boolean(request.entity);
  const requiredAction = mode === "interaction" && request.followUpId ? "edit" : "create";
  const editable =
    Boolean(profile?.company_id && profile?.is_active) &&
    (entity
      ? can(`${ENTITY_PERMISSION_MODULE[entity.type]}.${requiredAction}`)
      : can("leads.create") || can("deals.create") || can("clients.create"));
  const selectedAssignee = useMemo(
    () => team.find((member) => member.user_id === assigneeUserId),
    [assigneeUserId, team],
  );

  useEffect(() => {
    if (!open) return;
    setMode(request.mode || "schedule");
    setEntity(request.entity || null);
    setEntityLabel(request.entityLabel || "");
    setChannel((request.channel as CommercialChannel) || "call");
    setObjective(request.objective || "");
    setNotes("");
    setScheduledAt(localDateTimeInput(new Date(Date.now() + 60 * 60_000)));
    setTimezone(currentTimezone());
    setAssigneeUserId(request.assigneeUserId || profile?.user_id || user?.id || "");
    setPriority("medium");
    setReminderEnabled(false);
    setReminderMinutes("15");
    setCreateLinkedTask(false);
    setOccurredAt(localDateTimeInput());
    setOutcome("contacted");
    setCompleteCurrent(true);
    setNextStep("");
    setScheduleNext(false);
    setNextScheduledAt(localDateTimeInput(new Date(Date.now() + 24 * 60 * 60_000)));
    setNextObjective("");
    setError("");
    setDirty(false);
    savingRef.current = false;
    draftSignatureRef.current = "";
    draftKeyRef.current = "";
  }, [open, request, profile?.user_id, user?.id]);

  useEffect(() => {
    if (!open || !request.followUpId) return;
    let cancelled = false;
    setContextLoading(true);
    void getFollowUp(request.followUpId)
      .then((item) => {
        if (cancelled || !item) return;
        setEntity(item.entity);
        setChannel(item.channel);
        setObjective(item.objective);
        setAssigneeUserId(item.assigneeUserId || "");
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el seguimiento.");
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, request.followUpId]);

  useEffect(() => {
    if (!open || !profile?.company_id) return;
    let cancelled = false;
    setTeamLoading(true);
    void (async () => {
      const { data, error: teamError } = await (supabase as any).rpc("get_company_team_members", {
        _search: null,
        _role: null,
        _is_active: true,
        _department: null,
      });
      if (cancelled) return;
      if (teamError) {
        setTeam([]);
        setError("No se pudo cargar el equipo. Inténtalo de nuevo.");
      } else {
        setTeam((Array.isArray(data) ? data : []).filter((member: TeamMember) => member.user_id));
      }
      setTeamLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, profile?.company_id]);

  const changeOpen = (next: boolean) => {
    if (!next && saving) return;
    if (!next && dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) return;
    onOpenChange(next);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!editable) {
      setError("No tienes permiso para registrar seguimientos.");
      return;
    }
    if (!entity) {
      setError("Selecciona un prospecto, oportunidad o cliente.");
      return;
    }
    const scheduledIso = toIso(scheduledAt);
    const occurredIso = toIso(occurredAt);
    const nextIso = toIso(nextScheduledAt);
    if (mode === "schedule") {
      if (!objective.trim()) {
        setError("Escribe el objetivo del seguimiento.");
        return;
      }
      if (!scheduledIso || new Date(scheduledIso).getTime() <= Date.now()) {
        setError("Elige una fecha y hora futuras para el seguimiento.");
        return;
      }
      if (!assigneeUserId) {
        setError("Selecciona un responsable activo.");
        return;
      }
      if (
        reminderEnabled &&
        (!Number.isInteger(Number(reminderMinutes)) || Number(reminderMinutes) < 0)
      ) {
        setError("Indica una anticipación válida para el recordatorio.");
        return;
      }
    } else {
      if (!occurredIso || new Date(occurredIso).getTime() > Date.now() + 60_000) {
        setError("La interacción debe tener una fecha válida, sin estar en el futuro.");
        return;
      }
      if (
        scheduleNext &&
        (!nextObjective.trim() || !nextIso || new Date(nextIso).getTime() <= Date.now())
      ) {
        setError("Completa el objetivo y una fecha futura para el próximo seguimiento.");
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (mode === "schedule") {
        const draft: CreateFollowUpInput = {
          entity,
          channel,
          objective: objective.trim(),
          notes: notes.trim() || null,
          scheduledAt: scheduledIso!,
          timezone,
          assigneeUserId,
          priority,
          reminderMinutesBefore: reminderEnabled ? Number(reminderMinutes) : null,
          createLinkedTask,
        };
        const signature = JSON.stringify({ mode, draft });
        if (draftSignatureRef.current !== signature) {
          draftSignatureRef.current = signature;
          draftKeyRef.current = crypto.randomUUID();
        }
        const input: CreateFollowUpInput = { ...draft, idempotencyKey: draftKeyRef.current };
        await createFollowUp(input);
        toast.success("Seguimiento programado");
      } else {
        const nextFollowUp: CreateFollowUpInput | undefined = scheduleNext
          ? {
              entity,
              channel,
              objective: nextObjective.trim(),
              notes: nextStep.trim() || null,
              scheduledAt: nextIso!,
              timezone,
              assigneeUserId: assigneeUserId || user?.id || "",
              priority: "medium",
              reminderMinutesBefore: null,
              createLinkedTask: false,
            }
          : undefined;
        const draft: RecordInteractionInput = {
          entity,
          followUpId: request.followUpId,
          channel,
          occurredAt: occurredIso!,
          outcome,
          notes: notes.trim() || null,
          nextStep: nextStep.trim() || null,
          completeFollowUp: Boolean(request.followUpId && (completeCurrent || scheduleNext)),
          nextFollowUp,
        };
        const signature = JSON.stringify({ mode, draft });
        if (draftSignatureRef.current !== signature) {
          draftSignatureRef.current = signature;
          draftKeyRef.current = crypto.randomUUID();
        }
        const input: RecordInteractionInput = { ...draft, idempotencyKey: draftKeyRef.current };
        await recordInteraction(input);
        toast.success(
          scheduleNext ? "Interacción y próximo seguimiento registrados" : "Interacción registrada",
        );
      }
      setDirty(false);
      draftSignatureRef.current = "";
      draftKeyRef.current = "";
      onOpenChange(false);
      onSaved?.();
      window.dispatchEvent(
        new CustomEvent("corevix:commercial-follow-up-changed", { detail: { entity } }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar. Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-h-[min(92dvh,850px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-lg border-slate-200 p-0 shadow-none">
        <DialogHeader className="border-b border-slate-200 bg-white px-5 pb-4 pt-5 sm:px-7">
          <DialogTitle className="text-xl font-medium tracking-tight text-slate-950">
            Seguimiento comercial
          </DialogTitle>
          <DialogDescription className="max-w-lg text-sm leading-relaxed text-slate-500">
            Organiza el próximo contacto o registra el resultado de una conversación.
          </DialogDescription>
        </DialogHeader>
        <div
          className="grid grid-cols-2 gap-6 border-b border-slate-200 bg-white px-5 py-2 sm:px-7"
          role="tablist"
          aria-label="Modo de seguimiento"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={mode === "schedule"}
            variant={mode === "schedule" ? "default" : "outline"}
            disabled={Boolean(request.followUpId)}
            onClick={() => {
              setMode("schedule");
              setError("");
            }}
            className={`h-10 justify-start gap-2 rounded-none border-b-2 bg-transparent px-1 shadow-none hover:bg-transparent ${mode === "schedule" ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-slate-950"}`}
          >
            <CalendarClock className="h-4 w-4" /> Programar
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={mode === "interaction"}
            variant={mode === "interaction" ? "default" : "outline"}
            className={`h-10 justify-start gap-2 rounded-none border-b-2 bg-transparent px-1 shadow-none hover:bg-transparent ${mode === "interaction" ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-slate-950"}`}
            onClick={() => {
              setMode("interaction");
              setError("");
            }}
          >
            <MessageSquareText className="h-4 w-4" /> Registrar contacto
          </Button>
        </div>
        <form
          onSubmit={(event) => void submit(event)}
          onChange={() => setDirty(true)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white px-5 py-5 sm:px-7">
            {contextLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando contexto…
              </p>
            ) : null}
            {profile?.company_id ? (
              <CommercialEntityPicker
                companyId={profile.company_id}
                value={entity}
                selectedLabel={entityLabel}
                disabled={fixedEntity || Boolean(request.followUpId)}
                onChange={(next, label) => {
                  setEntity(next);
                  setEntityLabel(label || "");
                  setDirty(true);
                }}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commercial-channel">Canal</Label>
                <Select
                  value={channel}
                  onValueChange={(value) => {
                    setChannel(value as CommercialChannel);
                    setDirty(true);
                  }}
                >
                  <SelectTrigger id="commercial-channel" className="shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mode === "schedule" ? (
                <div className="space-y-2">
                  <Label htmlFor="commercial-priority">Prioridad</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      setPriority(value as FollowUpPriority);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="commercial-priority" className="shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="commercial-outcome">Resultado</Label>
                  <Select
                    value={outcome}
                    onValueChange={(value) => {
                      setOutcome(value as CommercialOutcome);
                      setCompleteCurrent(!["no_answer", "busy"].includes(value));
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="commercial-outcome" className="shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {mode === "schedule" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="commercial-objective">Objetivo</Label>
                  <Input
                    id="commercial-objective"
                    className="shadow-none"
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    placeholder="Ej. Revisar propuesta y acordar próximos pasos"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="commercial-scheduled-at">Fecha y hora</Label>
                    <Input
                      id="commercial-scheduled-at"
                      className="shadow-none"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commercial-timezone">Zona horaria del dispositivo</Label>
                    <Input
                      id="commercial-timezone"
                      className="shadow-none"
                      value={timezone}
                      readOnly
                      aria-readonly="true"
                    />
                    <p className="text-xs text-slate-500">
                      La hora se interpreta en esta zona al guardar.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial-assignee">Responsable</Label>
                  <Select
                    value={assigneeUserId}
                    onValueChange={(value) => {
                      setAssigneeUserId(value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger id="commercial-assignee" className="shadow-none">
                      <SelectValue
                        placeholder={teamLoading ? "Cargando equipo…" : "Seleccionar responsable"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.full_name || member.email || member.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAssignee?.email ? (
                    <p className="text-xs text-slate-500">{selectedAssignee.email}</p>
                  ) : null}
                </div>
                <div className="space-y-2 border-y border-slate-200 py-3">
                  <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-medium text-slate-700">
                    <Checkbox
                      checked={reminderEnabled}
                      onCheckedChange={(value) => {
                        setReminderEnabled(value === true);
                        setDirty(true);
                      }}
                    />{" "}
                    Activar recordatorio
                  </label>
                  {reminderEnabled ? (
                    <div className="space-y-2 pl-7">
                      <Label htmlFor="commercial-reminder">Avisar antes</Label>
                      <Select
                        value={reminderMinutes}
                        onValueChange={(value) => {
                          setReminderMinutes(value);
                          setDirty(true);
                        }}
                      >
                        <SelectTrigger id="commercial-reminder" className="max-w-xs shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Al llegar la hora</SelectItem>
                          <SelectItem value="5">5 minutos</SelectItem>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="1440">1 día</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-medium text-slate-700">
                    <Checkbox
                      checked={createLinkedTask}
                      onCheckedChange={(value) => {
                        setCreateLinkedTask(value === true);
                        setDirty(true);
                      }}
                    />{" "}
                    Crear tarea operativa vinculada
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="commercial-occurred-at">Fecha y hora del contacto</Label>
                  <Input
                    id="commercial-occurred-at"
                    className="shadow-none"
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(event) => setOccurredAt(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial-next-step">Próximo paso acordado</Label>
                  <Input
                    id="commercial-next-step"
                    className="shadow-none"
                    value={nextStep}
                    onChange={(event) => setNextStep(event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                {request.followUpId ? (
                  <label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium">
                    <Checkbox
                      checked={completeCurrent || scheduleNext}
                      disabled={scheduleNext}
                      onCheckedChange={(value) => {
                        setCompleteCurrent(value === true);
                        setDirty(true);
                      }}
                    />{" "}
                    Marcar seguimiento actual como completado
                  </label>
                ) : null}
                <div className="space-y-4 border-y border-slate-200 py-3">
                  <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-medium text-slate-700">
                    <Checkbox
                      checked={scheduleNext}
                      onCheckedChange={(value) => {
                        setScheduleNext(value === true);
                        setDirty(true);
                      }}
                    />{" "}
                    Programar próximo seguimiento
                  </label>
                  {scheduleNext ? (
                    <div className="grid gap-3 pl-7 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="commercial-next-objective">Objetivo siguiente</Label>
                        <Input
                          id="commercial-next-objective"
                          className="shadow-none"
                          value={nextObjective}
                          onChange={(event) => setNextObjective(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commercial-next-at">Fecha y hora</Label>
                        <Input
                          id="commercial-next-at"
                          className="shadow-none"
                          type="datetime-local"
                          value={nextScheduledAt}
                          onChange={(event) => setNextScheduledAt(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="commercial-notes">Notas y contexto</Label>
              <Textarea
                id="commercial-notes"
                className="shadow-none"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Información útil para el próximo contacto"
              />
            </div>
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
            {!editable ? (
              <p role="alert" className="text-sm text-amber-700">
                Tu rol no permite registrar seguimientos.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              className="rounded-md shadow-none"
              onClick={() => changeOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-md shadow-none"
              disabled={saving || contextLoading || !editable || !entity}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "schedule" ? "Programar seguimiento" : "Registrar interacción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
