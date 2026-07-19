import type { ToolContext, ToolResult } from '../types';

const TASK_STATUSES = ['To Do', 'In Progress', 'Completed', 'Cancelled'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const EVENT_TYPES = ['event', 'reminder', 'call', 'meeting', 'demo', 'task'];
const EVENT_STATUSES = ['scheduled', 'completed', 'cancelled'];

const TASK_SELECT =
	'id,title,description,due_date,priority,status,assigned_to,created_by,related_lead_id,related_client_id,related_deal_id,related_project_id,created_at,updated_at';
const EVENT_SELECT = 'id,title,description,location,type,status,start_at,end_at,all_day,related_task_id,created_at,updated_at';

function normalizeTaskStatus(value: any, fallback = 'To Do') {
	const raw = String(value || fallback).trim();
	const lower = raw.toLowerCase();
	if (['pending', 'todo', 'to_do', 'to do', 'open'].includes(lower)) return 'To Do';
	if (['in_progress', 'in progress', 'progress', 'doing'].includes(lower)) return 'In Progress';
	if (['completed', 'complete', 'done', 'closed'].includes(lower)) return 'Completed';
	if (['cancelled', 'canceled', 'cancel'].includes(lower)) return 'Cancelled';
	return TASK_STATUSES.includes(raw) ? raw : fallback;
}

function normalizePriority(value: any, fallback = 'Medium') {
	const raw = String(value || fallback).trim();
	const lower = raw.toLowerCase();
	if (lower === 'low') return 'Low';
	if (lower === 'medium') return 'Medium';
	if (lower === 'high') return 'High';
	if (lower === 'urgent') return 'Urgent';
	return TASK_PRIORITIES.includes(raw) ? raw : fallback;
}

function normalizeEventType(value: any, fallback = 'event') {
	const raw = String(value || fallback)
		.trim()
		.toLowerCase();
	return EVENT_TYPES.includes(raw) ? raw : fallback;
}

function normalizeEventStatus(value: any, fallback = 'scheduled') {
	const raw = String(value || fallback)
		.trim()
		.toLowerCase();
	return EVENT_STATUSES.includes(raw) ? raw : fallback;
}

function hasOwn(args: any, key: string) {
	return Object.prototype.hasOwnProperty.call(args ?? {}, key);
}

function optionalString(value: any) {
	if (value === undefined) return undefined;
	const text = String(value ?? '').trim();
	return text || null;
}

function appendNote(current: string | null | undefined, note: string) {
	const timestamp = new Date().toISOString();
	const entry = `[${timestamp}] ${note}`;
	return current?.trim() ? `${current.trim()}\n${entry}` : entry;
}

function formatTask(task: any, index: number) {
	return `
${index + 1}. ${task.title ?? 'Tarea sin titulo'}
- ID: ${task.id}
- Estado: ${task.status ?? 'No definido'}
- Prioridad: ${task.priority ?? 'No definida'}
- Fecha limite: ${task.due_date ?? 'Sin fecha'}
- Descripcion: ${task.description ?? 'Sin descripcion'}
`.trim();
}

function formatEvent(event: any, index: number) {
	return `
${index + 1}. ${event.title ?? 'Evento sin titulo'}
- ID: ${event.id}
- Tipo: ${event.type ?? 'event'}
- Estado: ${event.status ?? 'scheduled'}
- Inicio: ${event.start_at ?? 'Sin fecha'}
- Fin: ${event.end_at ?? 'Sin fecha'}
- Todo el dia: ${event.all_day ? 'Si' : 'No'}
- Ubicacion: ${event.location ?? 'Sin ubicacion'}
- Descripcion: ${event.description ?? 'Sin descripcion'}
`.trim();
}

async function findTask(ctx: ToolContext, args: any): Promise<ToolResult & { task?: any }> {
	const taskId = String(args.task_id || args.id || '').trim();
	const queryText = String(args.query || args.title || args.name || '').trim();

	let query = ctx.supabase.from('tasks').select(TASK_SELECT).eq('company_id', ctx.companyId);

	if (taskId) {
		query = query.eq('id', taskId);
	} else if (queryText) {
		query = query.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`);
	} else {
		return { ok: false, error: 'Falta el task_id o texto para buscar la tarea.' };
	}

	const { data: matches, error } = await query.order('updated_at', { ascending: false }).limit(5);
	if (error) return { ok: false, error: error.message };
	if (!matches?.length) return { ok: false, error: 'No encontré la tarea.' };

	if (matches.length > 1 && !taskId) {
		const normalizedQuery = queryText.toLowerCase().trim();
		const exact = matches.find(
			(item: any) =>
				String(item.title || '')
					.toLowerCase()
					.trim() === normalizedQuery,
		);
		if (!exact) {
			return {
				ok: false,
				error: 'Encontré más de una tarea parecida. Indica el ID exacto de la tarea.',
				data: matches,
			};
		}
		return { ok: true, task: exact, data: exact };
	}

	return { ok: true, task: matches[0], data: matches[0] };
}

async function findCalendarEvent(ctx: ToolContext, args: any): Promise<ToolResult & { event?: any }> {
	const eventId = String(args.event_id || args.calendar_event_id || args.id || '').trim();
	const queryText = String(args.query || args.title || args.name || '').trim();

	let query = ctx.supabase.from('calendar_events').select(EVENT_SELECT).eq('company_id', ctx.companyId);

	if (eventId) {
		query = query.eq('id', eventId);
	} else if (queryText) {
		query = query.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%,location.ilike.%${queryText}%`);
	} else {
		return { ok: false, error: 'Falta el event_id o texto para buscar el evento.' };
	}

	const { data: matches, error } = await query.order('start_at', { ascending: true }).limit(5);
	if (error) return { ok: false, error: error.message };
	if (!matches?.length) return { ok: false, error: 'No encontré el evento.' };

	if (matches.length > 1 && !eventId) {
		const normalizedQuery = queryText.toLowerCase().trim();
		const exact = matches.find(
			(item: any) =>
				String(item.title || '')
					.toLowerCase()
					.trim() === normalizedQuery,
		);
		if (!exact) {
			return {
				ok: false,
				error: 'Encontré más de un evento parecido. Indica el ID exacto del evento.',
				data: matches,
			};
		}
		return { ok: true, event: exact, data: exact };
	}

	return { ok: true, event: matches[0], data: matches[0] };
}

async function createNotification(ctx: ToolContext, title: string, message: string, type: string, link = '/calendar') {
	await ctx.supabase.from('notifications').insert({
		company_id: ctx.companyId,
		user_id: ctx.userId,
		title,
		message,
		type,
		link,
		read: false,
	});
}

async function upsertCalendarEventForTask(ctx: ToolContext, task: any, calendarType = 'task') {
	if (!task?.due_date) return null;

	const eventPayload = {
		company_id: ctx.companyId,
		user_id: ctx.userId,
		title: task.title,
		description: task.description ?? null,
		type: normalizeEventType(calendarType, 'task'),
		status: task.status === 'Completed' ? 'completed' : task.status === 'Cancelled' ? 'cancelled' : 'scheduled',
		start_at: task.due_date,
		all_day: true,
		related_task_id: task.id,
		metadata: {
			created_from: 'corevix_agent',
			task_id: task.id,
		},
	};

	const { data: existing } = await ctx.supabase
		.from('calendar_events')
		.select('id')
		.eq('company_id', ctx.companyId)
		.eq('related_task_id', task.id)
		.limit(1);

	if (existing?.[0]?.id) {
		const { data } = await ctx.supabase
			.from('calendar_events')
			.update(eventPayload)
			.eq('company_id', ctx.companyId)
			.eq('id', existing[0].id)
			.select(EVENT_SELECT)
			.single();
		return data ?? null;
	}

	const { data } = await ctx.supabase.from('calendar_events').insert(eventPayload).select(EVENT_SELECT).single();
	return data ?? null;
}

export async function createTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const title = String(args.title || '').trim();

	if (!title) {
		return { ok: false, error: 'Falta el título de la tarea.' };
	}

	const payload = {
		company_id: ctx.companyId,
		title,
		description: args.description ?? null,
		due_date: args.due_date ?? null,
		priority: normalizePriority(args.priority),
		status: normalizeTaskStatus(args.status),
		assigned_to: args.assigned_to ?? null,
		created_by: ctx.userId,
		related_lead_id: args.related_lead_id ?? null,
		related_client_id: args.related_client_id ?? null,
		related_deal_id: args.related_deal_id ?? null,
		related_project_id: args.related_project_id ?? null,
	};

	const { data, error } = await ctx.supabase.from('tasks').insert(payload).select(TASK_SELECT).single();

	if (error) return { ok: false, error: error.message };

	let calendar_event = null;
	if (data?.due_date) {
		const calendarType = args.calendar_type || 'task';
		const notificationTitle =
			calendarType === 'demo' ? 'Demo CRM creada' : calendarType === 'reminder' ? 'Recordatorio creado' : 'Tarea creada';

		await createNotification(ctx, notificationTitle, `${data.title} quedó programado para ${data.due_date}.`, calendarType);
		calendar_event = await upsertCalendarEventForTask(ctx, data, calendarType);
	}

	return {
		ok: true,
		message: `Listo, creé la tarea "${data.title}".`,
		data: { task: data, calendar_event },
	};
}

export async function createReminderTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	return createTaskTool(ctx, {
		...args,
		title: args.title || args.reminder || 'Recordatorio',
		description: args.description || args.notes || 'Recordatorio creado desde Corevix AI.',
		priority: args.priority || 'Medium',
		status: args.status || 'To Do',
		calendar_type: 'reminder',
	});
}

export async function createCrmDemoTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const leadName = args.lead_name || args.client_name || args.name || 'prospecto';
	const dueDate = args.due_date || args.demo_date || null;

	return createTaskTool(ctx, {
		...args,
		title: args.title || `Demo CRM con ${leadName}`,
		description:
			args.description ||
			`Preparar y realizar demo del CRM con ${leadName}.${args.phone ? ` Teléfono: ${args.phone}.` : ''}${args.notes ? ` Notas: ${args.notes}` : ''}`,
		due_date: dueDate,
		priority: args.priority || 'High',
		status: 'To Do',
		calendar_type: 'demo',
	});
}

export async function listTasksTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const status = String(args.status ?? 'To Do').trim();
	const normalizedStatus = status === 'all' ? 'all' : normalizeTaskStatus(status);
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

	let query = ctx.supabase
		.from('tasks')
		.select(TASK_SELECT)
		.eq('company_id', ctx.companyId)
		.order('due_date', { ascending: true, nullsFirst: false })
		.limit(limit);

	if (normalizedStatus !== 'all') {
		query = query.eq('status', normalizedStatus);
	}

	const { data, error } = await query;

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: data?.length
			? `Tienes ${data.length} tarea(s) ${normalizedStatus === 'all' ? '' : normalizedStatus}.`
			: 'No encontré tareas para ese filtro.',
		data,
	};
}

export async function updateTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const updates: Record<string, any> = {};
	for (const key of [
		'title',
		'description',
		'due_date',
		'assigned_to',
		'related_lead_id',
		'related_client_id',
		'related_deal_id',
		'related_project_id',
	]) {
		if (hasOwn(args, key)) updates[key] = optionalString(args[key]);
	}

	if (hasOwn(args, 'status')) updates.status = normalizeTaskStatus(args.status, found.task.status || 'To Do');
	if (hasOwn(args, 'priority')) updates.priority = normalizePriority(args.priority, found.task.priority || 'Medium');
	if (hasOwn(args, 'note') || hasOwn(args, 'notes')) {
		const note = String(args.note || args.notes || '').trim();
		if (note) updates.description = appendNote(found.task.description, note);
	}

	if (Object.keys(updates).length === 0) return { ok: false, error: 'No recibí campos para actualizar.' };

	const { data, error } = await ctx.supabase
		.from('tasks')
		.update(updates)
		.eq('company_id', ctx.companyId)
		.eq('id', found.task.id)
		.select(TASK_SELECT)
		.single();

	if (error) return { ok: false, error: error.message };

	const calendar_event = await upsertCalendarEventForTask(ctx, data, args.calendar_type || 'task');

	return {
		ok: true,
		message: `Actualicé la tarea "${data.title}".`,
		data: { task: data, calendar_event },
	};
}

export async function completeTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	return updateTaskTool(ctx, { ...args, status: 'Completed' });
}

export async function rescheduleTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const dueDate = args.due_date || args.date || args.start_at;
	if (!dueDate) return { ok: false, error: 'Falta la nueva fecha de la tarea.' };
	return updateTaskTool(ctx, { ...args, due_date: dueDate });
}

export async function addTaskNoteTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const note = String(args.note || args.notes || '').trim();
	if (!note) return { ok: false, error: 'Falta la nota para agregar a la tarea.' };
	return updateTaskTool(ctx, { ...args, note });
}

export async function createCalendarEventTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const title = String(args.title || args.name || '').trim();
	const startAt = String(args.start_at || args.date || args.due_date || '').trim();

	if (!title) return { ok: false, error: 'Falta el título del evento.' };
	if (!startAt) return { ok: false, error: 'Falta la fecha de inicio del evento.' };

	const payload = {
		company_id: ctx.companyId,
		user_id: ctx.userId,
		title,
		description: args.description ?? args.notes ?? null,
		location: args.location ?? null,
		type: normalizeEventType(args.type || args.calendar_type),
		status: normalizeEventStatus(args.status),
		start_at: startAt,
		end_at: args.end_at ?? null,
		all_day: Boolean(args.all_day ?? false),
		related_task_id: args.related_task_id ?? null,
		metadata: {
			created_from: 'corevix_agent',
			raw_args: args,
		},
	};

	const { data, error } = await ctx.supabase.from('calendar_events').insert(payload).select(EVENT_SELECT).single();
	if (error) return { ok: false, error: error.message };

	await createNotification(ctx, 'Evento creado', `${data.title} quedó programado para ${data.start_at}.`, data.type || 'event');

	return {
		ok: true,
		message: `Creé el evento "${data.title}" en el calendario.`,
		data,
	};
}

export async function listCalendarEventsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);
	const type = String(args.type || 'all')
		.trim()
		.toLowerCase();
	const status = String(args.status || 'all')
		.trim()
		.toLowerCase();

	let query = ctx.supabase
		.from('calendar_events')
		.select(EVENT_SELECT)
		.eq('company_id', ctx.companyId)
		.order('start_at', { ascending: true })
		.limit(limit);

	if (type !== 'all') query = query.eq('type', normalizeEventType(type));
	if (status !== 'all') query = query.eq('status', normalizeEventStatus(status));
	if (args.from) query = query.gte('start_at', args.from);
	if (args.to) query = query.lte('start_at', args.to);

	const { data, error } = await query;
	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: data?.length ? `Encontré ${data.length} evento(s) en calendario.` : 'No encontré eventos para ese filtro.',
		data,
	};
}

export async function updateCalendarEventTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findCalendarEvent(ctx, args);
	if (!found.ok || !found.event) return found;

	const updates: Record<string, any> = {};
	for (const key of ['title', 'description', 'location', 'start_at', 'end_at', 'related_task_id']) {
		if (hasOwn(args, key)) updates[key] = optionalString(args[key]);
	}
	if (hasOwn(args, 'date') && !hasOwn(args, 'start_at')) updates.start_at = optionalString(args.date);
	if (hasOwn(args, 'all_day')) updates.all_day = Boolean(args.all_day);
	if (hasOwn(args, 'type')) updates.type = normalizeEventType(args.type, found.event.type || 'event');
	if (hasOwn(args, 'status')) updates.status = normalizeEventStatus(args.status, found.event.status || 'scheduled');

	if (Object.keys(updates).length === 0) return { ok: false, error: 'No recibí campos para actualizar.' };

	const { data, error } = await ctx.supabase
		.from('calendar_events')
		.update(updates)
		.eq('company_id', ctx.companyId)
		.eq('id', found.event.id)
		.select(EVENT_SELECT)
		.single();

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Actualicé el evento "${data.title}".`,
		data,
	};
}

export async function cancelCalendarEventTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	return updateCalendarEventTool(ctx, { ...args, status: 'cancelled' });
}
