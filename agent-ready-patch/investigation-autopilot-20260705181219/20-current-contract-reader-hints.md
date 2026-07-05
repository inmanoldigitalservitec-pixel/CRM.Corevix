## 20-current-contract-reader-hints
```
src/components/dashboard-v2/dashboard-v2.tsx:29:import { fetchAgentWidgetContract } from "@/lib/agentClient";
src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
src/components/dashboard-v2/dashboard-v2.tsx:1569:        recovery_plans: [],
src/components/dashboard-v2/dashboard-v2.tsx:1585:        recovery_plans: [],
src/components/agent/agentWidgetContract.ts:3:export type AgentWidgetContractStatus =
src/components/agent/agentWidgetContract.ts:13:export type AgentWidgetContractSummary = {
src/components/agent/agentWidgetContract.ts:47:export type AgentWidgetContractV1 = {
src/components/agent/agentWidgetContract.ts:49:  status: AgentWidgetContractStatus;
src/components/agent/agentWidgetContract.ts:51:  summary: AgentWidgetContractSummary;
src/components/agent/agentWidgetContract.ts:52:  recovery_plans: AgentWidgetRecoveryPlan[];
src/components/agent/agentWidgetContract.ts:55:export function isAgentWidgetContractV1(value: unknown): value is AgentWidgetContractV1 {
src/components/agent/agentWidgetContract.ts:62:    Array.isArray(contract.recovery_plans)
src/components/agent/agentPromptPayloadAdapter.ts:3:  isAgentWidgetContractV1,
src/components/agent/agentPromptPayloadAdapter.ts:4:  type AgentWidgetContractV1,
src/components/agent/agentPromptPayloadAdapter.ts:103:  widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:104:  agent_widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:119:  recovery_plans?: AgentPromptRecoveryPlan[];
src/components/agent/agentPromptPayloadAdapter.ts:343:  if (isAgentWidgetContractV1(payload)) {
src/components/agent/agentPromptPayloadAdapter.ts:344:    return payload.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts:347:  if (isAgentWidgetContractV1(payload.widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:348:    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts:351:  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:352:    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts:355:  const realRecoveryPlans = payload.recovery_plans || [];
src/components/agent/index.ts:31:  isAgentWidgetContractV1,
src/components/agent/index.ts:35:  AgentWidgetContractStatus,
src/components/agent/index.ts:37:  AgentWidgetContractSummary,
src/components/agent/index.ts:41:  AgentWidgetContractV1,
src/lib/crm/agent-plan-generation.ts:253:          expected_output: "recovery_plans",
src/lib/crm/agent-plan-generation.ts:256:        recovery_plans: [],
src/lib/agentClient.ts:350:export type AgentWidgetContractRow = {
src/lib/agentClient.ts:357:  contract_json?: unknown;
src/lib/agentClient.ts:365:export type FetchAgentWidgetContractOptions = {
src/lib/agentClient.ts:371:export type FetchAgentWidgetContractResult = {
src/lib/agentClient.ts:372:  row: AgentWidgetContractRow | null;
src/lib/agentClient.ts:376:export async function fetchAgentWidgetContract(
src/lib/agentClient.ts:377:  options: FetchAgentWidgetContractOptions = {},
src/lib/agentClient.ts:378:): Promise<FetchAgentWidgetContractResult> {
src/lib/agentClient.ts:380:    .from("agent_widget_contracts")
src/lib/agentClient.ts:381:    .select("id, company_id, user_id, cycle_date, schema_version, status, contract_json, source_context_id, generated_by, error_message, created_at, updated_at")
src/lib/agentClient.ts:403:  const row = (data || null) as AgentWidgetContractRow | null;
src/lib/agentClient.ts:404:  const contractJson = row?.contract_json;
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:3:export type AgentWidgetContractStatus = 'idle' | 'analyzing' | 'ready' | 'executing' | 'done' | 'error';
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:40:export type AgentWidgetContractV1 = {
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:42:	status: AgentWidgetContractStatus;
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:45:	recovery_plans: AgentWidgetRecoveryPlan[];
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:75:type WriteAgentWidgetContractOptions = {
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:83:type WriteAgentWidgetContractResult = {
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:84:	contract: AgentWidgetContractV1;
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:276:export function buildAgentWidgetContractFromDailyPlans(plans: AgentDailyPlanForWidget[]): AgentWidgetContractV1 {
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:290:		recovery_plans: recoveryPlans,
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:300:export async function writeAgentWidgetContractFromDailyPlans(
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:303:	options: WriteAgentWidgetContractOptions = {},
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:304:): Promise<WriteAgentWidgetContractResult> {
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:310:	const contract = buildAgentWidgetContractFromDailyPlans(plans);
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:318:		contract_json: contract,
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:326:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:342:			.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-title-priority-20260705174930:358:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:3:export type AgentWidgetContractStatus = 'idle' | 'analyzing' | 'ready' | 'executing' | 'done' | 'error';
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:40:export type AgentWidgetContractV1 = {
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:42:	status: AgentWidgetContractStatus;
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:45:	recovery_plans: AgentWidgetRecoveryPlan[];
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:75:type WriteAgentWidgetContractOptions = {
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:83:type WriteAgentWidgetContractResult = {
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:84:	contract: AgentWidgetContractV1;
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:278:export function buildAgentWidgetContractFromDailyPlans(plans: AgentDailyPlanForWidget[]): AgentWidgetContractV1 {
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:292:		recovery_plans: recoveryPlans,
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:302:export async function writeAgentWidgetContractFromDailyPlans(
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:305:	options: WriteAgentWidgetContractOptions = {},
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:306:): Promise<WriteAgentWidgetContractResult> {
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:312:	const contract = buildAgentWidgetContractFromDailyPlans(plans);
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:320:		contract_json: contract,
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:328:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:344:			.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-openclaw-widget-20260705180126:360:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:3:export type AgentWidgetContractStatus = 'idle' | 'analyzing' | 'ready' | 'executing' | 'done' | 'error';
apps/agent-worker/src/agent-widget-contract.ts:40:export type AgentWidgetContractV1 = {
apps/agent-worker/src/agent-widget-contract.ts:42:	status: AgentWidgetContractStatus;
apps/agent-worker/src/agent-widget-contract.ts:45:	recovery_plans: AgentWidgetRecoveryPlan[];
apps/agent-worker/src/agent-widget-contract.ts:75:type WriteAgentWidgetContractOptions = {
apps/agent-worker/src/agent-widget-contract.ts:83:type WriteAgentWidgetContractResult = {
apps/agent-worker/src/agent-widget-contract.ts:84:	contract: AgentWidgetContractV1;
apps/agent-worker/src/agent-widget-contract.ts:278:export function buildAgentWidgetContractFromDailyPlans(plans: AgentDailyPlanForWidget[]): AgentWidgetContractV1 {
apps/agent-worker/src/agent-widget-contract.ts:292:		recovery_plans: recoveryPlans,
apps/agent-worker/src/agent-widget-contract.ts:302:export async function writeAgentWidgetContractFromDailyPlans(
apps/agent-worker/src/agent-widget-contract.ts:305:	options: WriteAgentWidgetContractOptions = {},
apps/agent-worker/src/agent-widget-contract.ts:306:): Promise<WriteAgentWidgetContractResult> {
apps/agent-worker/src/agent-widget-contract.ts:312:	const contract = buildAgentWidgetContractFromDailyPlans(plans);
apps/agent-worker/src/agent-widget-contract.ts:320:		contract_json: contract,
apps/agent-worker/src/agent-widget-contract.ts:328:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:344:			.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:360:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:378:export async function writeAgentWidgetContractPayload(
apps/agent-worker/src/agent-widget-contract.ts:380:	contract: AgentWidgetContractV1,
apps/agent-worker/src/agent-widget-contract.ts:381:	options: WriteAgentWidgetContractOptions = {},
apps/agent-worker/src/agent-widget-contract.ts:382:): Promise<WriteAgentWidgetContractResult> {
apps/agent-worker/src/agent-widget-contract.ts:388:	const safeContract: AgentWidgetContractV1 = {
apps/agent-worker/src/agent-widget-contract.ts:391:		status: contract.recovery_plans?.length ? 'ready' : 'idle',
apps/agent-worker/src/agent-widget-contract.ts:393:		summary: contract.summary || buildSummary(contract.recovery_plans || []),
apps/agent-worker/src/agent-widget-contract.ts:394:		recovery_plans: Array.isArray(contract.recovery_plans) ? contract.recovery_plans : [],
apps/agent-worker/src/agent-widget-contract.ts:403:		contract_json: safeContract,
apps/agent-worker/src/agent-widget-contract.ts:411:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:427:			.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts:443:		.from('agent_widget_contracts')
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:8:import { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:3:export type AgentWidgetContractStatus = 'idle' | 'analyzing' | 'ready' | 'executing' | 'done' | 'error';
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:40:export type AgentWidgetContractV1 = {
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:42:	status: AgentWidgetContractStatus;
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:45:	recovery_plans: AgentWidgetRecoveryPlan[];
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:75:type WriteAgentWidgetContractOptions = {
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:83:type WriteAgentWidgetContractResult = {
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:84:	contract: AgentWidgetContractV1;
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:258:export function buildAgentWidgetContractFromDailyPlans(plans: AgentDailyPlanForWidget[]): AgentWidgetContractV1 {
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:272:		recovery_plans: recoveryPlans,
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:282:export async function writeAgentWidgetContractFromDailyPlans(
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:285:	options: WriteAgentWidgetContractOptions = {},
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:286:): Promise<WriteAgentWidgetContractResult> {
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:292:	const contract = buildAgentWidgetContractFromDailyPlans(plans);
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:300:		contract_json: contract,
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:308:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:324:			.from('agent_widget_contracts')
apps/agent-worker/src/agent-widget-contract.ts.bak-ignore-reserved-title-20260705174910:340:		.from('agent_widget_contracts')
apps/agent-worker/src/agent-operating-context.ts:3:import { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';
apps/agent-worker/src/agent-operating-context.ts:405:				write_to: 'recovery_plans',
apps/agent-worker/src/agent-operating-context.ts:412:			expected_output: 'recovery_plans',
apps/agent-worker/src/agent-operating-context.ts:415:		recovery_plans: [],
apps/agent-worker/src/agent-operating-context.ts:523:	let widgetContractResult: Awaited<ReturnType<typeof writeAgentWidgetContractFromDailyPlans>> | null = null;
apps/agent-worker/src/agent-operating-context.ts:526:		widgetContractResult = await writeAgentWidgetContractFromDailyPlans(ctx.supabase, plans, {
apps/agent-worker/src/agent-operating-context.ts:539:					: 'No se pudo escribir agent_widget_contracts.',
apps/agent-worker/src/index.ts:8:import { writeAgentWidgetContractFromDailyPlans, writeAgentWidgetContractPayload } from './agent-widget-contract';
apps/agent-worker/src/index.ts:361:				const written = await writeAgentWidgetContractPayload(supabase, openclawContract.contract, {
apps/agent-worker/src/index.ts:569:- status debe ser "ready" si hay recovery_plans, o "idle" si no hay casos.
apps/agent-worker/src/index.ts:589:  "recovery_plans": [
apps/agent-worker/src/index.ts:638:	if (!Array.isArray(contract.recovery_plans)) {
apps/agent-worker/src/index.ts:639:		throw new Error('OpenClaw devolvió recovery_plans inválido.');
apps/agent-worker/src/index.ts:642:	const plans = contract.recovery_plans.map((plan: any, index: number) => {
apps/agent-worker/src/index.ts:646:			throw new Error(`OpenClaw devolvió un título placeholder en recovery_plans[${index}].`);
apps/agent-worker/src/index.ts:683:		recovery_plans: plans,
apps/agent-worker/src/agent-daily-plans.ts:1034:					expected_output: 'recovery_plans',
apps/agent-worker/src/agent-daily-plans.ts:1037:				recovery_plans: [],
```
