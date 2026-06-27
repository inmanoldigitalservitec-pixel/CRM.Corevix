import { supabase } from "@/integrations/supabase/client";

type CrudOperation = "create" | "update" | "delete";

type ActivityContext = {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeWindowSeconds?: number;
};

type CrudActivity = {
  action: string;
  detail: string;
  metadata?: Record<string, unknown>;
};

function trimText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function humanizeTable(table: string) {
  return table.replace(/_/g, " ");
}

function firstLabel(...values: unknown[]) {
  for (const value of values) {
    const text = trimText(value);
    if (text) return text;
  }
  return null;
}

function changedKeys(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
) {
  if (!previous || !next) return [];
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return Array.from(keys).filter((key) => {
    const before = previous[key];
    const after = next[key];
    return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
  });
}

function fallbackEntityLabel(table: string, row: Record<string, unknown> | null | undefined) {
  if (!row) return humanizeTable(table);
  return (
    firstLabel(
      row.number,
      row.name,
      row.title,
      row.company_name,
      row.contact_person,
      row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      row.first_name,
      row.email,
    ) || humanizeTable(table)
  );
}

export function inferCrudActivity(args: {
  table: string;
  operation: CrudOperation;
  previousRow?: Record<string, unknown> | null;
  nextRow?: Record<string, unknown> | null;
}): CrudActivity | null {
  const { table, operation, previousRow, nextRow } = args;
  const row = nextRow || previousRow || null;
  const label = fallbackEntityLabel(table, row);
  const prevLabel = fallbackEntityLabel(table, previousRow);

  switch (table) {
    case "leads":
      if (operation === "create")
        return { action: "lead_created", detail: `Prospecto creado: ${label}` };
      if (operation === "delete")
        return { action: "lead_deleted", detail: `Prospecto eliminado: ${prevLabel}` };
      return { action: "lead_updated", detail: `Prospecto actualizado: ${label}` };

    case "deals": {
      if (operation === "create")
        return { action: "deal_created", detail: `Oportunidad creada: ${label}` };
      if (operation === "delete")
        return { action: "deal_deleted", detail: `Oportunidad eliminada: ${prevLabel}` };
      const prevStage = trimText(previousRow?.stage);
      const nextStage = trimText(nextRow?.stage);
      if (prevStage && nextStage && prevStage !== nextStage) {
        return {
          action: "deal_moved",
          detail: `Oportunidad movida de ${prevStage} a ${nextStage}: ${label}`,
          metadata: { from_stage: prevStage, to_stage: nextStage },
        };
      }
      return { action: "deal_updated", detail: `Oportunidad actualizada: ${label}` };
    }

    case "proposals": {
      if (operation === "create") {
        const status = trimText(nextRow?.status);
        if (status === "Sent")
          return { action: "proposal_sent", detail: `Propuesta enviada: ${label}` };
        return { action: "proposal_created", detail: `Propuesta creada: ${label}` };
      }
      if (operation === "delete")
        return { action: "proposal_deleted", detail: `Propuesta eliminada: ${prevLabel}` };
      const prevStatus = trimText(previousRow?.status);
      const nextStatus = trimText(nextRow?.status);
      if (nextStatus === "Approved" && prevStatus !== "Approved") {
        return { action: "proposal_approved", detail: `Propuesta aprobada: ${label}` };
      }
      if (nextStatus === "Sent" && prevStatus !== "Sent") {
        return { action: "proposal_sent", detail: `Propuesta enviada: ${label}` };
      }
      return { action: "proposal_updated", detail: `Propuesta actualizada: ${label}` };
    }

    case "invoices": {
      if (operation === "create") {
        const status = trimText(nextRow?.status);
        if (status === "Sent")
          return { action: "invoice_sent", detail: `Factura enviada: ${label}` };
        if (status === "Paid")
          return { action: "invoice_paid", detail: `Factura pagada: ${label}` };
        return { action: "invoice_created", detail: `Factura creada: ${label}` };
      }
      if (operation === "delete")
        return { action: "invoice_deleted", detail: `Factura eliminada: ${prevLabel}` };
      const prevStatus = trimText(previousRow?.status);
      const nextStatus = trimText(nextRow?.status);
      if (nextStatus === "Paid" && prevStatus !== "Paid") {
        return { action: "invoice_paid", detail: `Factura pagada: ${label}` };
      }
      if (nextStatus === "Sent" && prevStatus !== "Sent") {
        return { action: "invoice_sent", detail: `Factura enviada: ${label}` };
      }
      return { action: "invoice_updated", detail: `Factura actualizada: ${label}` };
    }

    case "projects":
      if (operation === "create")
        return { action: "project_created", detail: `Proyecto creado: ${label}` };
      if (operation === "delete")
        return { action: "project_deleted", detail: `Proyecto eliminado: ${prevLabel}` };
      return { action: "project_updated", detail: `Proyecto actualizado: ${label}` };

    case "tasks": {
      if (operation === "create") {
        const status = trimText(nextRow?.status);
        if (status === "Completed")
          return { action: "task_completed", detail: `Tarea completada: ${label}` };
        return { action: "task_created", detail: `Tarea creada: ${label}` };
      }
      if (operation === "delete")
        return { action: "task_deleted", detail: `Tarea eliminada: ${prevLabel}` };
      const prevStatus = trimText(previousRow?.status);
      const nextStatus = trimText(nextRow?.status);
      if (nextStatus === "Completed" && prevStatus !== "Completed") {
        return { action: "task_completed", detail: `Tarea completada: ${label}` };
      }
      return { action: "task_updated", detail: `Tarea actualizada: ${label}` };
    }

    case "clients":
      if (operation === "create")
        return { action: "client_created", detail: `Cliente creado: ${label}` };
      if (operation === "delete")
        return { action: "client_deleted", detail: `Cliente eliminado: ${prevLabel}` };
      return { action: "client_updated", detail: `Cliente actualizado: ${label}` };

    default:
      return null;
  }
}

export async function logActivityEvent(args: ActivityContext) {
  const {
    companyId,
    userId = null,
    action,
    entityType,
    entityId = null,
    detail = null,
    metadata = {},
    dedupeWindowSeconds = 5,
  } = args;

  if (!companyId || !action.trim() || !entityType.trim()) return null;

  try {
    const { data, error } = await (supabase as any).rpc("log_activity_event", {
      p_company_id: companyId,
      p_user_id: userId,
      p_action: action.trim(),
      p_entity_type: entityType.trim(),
      p_entity_id: entityId,
      p_detail: detail,
      p_metadata: metadata || {},
      p_dedupe_window_seconds: dedupeWindowSeconds,
    });

    if (error) {
      console.warn("[activity-log] skipped:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.warn("[activity-log] skipped:", error);
    return null;
  }
}

export async function logCrudActivity(args: {
  companyId: string | null | undefined;
  userId: string | null | undefined;
  table: string;
  operation: CrudOperation;
  previousRow?: Record<string, unknown> | null;
  nextRow?: Record<string, unknown> | null;
}) {
  const { companyId, userId, table, operation, previousRow, nextRow } = args;
  if (!companyId) return;

  const activity = inferCrudActivity({ table, operation, previousRow, nextRow });
  if (!activity) return;

  const entityId = String((nextRow || previousRow || {})?.id || "").trim() || null;
  return logActivityEvent({
    companyId,
    userId,
    action: activity.action,
    entityType: table,
    entityId,
    detail: activity.detail,
    metadata: {
      table,
      operation,
      ...(activity.metadata || {}),
      changed_fields: changedKeys(previousRow, nextRow),
    },
  });
}
