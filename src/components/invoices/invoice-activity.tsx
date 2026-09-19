import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/crm/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type InvoiceActivityEvent = {
  key: string;
  title: string;
  description?: string;
  date: string;
};

type ActivityLogRow = {
  id: string;
  action: string;
  detail: string | null;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  invoice_note_created: "Nota creada",
  invoice_note_updated: "Nota actualizada",
  invoice_note_archived: "Nota eliminada",
  task_created: "Tarea creada",
  task_completed: "Tarea completada",
  invoice_task_created: "Tarea creada",
  invoice_task_completed: "Tarea completada",
  invoice_reminder_created: "Recordatorio creado",
  invoice_reminder_completed: "Recordatorio completado",
  invoice_reminder_cancelled: "Recordatorio cancelado",
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

function humanizeAction(value: string) {
  return value
    .replace(/^invoice_/, "")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function InvoiceActivity({
  invoiceId,
  events,
  refreshKey,
}: {
  invoiceId: string;
  events: InvoiceActivityEvent[];
  refreshKey?: number | string;
}) {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!invoiceId || !profile?.company_id) {
        setLogs([]);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("activity_logs")
        .select("id,action,detail,entity_type,entity_id,metadata,created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled || error) return;

      setLogs(
        ((data || []) as ActivityLogRow[]).filter((row) => {
          const metadataInvoiceId = String(
            row.metadata?.invoice_id || row.metadata?.related_invoice_id || "",
          );
          return (
            metadataInvoiceId === invoiceId ||
            (row.entity_type === "invoices" && row.entity_id === invoiceId)
          );
        }),
      );
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, profile?.company_id, refreshKey]);

  const combinedEvents = useMemo<InvoiceActivityEvent[]>(() => {
    const loggedEvents = logs.map((row) => ({
      key: `log-${row.id}`,
      title: actionLabels[row.action] || humanizeAction(row.action),
      description: row.detail || undefined,
      date: formatDateTime(row.created_at),
    }));
    return [...loggedEvents, ...events];
  }, [events, logs]);

  if (!combinedEvents.length) {
    return (
      <EmptyState
        title="Sin actividad"
        description="Esta factura todavía no tiene actividad registrada."
      />
    );
  }

  return (
    <div className="space-y-0 border-y border-slate-100">
      {combinedEvents.map((event) => (
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
