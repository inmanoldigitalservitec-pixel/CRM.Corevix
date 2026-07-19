import type { ToolCall } from './types';

export function parseToolCall(text: string): ToolCall | null {
	const cleaned = text
		.trim()
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/```$/i, '')
		.trim();

	try {
		const parsed = JSON.parse(cleaned);

		if (parsed && parsed.type === 'tool_call' && typeof parsed.tool === 'string' && typeof parsed.args === 'object') {
			return parsed as ToolCall;
		}

		return null;
	} catch {
		return null;
	}
}
