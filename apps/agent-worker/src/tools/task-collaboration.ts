import type { ToolContext, ToolResult } from '../types';

const TASK_SELECT =
	'id,title,description,due_date,priority,status,assigned_to,created_by,related_lead_id,related_client_id,related_deal_id,related_project_id,created_at,updated_at';
const CHECKLIST_SELECT = 'id,task_id,title,is_completed,order_index,created_by,created_at,updated_at';
const COMMENT_SELECT = 'id,task_id,body,created_by,created_at';
const ACTIVITY_SELECT = 'id,task_id,event_type,title,description,metadata,created_by,created_at';
const DRIVE_SELECT = 'id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,created_at';

function clean(value: any) {
	return String(value ?? '').trim();
}

function hasOwn(args: any, key: string) {
	return Object.prototype.hasOwnProperty.call(args ?? {}, key);
}

function optionalString(value: any) {
	if (value === undefined) return undefined;
	const text = clean(value);
	return text || null;
}

function normalizeBool(value: any, fallback = true) {
	if (value === undefined || value === null || value === '') return fallback;
	if (typeof value === 'boolean') return value;

	const text = clean(value).toLowerCase();
	if (['true', '1', 'yes', 'si', 'sí', 'done', 'completed', 'complete', 'checked'].includes(text)) return true;
	if (['false', '0', 'no', 'pending', 'unchecked', 'todo', 'to do'].includes(text)) return false;

	return fallback;
}

async function findTask(ctx: ToolContext, args: any): Promise<ToolResult & { task?: any }> {
	const taskId = clean(args.task_id || args.taskId || args.related_task_id || args.id);
	const queryText = clean(args.query || args.task_title || args.title || args.name);

	let query = ctx.supabase.from('tasks').select(TASK_SELECT).eq('company_id', ctx.companyId);

	if (taskId) {
		query = query.eq('id', taskId);
	} else if (queryText) {
		query = query.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`);
	} else {
		return { ok: false, error: 'Falta el task_id o texto para buscar la tarea.' };
	}

	const { data, error } = await query.order('updated_at', { ascending: false }).limit(5);

	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: false, error: 'No encontré la tarea.' };

	if (data.length > 1 && !taskId) {
		const exact = data.find((task: any) => clean(task.title).toLowerCase() === queryText.toLowerCase());
		if (!exact) {
			return {
				ok: false,
				error: 'Encontré más de una tarea parecida. Indica el ID exacto.',
				data,
			};
		}
		return { ok: true, task: exact, data: exact };
	}

	return { ok: true, task: data[0], data: data[0] };
}

async function findChecklistItem(ctx: ToolContext, args: any): Promise<ToolResult & { task?: any; item?: any }> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const itemId = clean(args.item_id || args.checklist_item_id || args.subtask_id);
	const itemTitle = clean(args.item_title || args.checklist_title || args.subtask_title || args.item || args.subtask);

	let query = ctx.supabase.from('task_checklist_items').select(CHECKLIST_SELECT).eq('task_id', found.task.id);

	if (itemId) {
		query = query.eq('id', itemId);
	} else if (itemTitle) {
		query = query.ilike('title', `%${itemTitle}%`);
	} else {
		return { ok: false, error: 'Falta el item_id o título de la subtarea.', task: found.task };
	}

	const { data, error } = await query.order('order_index', { ascending: true }).limit(10);

	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: false, error: 'No encontré esa subtarea.', task: found.task };

	if (data.length > 1 && !itemId) {
		return {
			ok: false,
			error: 'Encontré más de una subtarea parecida. Indica el item_id exacto.',
			data,
			task: found.task,
		};
	}

	return { ok: true, task: found.task, item: data[0], data: data[0] };
}

async function findComment(ctx: ToolContext, args: any): Promise<ToolResult & { task?: any; comment?: any }> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const commentId = clean(args.comment_id || args.note_id);
	const text = clean(args.comment_query || args.note_query || args.comment || args.note || args.body);

	let query = ctx.supabase.from('task_comments').select(COMMENT_SELECT).eq('task_id', found.task.id);

	if (commentId) {
		query = query.eq('id', commentId);
	} else if (text) {
		query = query.ilike('body', `%${text}%`);
	} else {
		return { ok: false, error: 'Falta el comment_id o texto para buscar el comentario.', task: found.task };
	}

	const { data, error } = await query.order('created_at', { ascending: false }).limit(10);

	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: false, error: 'No encontré ese comentario.', task: found.task };

	if (data.length > 1 && !commentId) {
		return {
			ok: false,
			error: 'Encontré más de un comentario parecido. Indica el comment_id exacto.',
			data,
			task: found.task,
		};
	}

	return { ok: true, task: found.task, comment: data[0], data: data[0] };
}

export async function getTaskDetailTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const [checklist, comments, activity, files] = await Promise.all([
		ctx.supabase
			.from('task_checklist_items')
			.select(CHECKLIST_SELECT)
			.eq('task_id', found.task.id)
			.order('order_index', { ascending: true })
			.order('created_at', { ascending: true }),
		ctx.supabase
			.from('task_comments')
			.select(COMMENT_SELECT)
			.eq('task_id', found.task.id)
			.order('created_at', { ascending: false })
			.limit(20),
		ctx.supabase
			.from('task_activity_events')
			.select(ACTIVITY_SELECT)
			.eq('task_id', found.task.id)
			.order('created_at', { ascending: false })
			.limit(20),
		ctx.supabase
			.from('drive_files')
			.select(DRIVE_SELECT)
			.eq('linked_type', 'task')
			.eq('linked_id', found.task.id)
			.order('created_at', { ascending: false })
			.limit(20),
	]);

	const firstError = checklist.error || comments.error || activity.error || files.error;
	if (firstError) return { ok: false, error: firstError.message };

	return {
		ok: true,
		message: `Detalle de tarea cargado: ${found.task.title}.`,
		data: {
			task: found.task,
			checklist: checklist.data || [],
			comments: comments.data || [],
			activity: activity.data || [],
			drive_files: files.data || [],
		},
	};
}

export async function listTaskChecklistTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const { data, error } = await ctx.supabase
		.from('task_checklist_items')
		.select(CHECKLIST_SELECT)
		.eq('task_id', found.task.id)
		.order('order_index', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: data?.length ? `La tarea tiene ${data.length} subtarea(s).` : 'La tarea no tiene subtareas todavía.',
		data: { task: found.task, checklist: data || [] },
	};
}

export async function addTaskChecklistItemTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const title = clean(args.item_title || args.checklist_title || args.subtask_title || args.item || args.subtask || args.text);
	if (!title) return { ok: false, error: 'Falta el título de la subtarea.' };

	const { data: existing } = await ctx.supabase
		.from('task_checklist_items')
		.select('order_index')
		.eq('task_id', found.task.id)
		.order('order_index', { ascending: false })
		.limit(1);

	const orderIndex = Number(existing?.[0]?.order_index || 0) + 1;

	const { data, error } = await ctx.supabase
		.from('task_checklist_items')
		.insert({
			task_id: found.task.id,
			title,
			order_index: orderIndex,
			created_by: ctx.userId,
		})
		.select(CHECKLIST_SELECT)
		.single();

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Agregué la subtarea "${data.title}" a "${found.task.title}".`,
		data: { task: found.task, item: data },
	};
}

export async function updateTaskChecklistItemTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findChecklistItem(ctx, args);
	if (!found.ok || !found.item) return found;

	const updates: Record<string, any> = {
		updated_at: new Date().toISOString(),
	};

	const nextTitle = optionalString(args.new_title ?? args.item_title ?? args.checklist_title ?? args.subtask_title);
	if (nextTitle !== undefined) updates.title = nextTitle;

	if (hasOwn(args, 'is_completed')) updates.is_completed = normalizeBool(args.is_completed, found.item.is_completed);
	if (hasOwn(args, 'completed')) updates.is_completed = normalizeBool(args.completed, found.item.is_completed);
	if (hasOwn(args, 'done')) updates.is_completed = normalizeBool(args.done, found.item.is_completed);
	if (hasOwn(args, 'order_index')) updates.order_index = Number(args.order_index || found.item.order_index || 0);

	if (Object.keys(updates).length === 1) {
		return { ok: false, error: 'No recibí campos para actualizar la subtarea.' };
	}

	const { data, error } = await ctx.supabase
		.from('task_checklist_items')
		.update(updates)
		.eq('id', found.item.id)
		.eq('task_id', found.task.id)
		.select(CHECKLIST_SELECT)
		.single();

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Actualicé la subtarea "${data.title}".`,
		data: { task: found.task, item: data },
	};
}

export async function completeTaskChecklistItemTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	return updateTaskChecklistItemTool(ctx, { ...args, is_completed: true });
}

export async function deleteTaskChecklistItemTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findChecklistItem(ctx, args);
	if (!found.ok || !found.item) return found;

	const { error } = await ctx.supabase.from('task_checklist_items').delete().eq('id', found.item.id).eq('task_id', found.task.id);

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Eliminé la subtarea "${found.item.title}".`,
		data: { task: found.task, deleted_item: found.item },
	};
}

export async function listTaskCommentsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

	const { data, error } = await ctx.supabase
		.from('task_comments')
		.select(COMMENT_SELECT)
		.eq('task_id', found.task.id)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: data?.length ? `La tarea tiene ${data.length} comentario(s).` : 'La tarea no tiene comentarios internos todavía.',
		data: { task: found.task, comments: data || [] },
	};
}

export async function addTaskCommentTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findTask(ctx, args);
	if (!found.ok || !found.task) return found;

	const body = clean(args.body || args.comment || args.note || args.notes || args.text);
	if (!body) return { ok: false, error: 'Falta el comentario interno para agregar a la tarea.' };

	const { data, error } = await ctx.supabase
		.from('task_comments')
		.insert({
			task_id: found.task.id,
			body,
			created_by: ctx.userId,
		})
		.select(COMMENT_SELECT)
		.single();

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Agregué un comentario interno a "${found.task.title}".`,
		data: { task: found.task, comment: data },
	};
}

export async function deleteTaskCommentTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const found = await findComment(ctx, args);
	if (!found.ok || !found.comment) return found;

	const { error } = await ctx.supabase.from('task_comments').delete().eq('id', found.comment.id).eq('task_id', found.task.id);

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: 'Eliminé el comentario interno de la tarea.',
		data: { task: found.task, deleted_comment: found.comment },
	};
}
