import type { ToolContext, ToolResult } from '../types';

function formatProduct(product: any, index: number) {
	return `
${index + 1}. ${product.name}
- ID: ${product.id}
- Tipo: ${product.type ?? 'No definido'}
- Categoría: ${product.category ?? 'No registrada'}
- Precio base: ${product.base_price ?? 'No registrado'} ${product.currency ?? ''}
- Duración: ${product.duration_days ?? 'No registrada'}
- Activo: ${product.is_active === false ? 'No' : 'Sí'}
- Descripción: ${product.description ?? 'Sin descripción'}
`.trim();
}

export async function searchProductsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const queryText = String(args.query || args.name || '').trim();

	let query = ctx.supabase
		.from('products')
		.select('id,name,type,category,description,base_price,currency,duration_days,is_active,created_at')
		.eq('company_id', ctx.companyId)
		.order('name', { ascending: true })
		.limit(15);

	if (queryText) {
		query = query.or(`name.ilike.%${queryText}%,category.ilike.%${queryText}%,description.ilike.%${queryText}%`);
	}

	const { data, error } = await query;

	if (error) return { ok: false, error: error.message };

	if (!data?.length) {
		return {
			ok: true,
			message: queryText ? `No encontré productos relacionados con "${queryText}".` : 'No encontré productos registrados.',
			data: [],
		};
	}

	return {
		ok: true,
		message: `Encontré ${data.length} producto(s):\n\n${data.map(formatProduct).join('\n\n')}`,
		data,
	};
}
