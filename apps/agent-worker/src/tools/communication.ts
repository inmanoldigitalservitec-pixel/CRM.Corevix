import type { ToolContext, ToolResult } from '../types';

function formatConversation(row: any, index: number) {
	return `
${index + 1}. ${row.subject || row.display_name || row.contact_name || row.sender_name || row.phone || 'Conversacion sin titulo'}
- ID: ${row.id || row.conversation_id}
- Estado: ${row.status || row.conversation_status || 'No definido'}
- No leidos: ${row.unread_count ?? 0}
- Ultimo mensaje: ${row.last_message_at || row.conversation_updated_at || 'No registrado'}
- Resumen: ${row.snippet || row.last_message || row.last_message_text || 'Sin resumen'}
`.trim();
}

function formatMessage(row: any, index: number) {
	return `
${index + 1}. ${row.subject || row.direction || 'Mensaje'}
- ID: ${row.id}
- De: ${row.sender || row.from_email || row.from || row.contact_name || 'No registrado'}
- Para: ${row.recipient || row.to_email || row.to || 'No registrado'}
- Fecha: ${row.sent_at || row.created_at || row.timestamp || 'No registrada'}
- Texto: ${row.snippet || row.body || row.text || row.message || row.content || 'Sin texto'}
`.trim();
}

export async function listEmailThreadsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const status = String(args.status || 'all').trim();
	const provider = String(args.provider || 'gmail').trim();
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

	let query = ctx.supabase
		.from('email_conversations')
		.select('id,subject,status,unread_count,last_message_at,snippet,provider,tags')
		.eq('company_id', ctx.companyId)
		.order('last_message_at', { ascending: false, nullsFirst: false })
		.limit(limit);

	if (provider !== 'all') query = query.eq('provider', provider);
	if (status !== 'all') query = query.eq('status', status);

	const { data, error } = await query;
	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: true, message: 'No encontré conversaciones de email para ese filtro.', data: [] };

	return {
		ok: true,
		message: `Encontré ${data.length} conversaciones de email:\n\n${data.map(formatConversation).join('\n\n')}`,
		data,
	};
}

export async function searchEmailMessagesTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const queryText = String(args.query || '').trim();
	if (!queryText) return { ok: false, error: 'Falta el texto para buscar en emails.' };
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

	const { data, error } = await ctx.supabase
		.from('email_messages')
		.select('id,conversation_id,sender,recipient,from_email,to_email,subject,body,snippet,direction,is_read,sent_at,created_at')
		.eq('company_id', ctx.companyId)
		.or(
			`subject.ilike.%${queryText}%,body.ilike.%${queryText}%,snippet.ilike.%${queryText}%,sender.ilike.%${queryText}%,from_email.ilike.%${queryText}%`,
		)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: true, message: `No encontré emails relacionados con "${queryText}".`, data: [] };

	return {
		ok: true,
		message: `Encontré ${data.length} email(s) relacionados con "${queryText}":\n\n${data.map(formatMessage).join('\n\n')}`,
		data,
	};
}

export async function draftEmailReplyTool(_ctx: ToolContext, args: any): Promise<ToolResult> {
	const recipient = String(args.to || args.recipient || '').trim();
	const subject = String(args.subject || 'Seguimiento').trim();
	const intent = String(args.intent || args.message || args.notes || '').trim();

	if (!intent) return { ok: false, error: 'Falta la intención o contenido del borrador.' };

	const body = [recipient ? `Para: ${recipient}` : null, `Asunto: ${subject}`, '', 'Hola,', '', intent, '', 'Quedo atento.']
		.filter((line) => line !== null)
		.join('\n');

	return {
		ok: true,
		message: 'Preparé un borrador de email. No fue enviado.',
		data: { to: recipient || null, subject, body, sent: false },
	};
}

export async function listInboxConversationsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const channel = String(args.channel || 'all').trim();
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);
	const results: Record<string, any[]> = {};

	if (channel === 'all' || channel === 'whatsapp') {
		const { data, error } = await ctx.supabase
			.from('crm_whatsapp_conversation_list')
			.select('*')
			.eq('company_id', ctx.companyId)
			.order('last_message_at', { ascending: false, nullsFirst: false })
			.limit(limit);
		if (!error) results.whatsapp = data || [];
	}

	if (channel === 'all' || channel === 'messenger') {
		const { data, error } = await ctx.supabase
			.from('meta_conversations')
			.select('*')
			.eq('company_id', ctx.companyId)
			.eq('channel', 'messenger')
			.order('last_message_at', { ascending: false, nullsFirst: false })
			.limit(limit);
		if (!error) results.messenger = data || [];
	}

	if (channel === 'all' || channel === 'instagram') {
		const { data, error } = await ctx.supabase
			.from('meta_conversations')
			.select('*')
			.eq('company_id', ctx.companyId)
			.eq('channel', 'instagram')
			.order('last_message_at', { ascending: false, nullsFirst: false })
			.limit(limit);
		if (!error) results.instagram = data || [];
	}

	const flat = Object.entries(results).flatMap(([source, rows]) => rows.map((row) => ({ source, ...row })));
	if (!flat.length) return { ok: true, message: 'No encontré conversaciones de bandeja para ese filtro.', data: results };

	return {
		ok: true,
		message: `Encontré ${flat.length} conversación(es) en bandeja:\n\n${flat.slice(0, limit).map(formatConversation).join('\n\n')}`,
		data: results,
	};
}

export async function listWhatsappMessagesTool(ctx: ToolContext, args: any): Promise<ToolResult> {
	const conversationId = String(args.conversation_id || args.id || '').trim();
	if (!conversationId) return { ok: false, error: 'Falta conversation_id.' };
	const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

	const { data, error } = await ctx.supabase
		.from('crm_whatsapp_messages')
		.select('*')
		.eq('company_id', ctx.companyId)
		.eq('conversation_id', conversationId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) return { ok: false, error: error.message };
	if (!data?.length) return { ok: true, message: 'No encontré mensajes para esa conversación.', data: [] };

	return {
		ok: true,
		message: `Últimos ${data.length} mensajes:\n\n${data.map(formatMessage).join('\n\n')}`,
		data,
	};
}

export async function draftWhatsappReplyTool(_ctx: ToolContext, args: any): Promise<ToolResult> {
	const channel = String(args.channel || 'whatsapp').trim();
	const recipient = String(args.to || args.phone || args.recipient || '').trim();
	const intent = String(args.intent || args.message || args.notes || '').trim();

	if (!intent) return { ok: false, error: 'Falta la intención o contenido del borrador.' };

	return {
		ok: true,
		message: `Preparé un borrador para ${channel}. No fue enviado.`,
		data: {
			channel,
			to: recipient || null,
			body: intent,
			sent: false,
			note: 'El CRM todavía no debe enviar mensajes desde el agente en esta fase.',
		},
	};
}
