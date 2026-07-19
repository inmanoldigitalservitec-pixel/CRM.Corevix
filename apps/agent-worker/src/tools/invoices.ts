import type { ToolContext, ToolResult } from '../types';

function formatInvoice(invoice: any, index: number) {
	return `
${index + 1}. Factura ${invoice.number ?? invoice.id}
- ID: ${invoice.id}
- Estado: ${invoice.status ?? 'No definido'}
- Total: ${invoice.total ?? 'No registrado'}
- Fecha límite: ${invoice.due_date ?? 'No registrada'}
- Cliente: ${invoice.client_id ?? 'No registrado'}
- Creada: ${invoice.created_at ?? 'No registrada'}
`.trim();
}

export async function listUnpaidInvoicesTool(ctx: ToolContext): Promise<ToolResult> {
	const { data, error } = await ctx.supabase
		.from('invoices')
		.select('id,number,client_id,status,total,due_date,created_at')
		.eq('company_id', ctx.companyId)
		.neq('status', 'paid')
		.order('due_date', { ascending: true, nullsFirst: false })
		.limit(20);

	if (error) {
		return { ok: false, error: error.message };
	}

	if (!data?.length) {
		return {
			ok: true,
			message: 'No encontré facturas pendientes de pago.',
			data: [],
		};
	}

	return {
		ok: true,
		message: `Encontré ${data.length} factura(s) pendientes de pago:

${data.map(formatInvoice).join('\n\n')}`,
		data,
	};
}
