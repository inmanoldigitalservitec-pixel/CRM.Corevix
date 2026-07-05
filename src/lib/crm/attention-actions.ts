import type {
  AttentionActionType,
  AttentionRecommendedAction,
  AttentionSourceRef,
  ScoredAttentionEvent,
} from "@/lib/crm/attention-engine";

type AttentionActionDraft = {
  type: AttentionActionType;
  label: string;
  reason: string;
  payload?: Record<string, string | number | boolean | null>;
};

function actionId(event: ScoredAttentionEvent, type: AttentionActionType) {
  return [
    event.module,
    event.ruleId,
    event.sourceType || "source",
    event.sourceId || event.id,
    type,
  ].join("::");
}

function fallbackTarget(event: ScoredAttentionEvent): AttentionSourceRef {
  return (
    event.source || {
      type: event.sourceType || event.module,
      id: event.sourceId,
      label: event.title,
      href: event.href,
      status: event.status || null,
    }
  );
}

function toAction(
  event: ScoredAttentionEvent,
  draft: AttentionActionDraft,
): AttentionRecommendedAction {
  return {
    id: actionId(event, draft.type),
    type: draft.type,
    label: draft.label,
    reason: draft.reason,
    module: event.module,
    target: fallbackTarget(event),
    priority: event.severity,
    requiresConfirmation: true,
    payload: draft.payload,
  };
}

function contactPayload(event: ScoredAttentionEvent) {
  return {
    sourceType: event.sourceType || null,
    sourceId: event.sourceId || null,
    clientId: event.context?.client?.id || null,
    leadId: event.context?.lead?.id || null,
    projectId: event.context?.project?.id || null,
    title: event.title,
  };
}

function taskPayload(event: ScoredAttentionEvent, title: string) {
  return {
    title,
    relatedClientId: event.context?.client?.id || null,
    relatedLeadId: event.context?.lead?.id || null,
    relatedProjectId: event.context?.project?.id || null,
    sourceType: event.sourceType || null,
    sourceId: event.sourceId || null,
  };
}

function isEventOverdue(event: ScoredAttentionEvent) {
  if (event.signal?.timing === "overdue" || event.signal?.timing === "past") return true;
  if (!event.dueAt) return false;
  const dueMs = Date.parse(event.dueAt);
  return Number.isFinite(dueMs) ? dueMs < Date.now() : false;
}

export function buildAttentionActions(event: ScoredAttentionEvent): AttentionRecommendedAction[] {
  const reason = event.context?.urgencyReason || event.signal?.reason || event.summary;
  const recommendation =
    event.context?.recommendation || event.recommendedAction || event.signal?.recommendedAction;
  const drafts: AttentionActionDraft[] = [];

  if (event.module === "leads") {
    drafts.push({
      type: "create_task",
      label: "Crear tarea de seguimiento",
      reason,
      payload: taskPayload(event, `Seguimiento: ${event.title}`),
    });
    drafts.push({
      type: "schedule_call",
      label: "Agendar llamada",
      reason: "El lead necesita una próxima interacción clara.",
      payload: contactPayload(event),
    });
  }

  if (event.module === "clients" && event.ruleId === "vip_client_stale") {
    drafts.push({
      type: "schedule_call",
      label: "Agendar seguimiento VIP",
      reason,
      payload: contactPayload(event),
    });
    drafts.push({
      type: "create_task",
      label: "Crear tarea para responsable",
      reason: "El cliente VIP necesita una acción visible.",
      payload: taskPayload(event, `Seguimiento VIP: ${event.title}`),
    });
  }

  if (event.ruleId === "client_product_renewal_due_soon") {
    drafts.push({
      type: "send_reminder",
      label: "Enviar recordatorio de renovación",
      reason,
      payload: contactPayload(event),
    });
    drafts.push({
      type: "draft_email",
      label: "Redactar email de renovación",
      reason: "Conviene contactar al cliente antes del vencimiento.",
      payload: contactPayload(event),
    });
  }

  if (event.module === "tasks") {
    if (isEventOverdue(event)) {
      drafts.push({
        type: "move_due_date",
        label: "Mover fecha de entrega",
        reason,
        payload: {
          sourceType: event.sourceType || null,
          sourceId: event.sourceId || null,
          currentDueAt: event.dueAt || null,
        },
      });
      drafts.push({
        type: "reassign_owner",
        label: "Reasignar tarea",
        reason: "La tarea vencida puede necesitar nuevo responsable o escalamiento.",
        payload: contactPayload(event),
      });
    }
    drafts.push({
      type: "mark_resolved",
      label: "Marcar como resuelta",
      reason: "Si ya fue atendida, conviene cerrar la señal de atención.",
      payload: contactPayload(event),
    });
  }

  if (event.module === "invoices") {
    drafts.push({
      type: "send_reminder",
      label: "Enviar recordatorio de pago",
      reason,
      payload: {
        ...contactPayload(event),
        amount: event.context?.amount?.value ?? null,
        dueAt: event.dueAt || null,
      },
    });
    drafts.push({
      type: "create_task",
      label: "Crear tarea de cobro",
      reason: "El seguimiento financiero debe quedar asignado.",
      payload: taskPayload(event, `Seguimiento de cobro: ${event.title}`),
    });
  }

  if (event.module === "proposals") {
    drafts.push({
      type: "draft_email",
      label: "Redactar email de seguimiento",
      reason,
      payload: contactPayload(event),
    });
    drafts.push({
      type: "schedule_call",
      label: "Agendar llamada comercial",
      reason: "La propuesta necesita una respuesta o siguiente paso.",
      payload: contactPayload(event),
    });
  }

  if (event.module === "projects") {
    drafts.push({
      type: "create_task",
      label: "Crear tarea de desbloqueo",
      reason,
      payload: taskPayload(event, `Revisar riesgo: ${event.title}`),
    });
    drafts.push({
      type: "reassign_owner",
      label: "Reasignar responsable",
      reason: "Un proyecto en riesgo puede necesitar ownership explícito.",
      payload: contactPayload(event),
    });
  }

  if (event.module === "calendar") {
    if (event.ruleId === "calendar_meeting_missing_outcome") {
      drafts.push({
        type: "record_outcome",
        label: "Registrar resultado de reunión",
        reason,
        payload: contactPayload(event),
      });
      drafts.push({
        type: "create_task",
        label: "Crear próxima acción",
        reason: "Una reunión pasada debe dejar un siguiente paso.",
        payload: taskPayload(event, `Próxima acción: ${event.title}`),
      });
    } else {
      drafts.push({
        type: "review_record",
        label: "Revisar evento",
        reason: recommendation || reason,
        payload: contactPayload(event),
      });
    }
  }

  if (event.module === "tickets") {
    drafts.push({
      type: "escalate_ticket",
      label: "Escalar ticket",
      reason,
      payload: contactPayload(event),
    });
    drafts.push({
      type: "create_task",
      label: "Crear tarea de soporte",
      reason: "El seguimiento del ticket debe quedar visible.",
      payload: taskPayload(event, `Atender ticket: ${event.title}`),
    });
  }

  if (event.module === "inbox") {
    drafts.push({
      type: "review_record",
      label: "Revisar conversaciones",
      reason,
      payload: contactPayload(event),
    });
  }

  return drafts.map((draft) => toAction(event, draft));
}

export function attachAttentionActions<T extends ScoredAttentionEvent>(event: T): T {
  return {
    ...event,
    actions: event.actions?.length ? event.actions : buildAttentionActions(event),
  };
}

export function attachAttentionActionsToEvents<T extends ScoredAttentionEvent>(events: T[]): T[] {
  return events.map(attachAttentionActions);
}
