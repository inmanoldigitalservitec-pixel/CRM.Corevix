## 18-worker-types
```
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  OPENCLAW_GATEWAY_URL: string;
  OPENCLAW_GATEWAY_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgentToolScope = "general" | "leads" | "clients" | "tasks" | "pipeline" | "reports" | "communication" | "projects" | "finance";

export type ChatBody = {
  message: string;
  history?: ChatHistoryMessage[];
  debug?: boolean;
  tool_scope?: AgentToolScope | null;
};

export type ToolCall = {
  type: "tool_call";
  tool: string;
  args: Record<string, any>;
};

export type ToolContext = {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
};

export type ToolResult = {
  ok: boolean;
  message?: string;
  data?: any;
  error?: string;
};
```
