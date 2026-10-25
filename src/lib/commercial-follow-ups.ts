import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetch-all-pages";

export type CommercialEntityRef = { type: "lead" | "deal" | "client"; id: string };
export type CommercialChannel = "call" | "whatsapp" | "email" | "meeting" | "other";
export type CommercialOutcome =
  | "contacted"
  | "no_answer"
  | "busy"
  | "callback_requested"
  | "rescheduled"
  | "wrong_contact"
  | "other";
export type FollowUpStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type FollowUpPriority = "low" | "medium" | "high";

export type CommercialFollowUp = {
  id: string;
  companyId: string;
  entity: CommercialEntityRef;
  createdBy: string;
  assigneeUserId: string;
  channel: CommercialChannel;
  objective: string;
  notes: string | null;
  scheduledAt: string;
  timezone: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  reminderMinutesBefore: number | null;
  calendarEventId: string | null;
  taskId: string | null;
  previousFollowUpId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialInteraction = {
  id: string;
  companyId: string;
  followUpId: string | null;
  entity: CommercialEntityRef;
  actorUserId: string;
  assigneeUserId: string | null;
  channel: CommercialChannel;
  occurredAt: string;
  outcome: CommercialOutcome;
  notes: string | null;
  nextStep: string | null;
  createdAt: string;
};

export type CreateFollowUpInput = {
  entity: CommercialEntityRef;
  channel: CommercialChannel;
  objective: string;
  notes?: string | null;
  scheduledAt: string;
  timezone: string;
  assigneeUserId?: string;
  priority?: FollowUpPriority;
  reminderMinutesBefore?: number | null;
  createLinkedTask?: boolean;
  previousFollowUpId?: string;
  idempotencyKey?: string;
};

export type RecordInteractionInput = {
  entity: CommercialEntityRef;
  followUpId?: string | null;
  channel: CommercialChannel;
  occurredAt: string;
  outcome: CommercialOutcome;
  notes?: string | null;
  nextStep?: string | null;
  completeFollowUp?: boolean;
  nextFollowUp?: CreateFollowUpInput;
  idempotencyKey?: string;
};

export type FollowUpListFilters = {
  page?: number;
  pageSize?: number;
  view?: "today" | "upcoming" | "overdue" | "completed" | "cancelled" | "all";
  status?: FollowUpStatus;
  channel?: CommercialChannel;
  assigneeUserId?: string;
  entity?: CommercialEntityRef;
  entityType?: CommercialEntityRef["type"];
  from?: string;
  to?: string;
};

export type CommercialTimelineItem = {
  companyId: string;
  entity: CommercialEntityRef;
  kind: "follow_up" | "interaction" | "audit";
  sourceId: string;
  followUpId: string | null;
  at: string;
  details: Record<string, unknown>;
};

export type CommercialFollowUpMetrics = {
  pending: number;
  overdue: number;
  completed: number;
  contacted: number;
  noAnswer: number;
  upcoming: number;
  byAssignee: Array<{ userId: string; count: number }>;
};

const db = supabase as any;

function entityFromRow(row: any): CommercialEntityRef {
  if (row.lead_id) return { type: "lead", id: String(row.lead_id) };
  if (row.deal_id) return { type: "deal", id: String(row.deal_id) };
  if (row.client_id) return { type: "client", id: String(row.client_id) };
  throw new Error("El registro comercial no tiene entidad relacionada.");
}

function mapFollowUp(row: any): CommercialFollowUp {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    entity: entityFromRow(row),
    createdBy: String(row.created_by),
    assigneeUserId: String(row.assignee_id),
    channel: row.channel,
    objective: String(row.objective),
    notes: row.notes ?? null,
    scheduledAt: String(row.scheduled_at),
    timezone: String(row.timezone),
    status: row.status,
    priority: row.priority,
    reminderMinutesBefore: row.reminder_minutes_before ?? null,
    calendarEventId: row.calendar_event_id ?? null,
    taskId: row.task_id ?? null,
    previousFollowUpId: row.previous_follow_up_id ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapInteraction(row: any): CommercialInteraction {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    followUpId: row.follow_up_id ?? null,
    entity: entityFromRow(row),
    actorUserId: String(row.actor_id),
    assigneeUserId: row.assignee_id ?? null,
    channel: row.channel,
    occurredAt: String(row.occurred_at),
    outcome: row.outcome,
    notes: row.notes ?? null,
    nextStep: row.next_step ?? null,
    createdAt: String(row.created_at),
  };
}

function entityPayload(entity: CommercialEntityRef) {
  return { entity_type: entity.type, entity_id: entity.id };
}

function createPayload(input: CreateFollowUpInput) {
  return {
    ...entityPayload(input.entity),
    channel: input.channel,
    objective: input.objective.trim(),
    notes: input.notes?.trim() || null,
    scheduled_at: input.scheduledAt,
    timezone: input.timezone,
    assignee_id: input.assigneeUserId || null,
    priority: input.priority || "medium",
    reminder_minutes_before: input.reminderMinutesBefore ?? null,
    create_linked_task: Boolean(input.createLinkedTask),
    previous_follow_up_id: input.previousFollowUpId || null,
  };
}

async function action(
  actionName: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const { data, error } = await db.rpc("commercial_follow_up_action", {
    p_action: actionName,
    p_payload: payload,
    p_idempotency_key: idempotencyKey || crypto.randomUUID(),
  });
  if (error) throw new Error(error.message || "No se pudo guardar el seguimiento.");
  return data as { follow_up_id?: string; interaction_id?: string; next_follow_up_id?: string };
}

export function createFollowUp(input: CreateFollowUpInput) {
  return action("create", createPayload(input), input.idempotencyKey);
}

export function recordInteraction(input: RecordInteractionInput) {
  return action(
    "record_interaction",
    {
      ...entityPayload(input.entity),
      follow_up_id: input.followUpId || null,
      channel: input.channel,
      occurred_at: input.occurredAt,
      outcome: input.outcome,
      notes: input.notes?.trim() || null,
      next_step: input.nextStep?.trim() || null,
      complete_follow_up: Boolean(input.completeFollowUp),
      next_follow_up: input.nextFollowUp ? createPayload(input.nextFollowUp) : null,
    },
    input.idempotencyKey,
  );
}

export function rescheduleFollowUp(
  id: string,
  scheduledAt: string,
  timezone: string,
  idempotencyKey?: string,
) {
  return action(
    "reschedule",
    { follow_up_id: id, scheduled_at: scheduledAt, timezone },
    idempotencyKey,
  );
}

export function assignFollowUp(id: string, assigneeUserId: string, idempotencyKey?: string) {
  return action("assign", { follow_up_id: id, assignee_id: assigneeUserId }, idempotencyKey);
}

export function cancelFollowUp(id: string, idempotencyKey?: string) {
  return action("cancel", { follow_up_id: id }, idempotencyKey);
}

export function completeFollowUp(id: string, idempotencyKey?: string) {
  return action("complete", { follow_up_id: id }, idempotencyKey);
}

export async function getFollowUp(id: string): Promise<CommercialFollowUp> {
  const { data, error } = await db.from("commercial_follow_ups").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return mapFollowUp(data);
}

function applyEntity(query: any, entity: CommercialEntityRef) {
  const column =
    entity.type === "lead" ? "lead_id" : entity.type === "deal" ? "deal_id" : "client_id";
  return query.eq(column, entity.id);
}

export async function listFollowUps(
  filters: FollowUpListFilters = {},
): Promise<{ items: CommercialFollowUp[]; total: number }> {
  const page = Math.max(1, Math.floor(filters.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize || 25)));
  let query = db.from("commercial_follow_ups").select("*", { count: "exact" });
  if (filters.entity) query = applyEntity(query, filters.entity);
  if (filters.entityType) query = query.not(`${filters.entityType}_id`, "is", null);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.assigneeUserId) query = query.eq("assignee_id", filters.assigneeUserId);
  if (filters.from) query = query.gte("scheduled_at", filters.from);
  if (filters.to) query = query.lte("scheduled_at", filters.to);

  const today = new Date();
  const now = today.toISOString();
  const startOfTomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ).toISOString();
  switch (filters.view) {
    case "today":
      query = query
        .in("status", ["scheduled", "in_progress"])
        .gte("scheduled_at", now)
        .lt("scheduled_at", startOfTomorrow);
      break;
    case "upcoming":
      query = query.in("status", ["scheduled", "in_progress"]).gte("scheduled_at", now);
      break;
    case "overdue":
      query = query.in("status", ["scheduled", "in_progress"]).lt("scheduled_at", now);
      break;
    case "completed":
    case "cancelled":
      query = query.eq("status", filters.view);
      break;
  }
  const { data, error, count } = await query
    .order("scheduled_at", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  return { items: (data || []).map(mapFollowUp), total: count || 0 };
}

export async function getFollowUpMetrics(): Promise<CommercialFollowUpMetrics> {
  const { data, error } = await db.rpc("commercial_follow_up_metrics");
  if (error) throw new Error(error.message || "No se pudieron cargar las métricas.");
  const result = (data || {}) as Record<string, unknown>;
  return {
    pending: Number(result.pending || 0),
    overdue: Number(result.overdue || 0),
    completed: Number(result.completed || 0),
    contacted: Number(result.contacted || 0),
    noAnswer: Number(result.no_answer || 0),
    upcoming: Number(result.upcoming || 0),
    byAssignee: Array.isArray(result.by_assignee)
      ? result.by_assignee.map((item: any) => ({
          userId: String(item.user_id),
          count: Number(item.count || 0),
        }))
      : [],
  };
}

export async function listTimeline(
  entity: CommercialEntityRef,
): Promise<{ followUps: CommercialFollowUp[]; interactions: CommercialInteraction[] }> {
  const [followUps, interactions] = await Promise.all([
    fetchAllPages<CommercialFollowUp>(async (from, to) => {
      const { data, error } = await applyEntity(
        db.from("commercial_follow_ups").select("*").order("created_at", { ascending: false }),
        entity,
      ).range(from, to);
      if (error) throw new Error(error.message);
      return (data || []).map(mapFollowUp);
    }, 500),
    fetchAllPages<CommercialInteraction>(async (from, to) => {
      const { data, error } = await applyEntity(
        db.from("commercial_interactions").select("*").order("occurred_at", { ascending: false }),
        entity,
      ).range(from, to);
      if (error) throw new Error(error.message);
      return (data || []).map(mapInteraction);
    }, 500),
  ]);
  return { followUps, interactions };
}

export async function listTimelinePage(
  entity: CommercialEntityRef,
  options: { page?: number; pageSize?: number } = {},
): Promise<{ items: CommercialTimelineItem[]; total: number }> {
  const page = Math.max(1, Math.floor(options.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize || 20)));
  const { data, error, count } = await db
    .from("commercial_timeline")
    .select("company_id,entity_type,entity_id,kind,source_id,follow_up_id,at,details", {
      count: "exact",
    })
    .eq("entity_type", entity.type)
    .eq("entity_id", entity.id)
    .order("at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  return {
    items: (data || []).map((row: any) => ({
      companyId: String(row.company_id),
      entity,
      kind: row.kind,
      sourceId: String(row.source_id),
      followUpId: row.follow_up_id ?? null,
      at: String(row.at),
      details: row.details || {},
    })),
    total: count || 0,
  };
}

export async function listFollowUpInteractions(
  followUpId: string,
): Promise<CommercialInteraction[]> {
  return fetchAllPages<CommercialInteraction>(async (from, to) => {
    const { data, error } = await db
      .from("commercial_interactions")
      .select("*")
      .eq("follow_up_id", followUpId)
      .order("occurred_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return (data || []).map(mapInteraction);
  }, 500);
}
