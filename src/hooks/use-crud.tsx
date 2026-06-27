import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

type FilterOp = "eq" | "ilike" | "in" | "neq";

interface Filter {
  column: string;
  op: FilterOp;
  value: any;
}

interface UseCrudOptions {
  table: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  filters?: Filter[];
  limit?: number;
  enabled?: boolean;
}

export function useCrud<T extends Record<string, any>>(options: UseCrudOptions) {
  const {
    table,
    select = "*",
    orderBy = "created_at",
    ascending = false,
    filters = [],
    limit = 200,
    enabled = true,
  } = options;
  const { profile, roles } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled || !profile?.company_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const db = supabase as any;
      let query = db.from(table).select(select).eq("company_id", profile.company_id);

      for (const f of filters) {
        if (f.value === undefined || f.value === null || f.value === "" || f.value === "all")
          continue;
        if (f.op === "ilike") {
          query = query.ilike(f.column, `%${f.value}%`);
        } else if (f.op === "in") {
          query = query.in(f.column, f.value);
        } else if (f.op === "neq") {
          query = query.neq(f.column, f.value);
        } else {
          query = query.eq(f.column, f.value);
        }
      }

      const { data: rows, error: err } = await query.order(orderBy, { ascending }).limit(limit);
      if (err) throw err;
      setData((rows || []) as unknown as T[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [
    table,
    select,
    orderBy,
    ascending,
    JSON.stringify(filters),
    limit,
    enabled,
    profile?.company_id,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRealtimeTable({
    table,
    companyId: profile?.company_id || null,
    enabled: enabled && Boolean(profile?.company_id),
    onChange: () => {
      void fetch();
    },
  });

  const db = supabase as any;

  const create = async (record: Partial<T>): Promise<T | null> => {
    if (!profile?.company_id) throw new Error("No company context");
    const isSalesAgentOnly =
      roles.includes("sales_agent") &&
      !roles.some((r) => ["super_admin", "admin", "manager"].includes(r));
    const assignmentColumnByTable: Record<string, string> = {
      leads: "assigned_to",
      deals: "assigned_to",
      tasks: "assigned_to",
      clients: "account_manager",
      projects: "manager",
    };
    const createdByColumnByTable: Record<string, string> = {
      deals: "created_by",
      proposals: "created_by",
      invoices: "created_by",
    };

    const payload: Record<string, any> = { ...(record as any), company_id: profile.company_id };

    // Assignment columns are mixed by table:
    // - leads/deals/tasks.assigned_to: profiles.id
    // - clients.account_manager, projects.manager: profiles.id
    if (isSalesAgentOnly) {
      const col = assignmentColumnByTable[table];
      if (col && payload[col] == null) {
        if (profile?.id) payload[col] = profile.id;
      }
    }
    if (profile?.id) {
      const createdByCol = createdByColumnByTable[table];
      if (createdByCol && payload[createdByCol] == null) {
        // Hotfix: only inject created_by for tables confirmed to support it safely.
        payload[createdByCol] = profile.id;
      }
    }

    const { data: row, error: err } = await db.from(table).insert(payload).select(select).single();
    if (err) throw err;
    const typed = row as unknown as T;
    setData((prev) => [typed, ...prev]);

    return typed;
  };

  const update = async (id: string, updates: Partial<T>): Promise<T | null> => {
    const { data: row, error: err } = await db
      .from(table)
      .update(updates)
      .eq("id", id)
      .select(select)
      .single();
    if (err) throw err;
    const typed = row as unknown as T;
    const previousRow = data.find((r) => String((r as any).id) === String(id)) as T | undefined;
    setData((prev) => prev.map((r) => ((r as any).id === id ? typed : r)));

    return typed;
  };

  const remove = async (id: string) => {
    const previousRow = data.find((r) => String((r as any).id) === String(id)) as T | undefined;
    const { error: err } = await db.from(table).delete().eq("id", id);
    if (err) throw err;
    setData((prev) => prev.filter((r) => (r as any).id !== id));
  };

  return { data, loading, error, fetch, create, update, remove };
}
