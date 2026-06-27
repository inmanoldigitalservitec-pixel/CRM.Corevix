import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

export type TeamUserStatusFilter = "all" | "active" | "inactive";

export type TeamUserRow = {
  profile_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  department: string | null;
  is_active: boolean;
  role: AppRole;
  leads_assigned: number;
  tasks_assigned: number;
  deals_assigned: number;
  last_activity_at: string | null;
  joined_at: string;
};

export function useTeamUsers(params?: {
  search?: string;
  role?: AppRole | "all";
  status?: TeamUserStatusFilter;
  department?: string | "all";
  enabled?: boolean;
}) {
  const enabled = params?.enabled ?? true;
  const search = params?.search ?? "";
  const role = params?.role ?? "all";
  const status = params?.status ?? "all";
  const department = params?.department ?? "all";

  const [data, setData] = useState<TeamUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rpcArgs = useMemo(() => {
    return {
      _search: search.trim() || null,
      _role: role === "all" ? null : role,
      _is_active: status === "all" ? null : status === "active",
      _department: department === "all" ? null : department,
    };
  }, [search, role, status, department]);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await (supabase as any).rpc(
      "get_company_team_members",
      rpcArgs,
    );
    if (err) {
      setError(err.message || "Failed to load team");
      setData([]);
      setLoading(false);
      return;
    }
    setData((rows || []) as TeamUserRow[]);
    setLoading(false);
  }, [enabled, rpcArgs]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
