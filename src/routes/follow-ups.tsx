import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { CommercialEntityPicker } from "@/components/commercial-follow-ups/commercial-entity-picker";
import { CommercialTimelinePanel } from "@/components/commercial-follow-ups/commercial-timeline-panel";
import {
  CHANNELS,
  ENTITY_LABELS,
  ENTITY_PERMISSION_MODULE,
  STATUS_LABELS,
  currentTimezone,
  formatDateTime,
  labelFor,
  loadEntityLabels,
  localDateTimeInput,
} from "@/components/commercial-follow-ups/commercial-follow-up-ui";
import { openCommercialFollowUp } from "@/components/commercial-follow-ups/global-commercial-follow-up-host";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  assignFollowUp,
  cancelFollowUp,
  getFollowUpMetrics,
  getFollowUp,
  listFollowUps,
  rescheduleFollowUp,
  type CommercialChannel,
  type CommercialEntityRef,
  type CommercialFollowUp,
  type CommercialFollowUpMetrics,
  type FollowUpListFilters,
} from "@/lib/commercial-follow-ups";

export const Route = createFileRoute("/follow-ups")({
  validateSearch: (search: Record<string, unknown>): { followUpId?: string } => ({
    followUpId: typeof search.followUpId === "string" ? search.followUpId : undefined,
  }),
  component: FollowUpsPage,
  head: () => ({ meta: [{ title: "Seguimientos — Corevix CRM" }] }),
});

type View = NonNullable<FollowUpListFilters["view"]>;
type TeamMember = { user_id: string; full_name: string | null; email: string | null };
const PAGE_SIZE = 25;
const VIEWS: { value: View; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "upcoming", label: "Próximos" },
  { value: "overdue", label: "Vencidos" },
  { value: "completed", label: "Completados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "all", label: "Todos" },
];

function entityHref(entity: CommercialEntityRef) {
  if (entity.type === "lead") return `/leads?leadId=${encodeURIComponent(entity.id)}`;
  if (entity.type === "client") return `/clients?clientId=${encodeURIComponent(entity.id)}`;
  return `/pipeline?dealId=${encodeURIComponent(entity.id)}`;
}

function FollowUpsPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const search = Route.useSearch();
  const [view, setView] = useState<View>("today");
  const [channel, setChannel] = useState<CommercialChannel | "all">("all");
  const [assigneeUserId, setAssigneeUserId] = useState("all");
  const [entity, setEntity] = useState<CommercialEntityRef | null>(null);
  const [entityLabel, setEntityLabel] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CommercialFollowUp[]>([]);
  const [metrics, setMetrics] = useState<CommercialFollowUpMetrics | null>(null);
  const [metricsError, setMetricsError] = useState("");
  const [total, setTotal] = useState(0);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(search.followUpId || null);
  const [selected, setSelected] = useState<CommercialFollowUp | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [mutating, setMutating] = useState(false);

  const canWrite =
    Boolean(profile?.company_id && profile?.is_active) &&
    (can("leads.create") || can("deals.create") || can("clients.create"));
  const canEditEntity = (ref: CommercialEntityRef) =>
    can(`${ENTITY_PERMISSION_MODULE[ref.type]}.edit`);
  const canAssignEntity = (ref: CommercialEntityRef) =>
    can(`${ENTITY_PERMISSION_MODULE[ref.type]}.assign`);
  const companyId = profile?.company_id;
  const currentUserId = user?.id;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const teamLabels = useMemo(
    () =>
      Object.fromEntries(
        team.map((member) => [member.user_id, member.full_name || member.email || "Usuario"]),
      ),
    [team],
  );

  useEffect(() => {
    if (!companyId) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setMetricsError("");
    void getFollowUpMetrics()
      .then((result) => {
        if (!cancelled) setMetrics(result);
      })
      .catch((cause) => {
        if (!cancelled)
          setMetricsError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las métricas.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, reloadKey]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (supabase as any)
      .rpc("get_company_team_members", {
        _search: null,
        _role: null,
        _is_active: true,
        _department: null,
      })
      .then(({ data, error: teamError }: any) => {
        if (cancelled) return;
        if (teamError) return setTeam([]);
        setTeam((Array.isArray(data) ? data : []).filter((member: TeamMember) => member.user_id));
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined;
    void listFollowUps({
      view,
      page,
      pageSize: PAGE_SIZE,
      channel: channel === "all" ? undefined : channel,
      assigneeUserId: assigneeUserId === "all" ? undefined : assigneeUserId,
      entity: entity || undefined,
      from,
      to,
    })
      .then(async (result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        try {
          const nextLabels = await loadEntityLabels(
            companyId,
            result.items.map((item) => item.entity),
          );
          if (!cancelled) setLabels(nextLabels);
        } catch {
          if (!cancelled) setLabels({});
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la bandeja.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, view, page, channel, assigneeUserId, entity, fromDate, toDate, reloadKey]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    void getFollowUp(selectedId)
      .then((result) => {
        if (cancelled) return;
        setSelected(result);
        setRescheduleAt(localDateTimeInput(new Date(result.scheduledAt)));
        setAssignTo(result.assigneeUserId);
      })
      .catch((cause) => {
        if (!cancelled) {
          setSelected(null);
          setDetailError(
            cause instanceof Error ? cause.message : "No se pudo cargar el seguimiento.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  useEffect(() => {
    const onChanged = () => reload();
    window.addEventListener("corevix:commercial-follow-up-changed", onChanged);
    return () => window.removeEventListener("corevix:commercial-follow-up-changed", onChanged);
  }, [reload]);

  const setFilter = (callback: () => void) => {
    setPage(1);
    callback();
  };

  async function runMutation(action: () => Promise<unknown>, message: string) {
    if (mutating) return;
    setMutating(true);
    setDetailError("");
    try {
      await action();
      toast.success(message);
      reload();
    } catch (cause) {
      setDetailError(
        cause instanceof Error ? cause.message : "No se pudo actualizar el seguimiento.",
      );
    } finally {
      setMutating(false);
    }
  }

  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Seguimientos"
        subtitle="Agenda, resultados e historial de contactos comerciales."
        actionLabel={canWrite ? "Nuevo seguimiento" : undefined}
        onAction={canWrite ? () => openCommercialFollowUp({ mode: "schedule" }) : undefined}
        actionIcon={<Plus className="h-4 w-4" />}
      />

      {companyId ? (
        <section aria-label="Métricas comerciales" className="space-y-3">
          <div className="grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ["Pendientes", metrics?.pending],
              ["Vencidos", metrics?.overdue],
              ["Próximos", metrics?.upcoming],
              ["Completados", metrics?.completed],
              ["Contactos efectivos", metrics?.contacted],
              ["Sin respuesta", metrics?.noAnswer],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="border-b border-slate-200 bg-transparent px-3 py-3 first:border-t"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1.5 text-2xl font-medium tabular-nums tracking-tight text-slate-950">
                  {value === undefined ? "—" : value}
                </p>
              </div>
            ))}
          </div>
          {metricsError ? (
            <p role="status" className="text-xs text-amber-700">
              Métricas no disponibles: {metricsError}
            </p>
          ) : null}
          {metrics?.byAssignee.length ? (
            <p className="text-xs text-slate-500">
              Pendientes por responsable:{" "}
              {metrics.byAssignee
                .map((item) => `${teamLabels[item.userId] || "Usuario"} ${item.count}`)
                .join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      <div
        className="flex flex-wrap gap-5 border-y border-slate-200 py-3"
        role="tablist"
        aria-label="Vistas de seguimientos"
      >
        {VIEWS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            role="tab"
            aria-selected={view === item.value}
            variant={view === item.value ? "default" : "outline"}
            className={
              view === item.value
                ? "rounded-none border-b-2 border-primary bg-transparent text-primary shadow-none hover:bg-transparent"
                : "rounded-none border-b-2 border-transparent bg-transparent text-slate-600 shadow-none hover:bg-transparent hover:text-slate-950"
            }
            onClick={() => setFilter(() => setView(item.value))}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <section
        className="space-y-5 border-b border-slate-200 py-5"
        aria-label="Filtros de seguimientos"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="follow-up-assignee-filter">Responsable</Label>
            <Select
              value={assigneeUserId}
              onValueChange={(value) => setFilter(() => setAssigneeUserId(value))}
            >
              <SelectTrigger id="follow-up-assignee-filter" className="shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los permitidos</SelectItem>
                {currentUserId ? (
                  <SelectItem value={currentUserId}>Mis seguimientos</SelectItem>
                ) : null}
                {team
                  .filter((member) => member.user_id !== currentUserId)
                  .map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email || member.user_id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow-up-channel-filter">Canal</Label>
            <Select
              value={channel}
              onValueChange={(value) =>
                setFilter(() => setChannel(value as CommercialChannel | "all"))
              }
            >
              <SelectTrigger id="follow-up-channel-filter" className="shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                {CHANNELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow-up-from-filter">Desde</Label>
            <Input
              id="follow-up-from-filter"
              className="shadow-none"
              type="date"
              value={fromDate}
              onChange={(event) => setFilter(() => setFromDate(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow-up-to-filter">Hasta</Label>
            <Input
              id="follow-up-to-filter"
              className="shadow-none"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setFilter(() => setToDate(event.target.value))}
            />
          </div>
        </div>
        {companyId ? (
          <CommercialEntityPicker
            companyId={companyId}
            value={entity}
            selectedLabel={entityLabel}
            onChange={(next, label) =>
              setFilter(() => {
                setEntity(next);
                setEntityLabel(label || "");
              })
            }
          />
        ) : null}
        {entity ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilter(() => {
                setEntity(null);
                setEntityLabel("");
              })
            }
          >
            Quitar filtro de registro
          </Button>
        ) : null}
      </section>

      {!companyId ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
        >
          No hay una empresa activa para consultar seguimientos.
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          {error}
          <Button type="button" variant="link" onClick={reload}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-white p-8 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando seguimientos…
        </div>
      ) : null}
      {!loading && !error && companyId && items.length === 0 ? (
        <div className="border-y border-slate-200 bg-transparent px-4 py-12 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">
            {total === 0 && view === "all"
              ? "Todavía no hay seguimientos"
              : "Sin resultados para estos filtros"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Prueba otra vista o programa el próximo contacto comercial.
          </p>
          {canWrite ? (
            <Button className="mt-4" onClick={() => openCommercialFollowUp({ mode: "schedule" })}>
              Programar seguimiento
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-2">
            {items.map((item) => {
              const overdue =
                (item.status === "scheduled" || item.status === "in_progress") &&
                new Date(item.scheduledAt).getTime() < Date.now();
              const label =
                labels[`${item.entity.type}:${item.entity.id}`] ||
                `${ENTITY_LABELS[item.entity.type]} vinculado`;
              return (
                <article
                  key={item.id}
                  className={`border-b border-slate-200 bg-transparent px-3 py-4 transition-colors first:border-t ${selectedId === item.id ? "bg-blue-50/40" : "hover:bg-slate-50/70"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                        {ENTITY_LABELS[item.entity.type]} · {label}
                      </p>
                      <h2 className="mt-1 break-words font-semibold text-slate-950">
                        {item.objective}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(item.scheduledAt)}
                        </span>
                        <span>{labelFor(item.channel, CHANNELS)}</span>
                        <span>{teamLabels[item.assigneeUserId] || "Responsable asignado"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${overdue ? "bg-red-50 text-red-700" : item.status === "completed" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"}`}
                      >
                        {overdue ? "Vencido" : STATUS_LABELS[item.status]}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedId(item.id)}
                    >
                      Abrir
                    </Button>
                    {canEditEntity(item.entity) &&
                    (item.status === "scheduled" || item.status === "in_progress") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openCommercialFollowUp({
                            mode: "interaction",
                            entity: item.entity,
                            entityLabel: label,
                            followUpId: item.id,
                            channel: item.channel,
                          })
                        }
                      >
                        Registrar resultado
                      </Button>
                    ) : null}
                    <Link
                      to={entityHref(item.entity) as any}
                      className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Abrir {ENTITY_LABELS[item.entity.type].toLowerCase()}
                    </Link>
                  </div>
                </article>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-slate-600">
              <span>
                Mostrando {pageStart}–{pageEnd} de {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <aside
            className="min-w-0 self-start border-l border-slate-200 bg-transparent p-5 xl:sticky xl:top-4"
            aria-label="Detalle del seguimiento"
          >
            {!selectedId ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Abre un seguimiento para ver su detalle e historial.
              </div>
            ) : null}
            {detailLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando detalle…
              </p>
            ) : null}
            {detailError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {detailError}
                <Button type="button" variant="link" onClick={reload}>
                  Reintentar
                </Button>
              </div>
            ) : null}
            {selected && !detailLoading ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-blue-700">
                      {ENTITY_LABELS[selected.entity.type]}
                    </p>
                    <h2 className="mt-1 font-semibold text-slate-950">{selected.objective}</h2>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(null)}
                  >
                    Cerrar
                  </Button>
                </div>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Programado</dt>
                    <dd>{formatDateTime(selected.scheduledAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Estado</dt>
                    <dd>{STATUS_LABELS[selected.status]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Responsable</dt>
                    <dd>{teamLabels[selected.assigneeUserId] || "Responsable asignado"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Canal</dt>
                    <dd>{labelFor(selected.channel, CHANNELS)}</dd>
                  </div>
                  {selected.notes ? (
                    <div>
                      <dt className="text-xs text-slate-500">Contexto</dt>
                      <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                    </div>
                  ) : null}
                  {selected.taskId ? (
                    <div>
                      <dt className="text-xs text-slate-500">Tarea vinculada</dt>
                      <dd>
                        <Link to="/tasks" className="text-blue-700 hover:underline">
                          Abrir tareas
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                  {selected.calendarEventId ? (
                    <div>
                      <dt className="text-xs text-slate-500">Calendario</dt>
                      <dd>
                        <Link to="/calendar" className="text-blue-700 hover:underline">
                          Abrir calendario
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {canEditEntity(selected.entity) &&
                (selected.status === "scheduled" || selected.status === "in_progress") ? (
                  <div className="space-y-4 border-t pt-4">
                    <Button
                      className="w-full"
                      onClick={() =>
                        openCommercialFollowUp({
                          mode: "interaction",
                          entity: selected.entity,
                          entityLabel: labels[`${selected.entity.type}:${selected.entity.id}`],
                          followUpId: selected.id,
                          channel: selected.channel,
                        })
                      }
                    >
                      Registrar resultado
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor="follow-up-reschedule">Reprogramar fecha y hora</Label>
                      <div className="flex gap-2">
                        <Input
                          id="follow-up-reschedule"
                          className="shadow-none"
                          type="datetime-local"
                          value={rescheduleAt}
                          onChange={(event) => setRescheduleAt(event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={mutating || !rescheduleAt}
                          onClick={() => {
                            const date = new Date(rescheduleAt);
                            if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now())
                              return setDetailError("Elige una fecha futura.");
                            void runMutation(
                              () =>
                                rescheduleFollowUp(
                                  selected.id,
                                  date.toISOString(),
                                  currentTimezone(),
                                ),
                              "Seguimiento reprogramado",
                            );
                          }}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                    {canAssignEntity(selected.entity) ? (
                      <div className="space-y-2">
                        <Label htmlFor="follow-up-reassign">Cambiar responsable</Label>
                        <div className="flex gap-2">
                          <Select value={assignTo} onValueChange={setAssignTo}>
                            <SelectTrigger id="follow-up-reassign" className="shadow-none">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {team.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.full_name || member.email || member.user_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={mutating || !assignTo || assignTo === selected.assigneeUserId}
                            onClick={() =>
                              void runMutation(
                                () => assignFollowUp(selected.id, assignTo),
                                "Responsable actualizado",
                              )
                            }
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-700"
                      disabled={mutating}
                      onClick={() => {
                        if (window.confirm("¿Cancelar este seguimiento?"))
                          void runMutation(
                            () => cancelFollowUp(selected.id),
                            "Seguimiento cancelado",
                          );
                      }}
                    >
                      Cancelar seguimiento
                    </Button>
                  </div>
                ) : null}
                <div className="border-t pt-4">
                  <CommercialTimelinePanel
                    entity={selected.entity}
                    entityLabel={labels[`${selected.entity.type}:${selected.entity.id}`]}
                    compact
                  />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={reload} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Actualizar bandeja
        </Button>
      ) : null}
    </div>
  );
}
