import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";

export type InternalChatPresenceUser = {
  profileId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  companyId: string;
  activeChannelId: string | null;
  lastSeenAt: string;
};

type PresenceState = Record<string, Array<Record<string, unknown>>>;

type LastSeenRow = {
  profile_id: string;
  active_channel_id: string | null;
  last_seen_at: string;
};

function readPresenceUser(entry: Record<string, unknown>): InternalChatPresenceUser | null {
  const profileId = typeof entry.profile_id === "string" ? entry.profile_id : null;
  const userId = typeof entry.user_id === "string" ? entry.user_id : null;
  const fullName = typeof entry.full_name === "string" ? entry.full_name : "Usuario";
  const companyId = typeof entry.company_id === "string" ? entry.company_id : null;
  const avatarUrl = typeof entry.avatar_url === "string" ? entry.avatar_url : null;
  const activeChannelId =
    typeof entry.active_channel_id === "string" ? entry.active_channel_id : null;
  const lastSeenAt =
    typeof entry.last_seen_at === "string" ? entry.last_seen_at : new Date().toISOString();

  if (!profileId || !userId || !companyId) return null;

  return {
    profileId,
    userId,
    fullName,
    avatarUrl,
    companyId,
    activeChannelId,
    lastSeenAt,
  };
}

function getLatestPresenceUser(
  current: InternalChatPresenceUser | undefined,
  next: InternalChatPresenceUser,
) {
  if (!current) return next;
  return new Date(next.lastSeenAt) >= new Date(current.lastSeenAt) ? next : current;
}

export function useInternalChatPresence(activeChannelId?: string | null) {
  const { profile } = useAuth();
  const [presenceByProfileId, setPresenceByProfileId] = useState<
    Record<string, InternalChatPresenceUser>
  >({});
  const [lastSeenByProfileId, setLastSeenByProfileId] = useState<Record<string, LastSeenRow>>({});

  const companyId = profile?.company_id || null;
  const profileId = profile?.id || null;
  const userId = profile?.user_id || null;

  const loadLastSeen = useCallback(async () => {
    if (!companyId || !profileId) {
      setLastSeenByProfileId({});
      return;
    }

    const { data, error } = await (supabase as any)
      .from("internal_chat_presence")
      .select("profile_id,active_channel_id,last_seen_at")
      .eq("company_id", companyId);

    if (error) return;

    const rows = (data || []) as LastSeenRow[];
    setLastSeenByProfileId(
      rows.reduce<Record<string, LastSeenRow>>((acc, row) => {
        acc[row.profile_id] = row;
        return acc;
      }, {}),
    );
  }, [companyId, profileId]);

  const touchLastSeen = useCallback(async () => {
    if (!companyId || !profileId) return;

    const { error } = await (supabase as any).rpc("touch_internal_chat_presence", {
      _active_channel_id: activeChannelId || null,
    });

    if (!error) void loadLastSeen();
  }, [activeChannelId, companyId, loadLastSeen, profileId]);

  useEffect(() => {
    void loadLastSeen();
  }, [loadLastSeen]);

  useRealtimeTable({
    table: "internal_chat_presence",
    companyId,
    enabled: Boolean(companyId && profileId),
    onChange: () => {
      void loadLastSeen();
    },
  });

  useEffect(() => {
    if (!companyId || !profileId || !userId) {
      setPresenceByProfileId({});
      setLastSeenByProfileId({});
      return;
    }

    let closed = false;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeenTimer: ReturnType<typeof setInterval> | null = null;

    const channel = supabase.channel(`internal-chat-presence:${companyId}`, {
      config: {
        presence: { key: profileId },
      },
    });

    function syncPresenceState() {
      const state = channel.presenceState() as PresenceState;
      const nextPresence: Record<string, InternalChatPresenceUser> = {};

      for (const entries of Object.values(state)) {
        for (const entry of entries) {
          const user = readPresenceUser(entry);
          if (!user || user.companyId !== companyId) continue;
          nextPresence[user.profileId] = getLatestPresenceUser(nextPresence[user.profileId], user);
        }
      }

      if (!closed) setPresenceByProfileId(nextPresence);
    }

    async function trackPresence() {
      await channel.track({
        profile_id: profileId,
        user_id: userId,
        full_name: profile.full_name || profile.email || "Usuario",
        avatar_url: profile.avatar_url || null,
        company_id: companyId,
        active_channel_id: activeChannelId || null,
        last_seen_at: new Date().toISOString(),
      });
    }

    channel
      .on("presence", { event: "sync" }, syncPresenceState)
      .on("presence", { event: "join" }, syncPresenceState)
      .on("presence", { event: "leave" }, syncPresenceState)
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void trackPresence();
        void touchLastSeen();
        refreshTimer = setInterval(() => {
          void trackPresence();
        }, 30_000);
        lastSeenTimer = setInterval(() => {
          void touchLastSeen();
        }, 60_000);
      });

    return () => {
      closed = true;
      if (refreshTimer) clearInterval(refreshTimer);
      if (lastSeenTimer) clearInterval(lastSeenTimer);
      void touchLastSeen();
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [
    activeChannelId,
    companyId,
    profile?.avatar_url,
    profile?.email,
    profile?.full_name,
    profileId,
    touchLastSeen,
    userId,
  ]);

  const onlineProfileIds = useMemo(
    () => new Set(Object.keys(presenceByProfileId)),
    [presenceByProfileId],
  );

  const isProfileOnline = useCallback(
    (id?: string | null) => Boolean(id && presenceByProfileId[id]),
    [presenceByProfileId],
  );

  const getProfileLastSeenAt = useCallback(
    (id?: string | null) => (id ? lastSeenByProfileId[id]?.last_seen_at || null : null),
    [lastSeenByProfileId],
  );

  return {
    presenceByProfileId,
    lastSeenByProfileId,
    onlineProfileIds,
    isProfileOnline,
    getProfileLastSeenAt,
  };
}
