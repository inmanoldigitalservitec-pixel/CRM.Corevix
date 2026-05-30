import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

export function useUserActivity(profileId: string | null, limit = 30) {
  const [data, setData] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const args = useMemo(() => ({ _profile_id: profileId, _limit: limit }), [profileId, limit]);

  const refetch = useCallback(async () => {
    if (!profileId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await (supabase as any).rpc("get_team_member_activity", args);
    if (err) {
      setError(err.message || "Failed to load activity");
      setData([]);
      setLoading(false);
      return;
    }
    setData((rows || []) as ActivityRow[]);
    setLoading(false);
  }, [profileId, args]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

