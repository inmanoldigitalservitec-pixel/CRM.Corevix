## 14-current-agent-connected
```
import { useMemo } from "react";
import { AgentCommandWidget } from "./AgentCommandWidget";
import {
  agentPromptPayloadToRecoveryPlans,
  getAgentPayloadLastAnalysisLabel,
  type AgentPromptPayload,
} from "./agentPromptPayloadAdapter";

type AgentCommandWidgetConnectedProps = {
  payload?: AgentPromptPayload | null;
  isActive?: boolean;
  isLoading?: boolean;
  onAnalyzeNow?: () => void | Promise<void>;
  onApprovePlan?: React.ComponentProps<typeof AgentCommandWidget>["onApprovePlan"];
  className?: string;
};

export function AgentCommandWidgetConnected({
  payload,
  isActive = true,
  isLoading = false,
  onAnalyzeNow,
  onApprovePlan,
  className,
}: AgentCommandWidgetConnectedProps) {
  const recoveryPlans = useMemo(() => agentPromptPayloadToRecoveryPlans(payload), [payload]);
  const lastAnalysisLabel = useMemo(() => getAgentPayloadLastAnalysisLabel(payload), [payload]);

  return (
    <AgentCommandWidget
      plans={recoveryPlans}
      isActive={isActive}
      isLoading={isLoading}
      lastAnalysisLabel={lastAnalysisLabel}
      onAnalyzeNow={onAnalyzeNow}
      onApprovePlan={onApprovePlan}
      className={className}
    />
  );
}

export default AgentCommandWidgetConnected;
```
