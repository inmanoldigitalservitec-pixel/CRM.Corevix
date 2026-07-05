## 03-agent-widget-placement-dashboard
```
grep: src/pages: No such file or directory
grep: src/app: No such file or directory
src/components/dashboard-v2/dashboard-v2.tsx:27:import { AgentCommandWidgetConnected } from "@/components/agent";
src/components/dashboard-v2/dashboard-v2.tsx:1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
src/components/dashboard-v2/dashboard-v2.tsx:1750:          id: "agent.autopilot",
src/components/dashboard-v2/dashboard-v2.tsx:1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
src/components/dashboard-builder/widget-registry.ts:45:    id: "agent.autopilot",
src/components/dashboard-builder/widget-registry.ts:47:    title: "Autopilot del agente",
src/components/dashboard-builder/widget-registry.ts:53:    defaultLayout: layout("agent.autopilot", {
src/components/dashboard-builder/widget-registry.ts:274:    widgetId: "agent.autopilot",
src/components/dashboard-builder/widget-registry.ts:277:    layout: layout("agent.autopilot", { x: 0, y: 24, w: 12, h: 5, minW: 6, minH: 4 }),
src/components/dashboard-v2/dashboard-v2.tsx:27:import { AgentCommandWidgetConnected } from "@/components/agent";
src/components/dashboard-v2/dashboard-v2.tsx:1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
src/components/dashboard-v2/dashboard-v2.tsx:1750:          id: "agent.autopilot",
src/components/dashboard-v2/dashboard-v2.tsx:1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:2:import "./AgentCommandWidget.css";
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:30:type AgentCommandWidgetProps = {
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:237:export function AgentCommandWidget({
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:246:}: AgentCommandWidgetProps) {
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:387:          <h2>Corevix Autopilot</h2>
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:424:              <div className="agent-label">Corevix Autopilot</div>
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:445:                  {selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:483:              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
src/components/agent/AgentCommandWidget.tsx.bak-phase-a-20260705181335:525:export default AgentCommandWidget;
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:1:import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";
src/components/agent/agentPromptPayloadAdapter.ts.bak-phase-a-20260705181335:340:export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
src/components/agent/AgentCommandWidgetConnected.tsx:2:import { AgentCommandWidget } from "./AgentCommandWidget";
src/components/agent/AgentCommandWidgetConnected.tsx:4:  agentPromptPayloadToRecoveryPlans,
src/components/agent/AgentCommandWidgetConnected.tsx:7:} from "./agentPromptPayloadAdapter";
src/components/agent/AgentCommandWidgetConnected.tsx:9:type AgentCommandWidgetConnectedProps = {
src/components/agent/AgentCommandWidgetConnected.tsx:14:  onApprovePlan?: React.ComponentProps<typeof AgentCommandWidget>["onApprovePlan"];
src/components/agent/AgentCommandWidgetConnected.tsx:18:export function AgentCommandWidgetConnected({
src/components/agent/AgentCommandWidgetConnected.tsx:25:}: AgentCommandWidgetConnectedProps) {
src/components/agent/AgentCommandWidgetConnected.tsx:26:  const recoveryPlans = useMemo(() => agentPromptPayloadToRecoveryPlans(payload), [payload]);
src/components/agent/AgentCommandWidgetConnected.tsx:30:    <AgentCommandWidget
src/components/agent/AgentCommandWidgetConnected.tsx:42:export default AgentCommandWidgetConnected;
src/components/agent/agentPromptPayloadAdapter.ts:1:import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";
src/components/agent/agentPromptPayloadAdapter.ts:350:export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
src/components/agent/AgentCommandWidget.css:16:.agent-widget-top {
src/components/agent/AgentCommandWidget.css:539:  .agent-widget-top {
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:2:import "./AgentCommandWidget.css";
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:30:type AgentCommandWidgetProps = {
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:237:export function AgentCommandWidget({
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:246:}: AgentCommandWidgetProps) {
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:387:          <h2>Corevix Autopilot</h2>
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:424:              <div className="agent-label">Corevix Autopilot</div>
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:445:                  Resolver con Autopilot
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:483:              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
src/components/agent/AgentCommandWidget.tsx.bak-single-card-20260705182545:525:export default AgentCommandWidget;
src/components/agent/AgentCommandWidget.tsx:2:import "./AgentCommandWidget.css";
src/components/agent/AgentCommandWidget.tsx:30:type AgentCommandWidgetProps = {
src/components/agent/AgentCommandWidget.tsx:237:export function AgentCommandWidget({
src/components/agent/AgentCommandWidget.tsx:246:}: AgentCommandWidgetProps) {
src/components/agent/AgentCommandWidget.tsx:385:      <div className="agent-widget-top">
src/components/agent/AgentCommandWidget.tsx:387:          <h2>Corevix Autopilot</h2>
src/components/agent/AgentCommandWidget.tsx:418:              <div className="agent-label">Corevix Autopilot</div>
src/components/agent/AgentCommandWidget.tsx:439:                  Resolver con Autopilot
src/components/agent/AgentCommandWidget.tsx:452:              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
src/components/agent/AgentCommandWidget.tsx:494:export default AgentCommandWidget;
src/components/agent/index.ts:2:  AgentCommandWidget,
src/components/agent/index.ts:3:  default as AgentCommandWidgetDefault,
src/components/agent/index.ts:4:} from "./AgentCommandWidget";
src/components/agent/index.ts:7:  AgentCommandWidgetConnected,
src/components/agent/index.ts:8:  default as AgentCommandWidgetConnectedDefault,
src/components/agent/index.ts:9:} from "./AgentCommandWidgetConnected";
src/components/agent/index.ts:12:  agentPromptPayloadToRecoveryPlans,
src/components/agent/index.ts:14:} from "./agentPromptPayloadAdapter";
src/components/agent/index.ts:20:} from "./AgentCommandWidget";
src/components/agent/index.ts:27:} from "./agentPromptPayloadAdapter";
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:16:.agent-widget-top {
src/components/agent/AgentCommandWidget.css.bak-single-card-20260705182545:541:  .agent-widget-top {
```
