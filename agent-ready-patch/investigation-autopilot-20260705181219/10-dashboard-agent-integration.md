## 10-dashboard-agent-integration
```
grep: src/pages: No such file or directory
grep: src/app: No such file or directory
src/components/dashboard-v2/dashboard-v2.tsx:27:import { AgentCommandWidgetConnected } from "@/components/agent";
src/components/dashboard-v2/dashboard-v2.tsx:29:import { fetchAgentWidgetContract } from "@/lib/agentClient";
src/components/dashboard-v2/dashboard-v2.tsx:1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
src/components/dashboard-v2/dashboard-v2.tsx:1547:  const refreshAgentPromptPayload = useCallback(async () => {
src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
src/components/dashboard-v2/dashboard-v2.tsx:1554:        setAgentPromptPayload(widgetContractResult.payload);
src/components/dashboard-v2/dashboard-v2.tsx:1558:      setAgentPromptPayload({
src/components/dashboard-v2/dashboard-v2.tsx:1574:      setAgentPromptPayload({
src/components/dashboard-v2/dashboard-v2.tsx:1593:    void refreshAgentPromptPayload();
src/components/dashboard-v2/dashboard-v2.tsx:1594:  }, [refreshAgentPromptPayload]);
src/components/dashboard-v2/dashboard-v2.tsx:1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
```
