import type { ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  MapPin,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  EVENT_TYPE_LABELS,
  TONE_STYLES,
  formatDate,
  formatTime,
  type CalendarItem,
} from "@/lib/crm/calendar-items";
import { formatCurrencyAmount } from "@/lib/currency";

export function CalendarEventDetailDialog({
  event,
  onClose,
}: {
  event: CalendarItem | null;
  onClose: () => void;
}) {
  const endLabel =
    event?.end && !event.allDay
      ? `${formatDate(event.end)} · ${formatTime(event.end)}`
      : event?.end
        ? `${formatDate(event.end)} · Todo el día`
        : null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl [&>button.absolute.right-4.top-4]:hidden sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[760px] sm:rounded-[18px] sm:border">
        <DialogDescription className="sr-only">
          Información completa del elemento seleccionado en el calendario.
        </DialogDescription>

        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:max-h-[92vh]">
          <header className="shrink-0 border-b bg-white px-4 py-4 sm:px-5">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {event ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-black ${TONE_STYLES[event.tone]}`}
                      >
                        {EVENT_TYPE_LABELS[event.source]}
                      </span>
                    ) : null}
                    {event?.status ? <StatusBadge status={event.status} /> : null}
                  </div>
                  <DialogTitle className="text-[22px] font-extrabold leading-tight tracking-normal text-slate-950 sm:text-2xl">
                    {event?.title || "Detalle del evento"}
                  </DialogTitle>
                  {event?.context ? (
                    <p className="mt-2 text-sm font-bold text-slate-500">{event.context}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Cerrar detalle del calendario"
                  className="shrink-0 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
          </header>

          {event ? (
            <main className="min-h-0 flex-1 overflow-y-auto bg-white">
              <div className="grid gap-5 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[minmax(0,1fr)_260px]">
                <section className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Descripción
                    </h3>
                  </div>

                  {event.description ? (
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                      {event.description}
                    </p>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
                      Este elemento no tiene descripción.
                    </p>
                  )}
                </section>

                <aside className="min-w-0 space-y-3">
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      Información
                    </h3>
                    <div className="space-y-3">
                      <DetailRow
                        icon={<Clock className="h-4 w-4" />}
                        label="Inicio"
                        value={`${formatDate(event.start)} · ${
                          event.allDay ? "Todo el día" : formatTime(event.start)
                        }`}
                      />
                      {endLabel ? (
                        <DetailRow
                          icon={<Clock className="h-4 w-4" />}
                          label="Fin"
                          value={endLabel}
                        />
                      ) : null}
                      <DetailRow
                        icon={<Tag className="h-4 w-4" />}
                        label="Origen"
                        value={EVENT_TYPE_LABELS[event.source]}
                      />
                      {event.location ? (
                        <DetailRow
                          icon={<MapPin className="h-4 w-4" />}
                          label="Lugar"
                          value={event.location}
                        />
                      ) : null}
                      {event.amount != null ? (
                        <DetailRow
                          icon={<DollarSign className="h-4 w-4" />}
                          label="Monto"
                          value={formatCurrencyAmount(event.amount, event.amountCurrency)}
                        />
                      ) : null}
                    </div>
                  </section>
                </aside>
              </div>
            </main>
          ) : null}

          {event ? (
            <footer className="shrink-0 border-t bg-white px-4 py-3 sm:px-5">
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">
                  Cerrar
                </Button>
                <Button asChild className="rounded-lg bg-blue-600 font-black hover:bg-blue-700">
                  <a href={event.href}>
                    Abrir módulo
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </footer>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
