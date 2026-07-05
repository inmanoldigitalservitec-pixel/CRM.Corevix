## 03-agent-client-routes
```
src/lib/agentClient.ts:3:const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");
src/lib/agentClient.ts:129:  return AGENT_URL;
src/lib/agentClient.ts:166:  if (!AGENT_URL) {
src/lib/agentClient.ts:167:    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
src/lib/agentClient.ts:180:  const response = await fetch(`${AGENT_URL}/agent/chat`, {
src/lib/agentClient.ts:203:  if (!AGENT_URL) {
src/lib/agentClient.ts:204:    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
src/lib/agentClient.ts:208:  const url = new URL(`${AGENT_URL}/agent/daily-plans/today`);
src/lib/agentClient.ts:242:  if (!AGENT_URL) {
src/lib/agentClient.ts:243:    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
src/lib/agentClient.ts:247:  const response = await fetch(`${AGENT_URL}/agent/daily-plans/sync`, {
src/lib/agentClient.ts:299:export async function fetchAgentPromptPayload(
src/lib/agentClient.ts:376:export async function fetchAgentWidgetContract(
src/lib/agentClient.ts:380:    .from("agent_widget_contracts")
src/components/agent/agentWidgetContract.ts:1:export const AGENT_WIDGET_CONTRACT_VERSION = "agent_widget_contract_v1" as const;
src/components/agent/agentPromptPayloadAdapter.ts:103:  widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:104:  agent_widget_contract?: AgentWidgetContractV1;
src/components/agent/agentPromptPayloadAdapter.ts:347:  if (isAgentWidgetContractV1(payload.widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:348:    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/agent/agentPromptPayloadAdapter.ts:351:  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
src/components/agent/agentPromptPayloadAdapter.ts:352:    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
src/components/dashboard-v2/dashboard-v2.tsx:29:import { fetchAgentWidgetContract } from "@/lib/agentClient";
src/components/dashboard-v2/dashboard-v2.tsx:1547:  const refreshAgentPromptPayload = useCallback(async () => {
src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
src/components/dashboard-v2/dashboard-v2.tsx:1559:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1572:      console.error("Failed to refresh agent widget contract", error);
src/components/dashboard-v2/dashboard-v2.tsx:1575:        schema_version: "agent_widget_contract_v1",
src/components/dashboard-v2/dashboard-v2.tsx:1593:    void refreshAgentPromptPayload();
src/components/dashboard-v2/dashboard-v2.tsx:1594:  }, [refreshAgentPromptPayload]);
src/components/dashboard-v2/dashboard-v2.tsx:1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
```
