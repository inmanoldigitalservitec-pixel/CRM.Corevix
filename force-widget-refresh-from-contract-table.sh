#!/usr/bin/env bash

set -euo pipefail

FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-force-widget-contract-refresh-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe $FILE"
  exit 1
fi

cp "$FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

// 1) Ensure import has both fetch functions.
if (src.includes('import { fetchAgentPromptPayload } from "@/lib/agentClient";')) {
  src = src.replace(
    'import { fetchAgentPromptPayload } from "@/lib/agentClient";',
    'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";',
  );
} else if (
  src.includes('from "@/lib/agentClient";') &&
  src.includes("fetchAgentPromptPayload") &&
  !src.includes("fetchAgentWidgetContract")
) {
  src = src.replace(
    /import\s+\{\s*([^}]*fetchAgentPromptPayload[^}]*)\s*\}\s+from\s+["']@\/lib\/agentClient["'];/,
    (full, imports) => {
      const names = imports.split(",").map((x) => x.trim()).filter(Boolean);
      if (!names.includes("fetchAgentWidgetContract")) names.push("fetchAgentWidgetContract");
      return `import { ${Array.from(new Set(names)).join(", ")} } from "@/lib/agentClient";`;
    },
  );
} else if (!src.includes("fetchAgentWidgetContract")) {
  const imports = src.match(/import[\s\S]*?;\n/g);
  if (!imports || imports.length === 0) {
    src = 'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";\n' + src;
  } else {
    const insertAt = src.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
    src =
      src.slice(0, insertAt) +
      'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";\n' +
      src.slice(insertAt);
  }
}

// 2) Remove any temporary alert/debug popup blocks if present.
src = src.replace(/window\.alert\([\s\S]*?\);\s*/g, "");
src = src.replace(/console\.log\("\[AgentWidgetContractAlert\][\s\S]*?\);\s*/g, "");

// 3) Replace refreshAgentPromptPayload function with a deterministic version.
// This makes the refresh button load agent_widget_contracts first.
const functionRegex =
  /  const refreshAgentPromptPayload = useCallback\(async \(\) => \{\n[\s\S]*?\n  \}, \[\]\);/;

const newFunction = `  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      // The widget refresh button should load the agent output table first.
      // agent_widget_contracts = output created by the agent for the widget.
      const widgetContractResult = await fetchAgentWidgetContract();

      console.log("[AgentWidget] refresh source check:", {
        source: widgetContractResult.payload ? "agent_widget_contracts" : "fallback_pending",
        row: widgetContractResult.row,
        firstPlanTitle: Array.isArray(widgetContractResult.payload?.recovery_plans)
          ? widgetContractResult.payload.recovery_plans[0]?.plan_title
          : null,
      });

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      // Fallback only while the real agent has not written a widget contract yet.
      const promptPayloadResult = await fetchAgentPromptPayload();

      console.log("[AgentWidget] fallback source:", {
        source: "agent_operating_context",
        row: promptPayloadResult.row,
      });

      setAgentPromptPayload(promptPayloadResult.payload);
    } catch (error) {
      console.error("Failed to refresh agent widget from contract table", error);

      try {
        const promptPayloadResult = await fetchAgentPromptPayload();
        setAgentPromptPayload(promptPayloadResult.payload);
      } catch (fallbackError) {
        console.error("Failed to refresh fallback agent operating context", fallbackError);
        setAgentPromptPayload(null);
      }
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);`;

if (!functionRegex.test(src)) {
  console.log("ERROR: No encontré refreshAgentPromptPayload para reemplazar.");
  console.log("Ejecuta:");
  console.log('grep -n "refreshAgentPromptPayload\\|fetchAgentWidgetContract\\|fetchAgentPromptPayload" ./src/components/dashboard-v2/dashboard-v2.tsx');
  process.exit(1);
}

src = src.replace(functionRegex, newFunction);

// 4) Ensure widget button is wired to refreshAgentPromptPayload.
if (src.includes("<AgentCommandWidgetConnected") && !src.includes("onAnalyzeNow={refreshAgentPromptPayload}")) {
  src = src.replace(
    /<AgentCommandWidgetConnected([^>]*?)\/>/,
    (full, props) => {
      if (full.includes("onAnalyzeNow=")) return full;
      return `<AgentCommandWidgetConnected${props} onAnalyzeNow={refreshAgentPromptPayload} />`;
    },
  );
}

// 5) Save.
fs.writeFileSync(file, src);

console.log("OK: Dashboard refresh now prefers agent_widget_contracts.");
NODE

echo ""
echo "Validation:"
grep -n "fetchAgentWidgetContract\|refresh source check\|onAnalyzeNow={refreshAgentPromptPayload}\|window.alert" "$FILE" || true

echo ""
echo "Backup:"
echo "$BACKUP_DIR/dashboard-v2.tsx.bak"

echo ""
echo "Now run:"
echo "npm run build"
