import { EmptyState } from "@/components/crm/empty-state";

export type InvoiceActivityEvent = {
  key: string;
  title: string;
  description?: string;
  date: string;
};

export function InvoiceActivity({ events }: { events: InvoiceActivityEvent[] }) {
  if (!events.length) {
    return (
      <EmptyState
        title="Sin actividad"
        description="Esta factura todavía no tiene eventos fechados disponibles."
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-950">{event.title}</div>
              {event.description ? (
                <div className="mt-1 text-sm text-slate-500">{event.description}</div>
              ) : null}
              <div className="mt-2 text-xs font-semibold text-slate-400">{event.date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
