#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Implementing Agent Widget Phase 3B"
echo " Fetch agent_prompt_payload + connect dashboard"
echo "=========================================="
echo ""

CLIENT_FILE="./src/lib/agentClient.ts"
DASHBOARD_FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-agent-phase3B-$(date +%Y%m%d-%H%M%S)"
REPORT="$BACKUP_DIR/phase3B-report.md"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$CLIENT_FILE" ]; then
  echo "ERROR: No existe $CLIENT_FILE"
  exit 1
fi

if [ ! -f "$DASHBOARD_FILE" ]; then
  echo "ERROR: No existe $DASHBOARD_FILE"
  exit 1
fi

cp "$CLIENT_FILE" "$BACKUP_DIR/agentClient.ts.bak"
cp "$DASHBOARD_FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"

echo "# Phase 3B Report" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "Backups:"
echo "- $BACKUP_DIR/agentClient.ts.bak"
echo "- $BACKUP_DIR/dashboard-v2.tsx.bak"
echo ""

echo "1) Inspecting current files..."
echo "## Current markers" >> "$REPORT"
echo "" >> "$REPORT"

grep -n "AgentCommandWidget\|AgentCommandWidgetConnected\|fetchAgentPromptPayload\|fetchAgentDailyPlans\|syncAgentDailyPlans\|supabase" "$CLIENT_FILE" "$DASHBOARD_FILE" > "$BACKUP_DIR/current-markers.txt" || true

echo '```txt' >> "$REPORT"
cat "$BACKUP_DIR/current-markers.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo "2) Patching agentClient.ts..."

node <<'NODE'
const fs = require("fs");

const file = "./src/lib/agentClient.ts";
let src = fs.readFileSync(file, "utf8");

if (src.includes("fetchAgentPromptPayload")) {
  console.log("OK: fetchAgentPromptPayload already exists. Skipping agentClient patch.");
  process.exit(0);
}

const supabaseClientNameMatch =
  src.match(/\bconst\s+(\w+)\s*=\s*createClient\s*\(/) ||
  src.match(/\bexport\s+const\s+(\w+)\s*=\s*createClient\s*\(/) ||
  src.match(/\bimport\s+\{\s*(supabase)\s*\}/);

let supabaseName = "supabase";

if (src.includes("supabase.from(")) {
  supabaseName = "supabase";
} else if (supabaseClientNameMatch?.[1]) {
  supabaseName = supabaseClientNameMatch[1];
}

const typeBlock = `
export type AgentPromptPayloadRow = {
  id?: string;
  company_id?: string | null;
  user_id?: string | null;
  context_json?: unknown;
  generated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FetchAgentPromptPayloadOptions = {
  companyId?: string | null;
  userId?: string | null;
};

export type FetchAgentPromptPayloadResult = {
  row: AgentPromptPayloadRow | null;
  payload: Record<string, unknown> | null;
};
`;

const functionBlock = `
export async function fetchAgentPromptPayload(
  options: FetchAgentPromptPayloadOptions = {},
): Promise<FetchAgentPromptPayloadResult> {
  let query = ${supabaseName}
    .from("agent_operating_context")
    .select("id, company_id, user_id, context_json, generated_at, created_at, updated_at")
    .order("generated_at", { ascending: false })
    .limit(1);

  if (options.companyId) {
    query = query.eq("company_id", options.companyId);
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data || null) as AgentPromptPayloadRow | null;
  const contextJson = row?.context_json;

  if (!contextJson || typeof contextJson !== "object" || Array.isArray(contextJson)) {
    return {
      row,
      payload: null,
    };
  }

  const context = contextJson as Record<string, unknown>;

  const nestedPayload = context.agent_prompt_payload;

  if (nestedPayload && typeof nestedPayload === "object" && !Array.isArray(nestedPayload)) {
    return {
      row,
      payload: nestedPayload as Record<string, unknown>,
    };
  }

  return {
    row,
    payload: context,
  };
}
`;

const insertBlock = `${typeBlock}\n${functionBlock}\n`;

src = `${src.trimEnd()}\n\n${insertBlock}`;

fs.writeFileSync(file, src);
console.log("OK: Added fetchAgentPromptPayload to agentClient.ts");
NODE

echo "3) Patching dashboard-v2.tsx..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");
const original = src;

const needsConnectedImport = !src.includes("AgentCommandWidgetConnected");

if (needsConnectedImport) {
  if (src.includes('import { AgentCommandWidget } from "@/components/agent";')) {
    src = src.replace(
      'import { AgentCommandWidget } from "@/components/agent";',
      'import { AgentCommandWidgetConnected } from "@/components/agent";',
    );
  } else if (src.includes('import { AgentCommandWidget,') || src.includes('AgentCommandWidget } from "@/components/agent"')) {
    src = src.replace(/AgentCommandWidget/g, "AgentCommandWidgetConnected");
  } else {
    const lastImport = src.match(/import[\s\S]*?;\n/g);
    if (lastImport && lastImport.length > 0) {
      const insertAt = src.lastIndexOf(lastImport[lastImport.length - 1]) + lastImport[lastImport.length - 1].length;
      src =
        src.slice(0, insertAt) +
        'import { AgentCommandWidgetConnected } from "@/components/agent";\n' +
        src.slice(insertAt);
    } else {
      src = 'import { AgentCommandWidgetConnected } from "@/components/agent";\n' + src;
    }
  }
}

if (!src.includes("fetchAgentPromptPayload")) {
  const lastImport = src.match(/import[\s\S]*?;\n/g);
  if (lastImport && lastImport.length > 0) {
    const insertAt = src.lastIndexOf(lastImport[lastImport.length - 1]) + lastImport[lastImport.length - 1].length;
    src =
      src.slice(0, insertAt) +
      'import { fetchAgentPromptPayload } from "@/lib/agentClient";\n' +
      src.slice(insertAt);
  } else {
    src = 'import { fetchAgentPromptPayload } from "@/lib/agentClient";\n' + src;
  }
}

if (!src.includes("const [agentPromptPayload")) {
  const componentStartPatterns = [
    /export function DashboardV2\s*\([^)]*\)\s*\{/,
    /function DashboardV2\s*\([^)]*\)\s*\{/,
    /export default function DashboardV2\s*\([^)]*\)\s*\{/,
    /const DashboardV2\s*=\s*\([^)]*\)\s*=>\s*\{/,
  ];

  let patchedState = false;

  for (const pattern of componentStartPatterns) {
    const match = src.match(pattern);
    if (match) {
      const insertAt = match.index + match[0].length;
      const stateBlock = `

  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
  const [isAgentPromptPayloadLoading, setIsAgentPromptPayloadLoading] = useState(false);

  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const result = await fetchAgentPromptPayload();
      setAgentPromptPayload(result.payload);
    } catch (error) {
      console.error("Failed to fetch agent prompt payload", error);
      setAgentPromptPayload(null);
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAgentPromptPayload();
  }, [refreshAgentPromptPayload]);
`;
      src = src.slice(0, insertAt) + stateBlock + src.slice(insertAt);
      patchedState = true;
      break;
    }
  }

  if (!patchedState) {
    console.log("WARNING: Could not find DashboardV2 component start. State was not injected.");
  }
}

if (!src.includes("useCallback")) {
  src = src.replace(
    /import\s+\{\s*([^}]*?)\s*\}\s+from\s+["']react["'];/,
    (full, imports) => {
      const list = imports.split(",").map((x) => x.trim()).filter(Boolean);
      if (!list.includes("useCallback")) list.push("useCallback");
      return `import { ${list.join(", ")} } from "react";`;
    },
  );
}

if (!src.includes("useEffect")) {
  src = src.replace(
    /import\s+\{\s*([^}]*?)\s*\}\s+from\s+["']react["'];/,
    (full, imports) => {
      const list = imports.split(",").map((x) => x.trim()).filter(Boolean);
      if (!list.includes("useEffect")) list.push("useEffect");
      return `import { ${list.join(", ")} } from "react";`;
    },
  );
}

if (!src.includes("useState")) {
  src = src.replace(
    /import\s+\{\s*([^}]*?)\s*\}\s+from\s+["']react["'];/,
    (full, imports) => {
      const list = imports.split(",").map((x) => x.trim()).filter(Boolean);
      if (!list.includes("useState")) list.push("useState");
      return `import { ${list.join(", ")} } from "react";`;
    },
  );
}

const oldRender = "render: () => <AgentCommandWidget />";
const newRender =
  "render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />";

if (src.includes(oldRender)) {
  src = src.replace(oldRender, newRender);
} else if (src.includes("<AgentCommandWidget />")) {
  src = src.replace(
    /<AgentCommandWidget\s*\/>/g,
    "<AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />",
  );
} else {
  console.log("WARNING: Could not find exact <AgentCommandWidget /> render target.");
}

if (src === original) {
  console.log("WARNING: dashboard-v2.tsx unchanged.");
} else {
  fs.writeFileSync(file, src);
  console.log("OK: dashboard-v2.tsx patched.");
}
NODE

echo "4) Running validation grep..."

grep -RIn "AgentCommandWidgetConnected\|fetchAgentPromptPayload\|agentPromptPayload\|refreshAgentPromptPayload" "$CLIENT_FILE" "$DASHBOARD_FILE" | tee "$BACKUP_DIR/validation-grep.txt" || true

echo "" >> "$REPORT"
echo "## Validation grep" >> "$REPORT"
echo "" >> "$REPORT"
echo '```txt' >> "$REPORT"
cat "$BACKUP_DIR/validation-grep.txt" >> "$REPORT"
echo '```' >> "$REPORT"

echo ""
echo "=========================================="
echo " Phase 3B patch completed"
echo "=========================================="
echo ""
echo "Now run:"
echo "npm run build"
echo ""
echo "If build fails, restore with:"
echo "cp $BACKUP_DIR/agentClient.ts.bak $CLIENT_FILE"
echo "cp $BACKUP_DIR/dashboard-v2.tsx.bak $DASHBOARD_FILE"
echo ""
echo "Report:"
echo "$REPORT"
