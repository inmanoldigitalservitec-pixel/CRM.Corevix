import { useCallback, useEffect, useState } from "react";
import { CalendarClock, History, Loader2, MessageSquareText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import {
  listTimelinePage,
  type CommercialEntityRef,
  type CommercialTimelineItem,
} from "@/lib/commercial-follow-ups";
import { openCommercialFollowUp } from "./global-commercial-follow-up-host";
import {
  CHANNELS,
  ENTITY_PERMISSION_MODULE,
  OUTCOMES,
  STATUS_LABELS,
  formatDateTime,
  labelFor,
} from "./commercial-follow-up-ui";

const PAGE_SIZE = 20;
const EVENT_LABELS: Record<string, string> = {
  created: "Seguimiento creado",
  rescheduled: "Seguimiento reprogramado",
  assigned: "Responsable actualizado",
  completed: "Seguimiento completado",
  cancelled: "Seguimiento cancelado",
};

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function describe(item: CommercialTimelineItem) {
  const details = item.details;
  if (item.kind === "follow_up")
    return {
      title: str(details.objective) || "Seguimiento programado",
      subtitle: `Programado: ${formatDateTime(str(details.scheduled_at))} · ${STATUS_LABELS[str(details.status) as keyof typeof STATUS_LABELS] || ""}`,
      notes: "",
    };
  if (item.kind === "interaction")
    return {
      title: labelFor(str(details.outcome), OUTCOMES),
      subtitle: `Contacto por ${labelFor(str(details.channel), CHANNELS)}`,
      notes: str(details.notes),
    };
  const eventType = str(details.event_type);
  return {
    title: EVENT_LABELS[eventType] || "Cambio de seguimiento",
    subtitle:
      eventType === "rescheduled" && details.to
        ? `Nueva fecha: ${formatDateTime(str(details.to))}`
        : "",
    notes: "",
  };
}

export function CommercialTimelinePanel({
  entity,
  entityLabel,
  compact = false,
}: {
  entity: CommercialEntityRef;
  entityLabel?: string;
  compact?: boolean;
}) {
  const { can } = usePermissions();
  const [items, setItems] = useState<CommercialTimelineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canRecord = can(`${ENTITY_PERMISSION_MODULE[entity.type]}.edit`);

  const reload = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const data = await listTimelinePage(entity, { page: targetPage, pageSize: PAGE_SIZE });
        setItems(data.items);
        setTotal(data.total);
        setPage(targetPage);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "No se pudo cargar el historial comercial.",
        );
      } finally {
        setLoading(false);
      }
    },
    [entity],
  );

  useEffect(() => {
    void reload(1);
  }, [reload]);
  useEffect(() => {
    const listener = (event: Event) => {
      const changed = (event as CustomEvent<{ entity?: CommercialEntityRef }>).detail?.entity;
      if (changed?.id === entity.id && changed.type === entity.type) void reload(1);
    };
    window.addEventListener("corevix:commercial-follow-up-changed", listener);
    return () => window.removeEventListener("corevix:commercial-follow-up-changed", listener);
  }, [entity.id, entity.type, reload]);

  return (
    <section aria-label="Historial comercial" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-950">Historial comercial</h3>
          {!compact ? (
            <p className="text-xs text-slate-500">Contactos y cambios de este registro.</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void reload(page)}
          disabled={loading}
          aria-label="Actualizar historial"
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial…
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <Button type="button" variant="link" size="sm" onClick={() => void reload(page)}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {!loading && !error && total === 0 ? (
        <div className="border-y border-slate-200 py-5 text-sm text-slate-500">
          Todavía no hay contactos ni seguimientos comerciales.
        </div>
      ) : null}
      {!error && items.length > 0 ? (
        <ol className="space-y-3">
          {items.map((item) => {
            const summary = describe(item);
            const Icon =
              item.kind === "follow_up"
                ? CalendarClock
                : item.kind === "interaction"
                  ? MessageSquareText
                  : History;
            return (
              <li
                key={`${item.kind}:${item.sourceId}`}
                className="border-b border-slate-200 py-3 first:border-t sm:py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-slate-950">{summary.title}</strong>
                      <span className="text-xs text-slate-500">{formatDateTime(item.at)}</span>
                    </div>
                    {summary.subtitle ? (
                      <p className="mt-1 text-xs text-slate-600">{summary.subtitle}</p>
                    ) : null}
                    {summary.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {summary.notes}
                      </p>
                    ) : null}
                    {canRecord &&
                    item.kind === "follow_up" &&
                    item.followUpId &&
                    ["scheduled", "in_progress"].includes(str(item.details.status)) ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto px-0"
                        onClick={() =>
                          openCommercialFollowUp({
                            mode: "interaction",
                            entity,
                            entityLabel,
                            followUpId: item.followUpId!,
                          })
                        }
                      >
                        Registrar resultado
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      {!error && total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => void reload(page - 1)}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page * PAGE_SIZE >= total}
              onClick={() => void reload(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
