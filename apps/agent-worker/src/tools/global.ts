import type { ToolContext, ToolResult } from '../types';

const TABLES: Record<string, { table: string; select: string; search?: string[]; title: string }> = {
	leads: {
		table: 'leads',
		select: 'id,first_name,last_name,company_name,phone,email,whatsapp,status,notes,created_at,updated_at',
		search: ['first_name', 'last_name', 'company_name', 'phone', 'email', 'whatsapp', 'notes'],
		title: 'Leads',
	},
	clients: {
		table: 'clients',
		select: 'id,company_name,contact_person,phone,email,whatsapp,status,industry,notes,created_at,updated_at',
		search: ['company_name', 'contact_person', 'phone', 'email', 'whatsapp', 'industry', 'notes'],
		title: 'Clientes',
	},
	deals: {
		table: 'deals',
		select: 'id,name,stage,value,probability,expected_close,notes,created_at,updated_at',
		search: ['name', 'notes'],
		title: 'Oportunidades',
	},
	tasks: {
		table: 'tasks',
		select: 'id,title,description,status,priority,due_date,created_at,updated_at',
		search: ['title', 'description'],
		title: 'Tareas',
	},
	projects: {
		table: 'projects',
		select: 'id,name,description,status,priority,due_date,budget,created_at,updated_at',
		search: ['name', 'description'],
		title: 'Proyectos',
	},
	products: {
		table: 'products',
		select: 'id,name,description,category,type,base_price,currency,is_active,created_at,updated_at',
		search: ['name', 'description', 'category', 'type'],
		title: 'Productos',
	},
};

function appendNote(current: string | null | undefined, note: string) {
	const timestamp = new Date().toISOString();
	const entry = `[${timestamp}] ${note}`;
	return current?.trim() ? `${current.trim()}\n${entry}` : entry;
}

function formatRecord(type: string, row: any, index: number) {
	const title = row.name || row.title || row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.id;
	const subtitle = row.status || row.stage || row.priority || row.email || row.phone || 'Sin estado';
	return `${index + 1}. [${type}] ${title}\n- ID: ${row.id}\n- Estado/contexto: ${subtitle}\n- Actualizado: ${row.updated_at || row.created_at || 'No registrado'}`;
}

export async function globalSearchTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const queryText = String(args.query || '').trim();
	if (!queryText) return { ok: false, error: 'Falta el texto de busqueda global.' };
	const scope = String(args.scope || 'all').trim();
	const limit = Math.min(Math.max(Number(args.limit || 5), 1), 10);

	const entries = Object.entries(TABLES).filter(([key]) => scope === 'all' || key === scope);
	const results: Record<string, any[]> = {};

	for (const [key, config] of entries) {
		if (!config.search?.length) continue;
		const orFilter = config.search.map((column) => `${column}.ilike.%${queryText}%`).join(',');
		const { data, error } = await ctx.supabase
			.from(config.table)
			.select(config.select)
			.eq('company_id', ctx.companyId)
			.or(orFilter)
			.order('updated_at', { ascending: false })
			.limit(limit);
		if (!error && data?.length) results[key] = data;
	}

	const flat = Object.entries(results).flatMap(([key, rows]) => rows.map((row) => ({ type: key, ...row })));
	if (!flat.length) return { ok: true, message: `No encontre resultados para "${queryText}".`, data: results };

	return {
		ok: true,
		message: `Encontre ${flat.length} resultado(s) para "${queryText}":\n\n${flat.map((row, index) => formatRecord(row.type, row, index)).join('\n\n')}`,
		data: results,
	};
}

export async function getRecordByIdTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const type = String(args.type || args.entity_type || '').trim();
	const id = String(args.id || args.record_id || '').trim();
	const config = TABLES[type];

	if (!config) return { ok: false, error: `Tipo no soportado: ${type}.` };
	if (!id) return { ok: false, error: 'Falta el ID del registro.' };

	const { data, error } = await ctx.supabase.from(config.table).select(config.select).eq('company_id', ctx.companyId).eq('id', id).single();

	if (error) return { ok: false, error: error.message };
	return { ok: true, message: `Registro encontrado en ${config.title}.`, data };
}

export async function addGlobalNoteTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const type = String(args.type || args.entity_type || '').trim();
	const id = String(args.id || args.record_id || '').trim();
	const note = String(args.note || args.notes || '').trim();
	const config = TABLES[type];

	if (!config) return { ok: false, error: `Tipo no soportado para notas: ${type}.` };
	if (!['leads', 'clients', 'deals', 'projects'].includes(type)) {
		return { ok: false, error: 'Este tipo no soporta notas globales todavia.' };
	}
	if (!id) return { ok: false, error: 'Falta el ID del registro.' };
	if (!note) return { ok: false, error: 'Falta la nota.' };

	const { data: current, error: findError } = await ctx.supabase
		.from(config.table)
		.select('id,notes')
		.eq('company_id', ctx.companyId)
		.eq('id', id)
		.single();

	if (findError) return { ok: false, error: findError.message };

	const { data, error } = await ctx.supabase
		.from(config.table)
		.update({ notes: appendNote(current.notes, note) })
		.eq('company_id', ctx.companyId)
		.eq('id', id)
		.select(config.select)
		.single();

	if (error) return { ok: false, error: error.message };
	return { ok: true, message: `Nota agregada en ${config.title}.`, data };
}
