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
    <div className="space-y-0 border-y border-slate-100">
      {events.map((event) => (
        <div key={event.key} className="border-b border-slate-100 bg-white py-4 last:border-b-0">
          <div className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-slate-900 bg-white" />
            <div className="min-w-0">
              <div className="text-sm font-normal text-slate-950">{event.title}</div>
              {event.description ? (
                <div className="mt-1 text-sm text-slate-500">{event.description}</div>
              ) : null}
              <div className="mt-2 text-xs font-normal text-slate-500">{event.date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
