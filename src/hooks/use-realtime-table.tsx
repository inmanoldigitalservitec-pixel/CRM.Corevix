import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RealtimeChangeListener = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) => void | Promise<void>;

type SubscriptionEntry = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<RealtimeChangeListener>;
  notifyTimer: ReturnType<typeof setTimeout> | null;
};

type UseRealtimeTableOptions = {
  table: string;
  onChange?: RealtimeChangeListener;
  enabled?: boolean;
  schema?: string;
  companyId?: string | null;
  companyColumn?: string;
  filter?: string | null;
  debounceMs?: number;
};

const subscriptions = new Map<string, SubscriptionEntry>();

function buildKey(
  options: Required<Pick<UseRealtimeTableOptions, "schema" | "table">> &
    Pick<UseRealtimeTableOptions, "companyId" | "companyColumn" | "filter">,
) {
  return [
    options.schema,
    options.table,
    options.companyColumn || "",
    options.companyId || "",
    options.filter || "",
  ].join("|");
}

function buildFilter(
  options: Pick<UseRealtimeTableOptions, "companyId" | "companyColumn" | "filter">,
) {
  if (options.filter) return options.filter;
  if (options.companyId) return `${options.companyColumn || "company_id"}=eq.${options.companyId}`;
  return null;
}

function notify(
  entry: SubscriptionEntry,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  debounceMs: number,
) {
  if (entry.notifyTimer) return;
  entry.notifyTimer = setTimeout(() => {
    entry.notifyTimer = null;
    for (const listener of entry.listeners) {
      try {
        void listener(payload);
      } catch {
        // Realtime refresh should never break the rest of the subscribers.
      }
    }
  }, debounceMs);
}

export function useRealtimeTable(options: UseRealtimeTableOptions) {
  const {
    table,
    onChange,
    enabled = true,
    schema = "public",
    companyId = null,
    companyColumn = "company_id",
    filter = null,
    debounceMs = 75,
  } = options;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !table) return;

    const channelFilter = buildFilter({ companyId, companyColumn, filter });
    const key = buildKey({ schema, table, companyId, companyColumn, filter });
    let entry = subscriptions.get(key);

    if (!entry) {
      const channel = supabase.channel(`realtime:${key}`);
      entry = {
        channel,
        listeners: new Set(),
        notifyTimer: null,
      };
      subscriptions.set(key, entry);

      const config: Record<string, string> = { event: "*", schema, table };
      if (channelFilter) config.filter = channelFilter;

      channel.on("postgres_changes" as any, config as any, (payload: any) => {
        const current = subscriptions.get(key);
        if (!current) return;
        notify(
          current,
          payload as RealtimePostgresChangesPayload<Record<string, unknown>>,
          debounceMs,
        );
      });
      channel.subscribe();
    }

    const listener: RealtimeChangeListener = (payload) => onChangeRef.current?.(payload);
    entry.listeners.add(listener);

    return () => {
      const current = subscriptions.get(key);
      if (!current) return;

      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        if (current.notifyTimer) clearTimeout(current.notifyTimer);
        subscriptions.delete(key);
        void supabase.removeChannel(current.channel);
      }
    };
  }, [enabled, table, schema, companyId, companyColumn, filter, debounceMs]);
}
