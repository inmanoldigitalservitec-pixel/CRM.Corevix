#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "01 - Buscar dashboard-v2 real"
echo "============================================================"
find src -type f | grep -Ei "dashboard.*v2|dashboard|builder|agent" | sort

echo ""
echo "============================================================"
echo "02 - Buscar AgentCommandWidgetConnected"
echo "============================================================"
grep -RIn "AgentCommandWidgetConnected" src \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "03 - Buscar agentPromptPayload / refreshAgentPromptPayload"
echo "============================================================"
grep -RIn "agentPromptPayload\|refreshAgentPromptPayload\|setAgentPromptPayload\|isAgentPromptPayloadLoading" src \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "04 - Buscar funciones de refresh operating context"
echo "============================================================"
grep -RIn "operating-context/refresh\|refreshAgentOperatingContext\|fetchAgentOperatingContext\|fetchAgentWidgetContract" src/lib src/components src/pages src/app 2>/dev/null \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude='*.bak-*' || true

echo ""
echo "============================================================"
echo "05 - Ver agentClient alrededor de AGENT_URL y fetch"
echo "============================================================"
grep -n -C 25 "AGENT_URL\|VITE_AGENT_URL\|getAgentAccessToken\|fetchAgentWidgetContract" src/lib/agentClient.ts || true

echo ""
echo "============================================================"
echo "06 - Ver archivo donde se monta el widget"
echo "============================================================"
WIDGET_FILE="$(grep -RIl "AgentCommandWidgetConnected" src --exclude='*.bak-*' | head -n 1 || true)"
if [ -n "$WIDGET_FILE" ]; then
  echo "Archivo: $WIDGET_FILE"
  sed -n '1,260p' "$WIDGET_FILE"
else
  echo "No encontré montaje del widget."
fi

echo ""
echo "✅ Investigación terminada. No modificó archivos."
