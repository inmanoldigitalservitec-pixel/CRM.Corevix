## 14-worker-tool-execution-flow
```
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:11:const AVAILABLE_TOOLS = [
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:216:function getToolsForScope(scope?: AgentToolScope | null) {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:250:				tools: AVAILABLE_TOOLS,
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:479:	const scopedTools = getToolsForScope(requestedScope);
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:481:	const toolsForPrompt = route === 'crm_tools' ? (scopedTools.length ? scopedTools : [...AVAILABLE_TOOLS]) : [];
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:485:			? buildSystemPrompt(userMessage, history, toolsForPrompt, requestedScope || null)
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:534:	const input = buildFinalResponsePrompt(userMessage, toolCall, toolResult);
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:706:function buildFinalResponsePrompt(userMessage: string, toolCall: any, toolResult: any) {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:804:function buildSystemPrompt(
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:807:	tools: readonly string[] = AVAILABLE_TOOLS,
apps/agent-worker/src/tool-router.ts:144:export async function executeTool(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
apps/agent-worker/src/index.ts:11:const AVAILABLE_TOOLS = [
apps/agent-worker/src/index.ts:216:function getToolsForScope(scope?: AgentToolScope | null) {
apps/agent-worker/src/index.ts:250:				tools: AVAILABLE_TOOLS,
apps/agent-worker/src/index.ts:737:	const scopedTools = getToolsForScope(requestedScope);
apps/agent-worker/src/index.ts:739:	const toolsForPrompt = route === 'crm_tools' ? (scopedTools.length ? scopedTools : [...AVAILABLE_TOOLS]) : [];
apps/agent-worker/src/index.ts:743:			? buildSystemPrompt(userMessage, history, toolsForPrompt, requestedScope || null)
apps/agent-worker/src/index.ts:792:	const input = buildFinalResponsePrompt(userMessage, toolCall, toolResult);
apps/agent-worker/src/index.ts:964:function buildFinalResponsePrompt(userMessage: string, toolCall: any, toolResult: any) {
apps/agent-worker/src/index.ts:1062:function buildSystemPrompt(
apps/agent-worker/src/index.ts:1065:	tools: readonly string[] = AVAILABLE_TOOLS,
apps/agent-worker/src/tool-parser.ts:3:export function parseToolCall(text: string): ToolCall | null {
```
