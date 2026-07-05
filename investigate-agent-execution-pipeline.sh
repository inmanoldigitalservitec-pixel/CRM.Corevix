#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "01 - Worker index routes"
echo "============================================================"
grep -n -C 8 \
  "agent/widget\|operating-context\|OpenClaw\|responses\|executeTool\|parseTool\|tool" \
  apps/agent-worker/src/index.ts || true

echo ""
echo "============================================================"
echo "02 - Worker source files"
echo "============================================================"
find apps/agent-worker/src -maxdepth 2 -type f | sort

echo ""
echo "============================================================"
echo "03 - OpenClaw references"
echo "============================================================"
grep -RIn \
  "askOpenClaw\|OpenClaw\|/v1/responses\|responses" \
  apps/agent-worker/src src \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.wrangler || true

echo ""
echo "============================================================"
echo "04 - Tool execution references"
echo "============================================================"
grep -RIn \
  "executeTool\|parseToolCall\|tool_call\|toolCall\|tools\|function_call\|call_id" \
  apps/agent-worker/src src \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.wrangler || true

echo ""
echo "============================================================"
echo "05 - Agent widget frontend files"
echo "============================================================"
grep -RIn \
  "Resolver con Autopilot\|agentPromptPayloadToRecoveryPlans\|onAnalyzeNow\|AgentCommandWidget" \
  src/components/agent src/lib \
  --exclude-dir=node_modules \
  --exclude-dir=dist || true

echo ""
echo "============================================================"
echo "06 - Current AgentCommandWidget action area"
echo "============================================================"
grep -n -C 30 \
  "Resolver con Autopilot\|onAnalyzeNow\|selectedPlan\|plan_steps\|agent-actions" \
  src/components/agent/AgentCommandWidget.tsx || true

echo ""
echo "============================================================"
echo "07 - Agent client"
echo "============================================================"
sed -n '1,260p' src/lib/agentClient.ts || true

echo ""
echo "============================================================"
echo "08 - Agent payload adapter"
echo "============================================================"
sed -n '1,260p' src/components/agent/agentPromptPayloadAdapter.ts || true

echo ""
echo "✅ Investigación lista."
echo "Copia desde '01 - Worker index routes' hasta el final y pégamelo aquí."
