## 08-dashboard-v2-agent-area
```
1-import { useState, useEffect, useCallback } from "react";
2-import type { LucideIcon } from "lucide-react";
3-import {
4-  AlertTriangle,
5-  BarChart3,
6-  CheckCircle2,
7-  Clock3,
8-  DollarSign,
9-  FileText,
10-  Flag,
11-  Goal,
12-  Instagram,
13-  LifeBuoy,
14-  Mail,
15-  MessageCircle,
16-  MessageSquare,
17-  Phone,
18-  Send,
19-  TrendingUp,
20-  Users,
21-  Workflow,
22-} from "lucide-react";
23-
24-import { DashboardCard, DashboardTextButton } from "./dashboard-card";
25-import { DashboardKpiCard } from "./dashboard-kpi-card";
26-import { DashboardBuilder } from "@/components/dashboard-builder";
27:import { AgentCommandWidgetConnected } from "@/components/agent";
28-import type { DashboardWidgetMode } from "@/components/dashboard-builder";
29-import { fetchAgentWidgetContract } from "@/lib/agentClient";
30-
31-type DashboardV2Tone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";
32-
33-type DashboardV2Kpi = {
34-  label: string;
35-  value: string;
36-  helper: string;
37-  tone: DashboardV2Tone;
38-  icon: LucideIcon;
39-};
40-
41-type DashboardV2Action = {
42-  title: string;
43-  relatedTo: string;
44-  due: string;
45-  priority: "Alta" | "Media" | "Normal";
46-  button: string;
47-  icon: LucideIcon;
48-  tone: DashboardV2Tone;
49-  href?: string;
50-};
51-
52-type ScheduleItem = [string, string, string, string];
53-type PipelineItem = [string, number, string, number, string];
54-type ClientReviewItem = [string, string, string, string, string];
55-type CollectionItem = [string, string, string, string];
56-type ActivityItem = [string, string, string, LucideIcon];
57-type CommunicationItem = [string, string, string, string, string, string];
58-type ListWidgetItem = [string, string, string, string, string];
59-type SnapshotMetricItem = [string, string, string, DashboardV2Tone];
60-type DocumentStatusItem = [string, number, number, DashboardV2Tone];
61-type SalesDocumentsOverview = {
62-  invoices: DocumentStatusItem[];
--
1509-              </strong>
1510-              <small className="block truncate text-[10.5px] text-slate-500">{subtitle}</small>
1511-            </span>
1512-            {amount ? (
1513-              <strong className="text-[11px] font-semibold text-emerald-600">{amount}</strong>
1514-            ) : null}
1515-          </div>
1516-        ))}
1517-      </div>
1518-    </DashboardCard>
1519-  );
1520-}
1521-
1522-export function DashboardV2({
1523-  kpis = mockKpis,
1524-  actions = mockActions,
1525-  schedule = mockSchedule,
1526-  collectionRows = mockCollectionRows,
1527-  pipeline = mockPipeline,
1528-  clients = mockClients,
1529-  activities = mockActivities,
1530-  communications = mockCommunications,
1531-  leadsAttention,
1532-  projectRisks,
1533-  invoiceRows,
1534-  proposalRows,
1535-  reportSnapshot,
1536-  salesDocumentsOverview,
1537-  workCenter,
1538-  todoItems,
1539-  todayLabel = "Vie. 23 mayo",
1540-  collectionPeriodLabel = "Este mes⌄",
1541-  pipelinePeriodLabel = "Este mes⌄",
1542-}: DashboardV2Props = {}) {
1543-
1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
1545-  const [isAgentPromptPayloadLoading, setIsAgentPromptPayloadLoading] = useState(false);
1546-
1547-  const refreshAgentPromptPayload = useCallback(async () => {
1548-    setIsAgentPromptPayloadLoading(true);
1549-
1550-    try {
1551-      const widgetContractResult = await fetchAgentWidgetContract();
1552-
1553-      if (widgetContractResult.payload) {
1554-        setAgentPromptPayload(widgetContractResult.payload);
1555-        return;
1556-      }
1557-
1558-      setAgentPromptPayload({
1559-        schema_version: "agent_widget_contract_v1",
1560-        status: "idle",
1561-        generated_at: new Date().toISOString(),
1562-        summary: {
1563-          total_cases: 0,
1564-          critical: 0,
1565-          high: 0,
1566-          medium: 0,
1567-          low: 0,
1568-        },
1569-        recovery_plans: [],
1570-      });
1571-    } catch (error) {
1572-      console.error("Failed to refresh agent widget contract", error);
1573-
1574-      setAgentPromptPayload({
1575-        schema_version: "agent_widget_contract_v1",
1576-        status: "error",
1577-        generated_at: new Date().toISOString(),
1578-        summary: {
1579-          total_cases: 0,
--
1716-          ] as WorkCenterItem,
1717-      ),
1718-      calendar: schedule.map(
1719-        ([when, title, subtitle, tone]) =>
1720-          [
1721-            title,
1722-            `${when} · ${subtitle}`,
1723-            when,
1724-            tone as DashboardV2Tone,
1725-            "/calendar",
1726-          ] as WorkCenterItem,
1727-      ),
1728-    } satisfies WorkCenterData);
1729-  const resolvedTodoItems =
1730-    todoItems ??
1731-    ({
1732-      pending: actions
1733-        .filter((action) => action.href === "/tasks")
1734-        .map(
1735-          (action) =>
1736-            [
1737-              action.title,
1738-              `${action.relatedTo} · ${action.due}`,
1739-              action.tone,
1740-              "/tasks",
1741-            ] as TodoItem,
1742-        ),
1743-      completed: [],
1744-    } satisfies TodoWidgetData);
1745-
1746-  return (
1747-    <DashboardBuilder
1748-      widgets={[
1749-        {
1750-          id: "agent.autopilot",
1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
1752-        },
1753-        {
1754-          id: "sales.quick-kpis",
1755-          render: ({ mode }) => <DashboardKpiStripWidget kpis={kpis} mode={mode} />,
1756-        },
1757-        {
1758-          id: "tasks.my-work",
1759-          render: ({ mode }) => <DashboardActionPrioritiesWidget actions={actions} mode={mode} />,
1760-        },
1761-        {
1762-          id: "leads.attention",
1763-          render: ({ mode }) => (
1764-            <DashboardListWidget
1765-              title="Leads por atender"
1766-              question="¿Qué prospectos necesitan seguimiento?"
1767-              emptyLabel="No hay leads urgentes."
1768-              href="/leads"
1769-              icon={Users}
1770-              items={resolvedLeadAttention}
1771-              mode={mode}
1772-              tone="blue"
1773-            />
1774-          ),
1775-        },
1776-        {
1777-          id: "calendar.agenda",
1778-          render: ({ mode }) => (
1779-            <DashboardScheduleWidget schedule={schedule} todayLabel={todayLabel} mode={mode} />
1780-          ),
1781-        },
1782-        {
1783-          id: "sales.pipeline-summary",
1784-          render: ({ mode }) => (
1785-            <DashboardSalesCollectionsWidget
1786-              pipeline={pipeline}
```
