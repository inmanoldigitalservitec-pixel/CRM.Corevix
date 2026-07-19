import type { ToolContext, ToolResult } from '../types';

function formatProject(project: any, index: number) {
	return `
${index + 1}. ${project.name ?? 'Proyecto sin nombre'}
- ID: ${project.id}
- Estado: ${project.status ?? 'No definido'}
- Prioridad: ${project.priority ?? 'No registrada'}
- Presupuesto: ${project.budget ?? 'No registrado'}
- Inicio: ${project.start_date ?? 'No registrado'}
- Entrega: ${project.due_date ?? 'No registrada'}
- Lead: ${project.lead_id ?? 'No relacionado'}
- Cliente: ${project.client_id ?? 'No relacionado'}
- Deal: ${project.deal_id ?? 'No relacionado'}
- Descripción: ${project.description ?? 'Sin descripción'}
`.trim();
}

export async function createProjectTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const name = String(args.name || args.title || '').trim();

	if (!name) {
		return { ok: false, error: 'Falta el nombre del proyecto.' };
	}

	const payload = {
		company_id: ctx.companyId,
		name,
		description: args.description ?? null,
		lead_id: args.lead_id ?? null,
		client_id: args.client_id ?? null,
		deal_id: args.deal_id ?? null,
		product_id: args.product_id ?? null,
		budget: args.budget ?? null,
		start_date: args.start_date ?? null,
		due_date: args.due_date ?? null,
		priority: args.priority ?? 'medium',
		status: args.status ?? 'active',
		progress: args.progress ?? 0,
		created_by: ctx.userId,
	};

	const { data, error } = await ctx.supabase
		.from('projects')
		.insert(payload)
		.select('id,name,description,lead_id,client_id,deal_id,product_id,budget,start_date,due_date,priority,status,progress,created_at')
		.single();

	if (error) return { ok: false, error: error.message };

	return {
		ok: true,
		message: `Proyecto creado correctamente: ${data.name}`,
		data,
	};
}

export async function listProjectsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const status = args.status ?? 'all';

	let query = ctx.supabase
		.from('projects')
		.select('id,name,description,lead_id,client_id,deal_id,product_id,budget,start_date,due_date,priority,status,progress,created_at')
		.eq('company_id', ctx.companyId)
		.order('created_at', { ascending: false })
		.limit(20);

	if (status !== 'all') query = query.eq('status', status);

	const { data, error } = await query;

	if (error) return { ok: false, error: error.message };

	if (!data?.length) {
		return { ok: true, message: 'No encontré proyectos registrados.', data: [] };
	}

	return {
		ok: true,
		message: `Encontré ${data.length} proyecto(s):\n\n${data.map(formatProject).join('\n\n')}`,
		data,
	};
}
