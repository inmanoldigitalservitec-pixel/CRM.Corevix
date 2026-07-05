## 05-dashboard-layout-hook
```
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import type { DashboardWidgetPreference } from "./types";
import {
  getDefaultDashboardWidgetPreferences,
  normalizeDashboardWidgetPreferences,
} from "./widget-registry";

const STORAGE_KEY_PREFIX = "corevix.dashboard.preferences";

function storageKey(companyId?: string | null, userId?: string | null) {
  return `${STORAGE_KEY_PREFIX}.${companyId || "no-company"}.${userId || "anonymous"}`;
}

function readStoredPreferences(companyId?: string | null, userId?: string | null) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(companyId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DashboardWidgetPreference[]) : null;
  } catch {
    return null;
  }
}

function writeStoredPreferences(
  preferences: DashboardWidgetPreference[],
  companyId?: string | null,
  userId?: string | null,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(companyId, userId), JSON.stringify(preferences));
  } catch {}
}

export function useDashboardLayout() {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || null;
  const userId = user?.id || null;
  const [preferences, setPreferences] = useState<DashboardWidgetPreference[]>(() =>
    normalizeDashboardWidgetPreferences(getDefaultDashboardWidgetPreferences()),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !userId) {
      setPreferences(normalizeDashboardWidgetPreferences(readStoredPreferences(companyId, userId)));
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPreferences() {
      setLoading(true);
      setError(null);

      const localPreferences = readStoredPreferences(companyId, userId);
      if (localPreferences) {
        setPreferences(normalizeDashboardWidgetPreferences(localPreferences));
      }

      const { data, error: loadError } = await (supabase as any)
        .from("dashboard_layouts")
        .select("widgets")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message || "No se pudo cargar la configuración del dashboard.");
        setPreferences(normalizeDashboardWidgetPreferences(localPreferences));
        setLoading(false);
        return;
      }

      const remotePreferences = Array.isArray(data?.widgets)
        ? (data.widgets as DashboardWidgetPreference[])
        : localPreferences;

      const nextPreferences = normalizeDashboardWidgetPreferences(remotePreferences);
      setPreferences(nextPreferences);
      writeStoredPreferences(nextPreferences, companyId, userId);
      setLoading(false);
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [companyId, userId]);

  const savePreferences = useCallback(
    async (nextPreferences: DashboardWidgetPreference[], options?: { silent?: boolean }) => {
      const normalized = normalizeDashboardWidgetPreferences(nextPreferences);
      setPreferences(normalized);
      writeStoredPreferences(normalized, companyId, userId);

      if (!companyId || !userId) return;

      setSaving(true);
      setError(null);

      const { error: saveError } = await (supabase as any).from("dashboard_layouts").upsert(
        {
          company_id: companyId,
          user_id: userId,
          widgets: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,user_id" },
      );

      setSaving(false);

      if (saveError) {
        setError(saveError.message || "No se pudo guardar la configuración del dashboard.");
        if (!options?.silent) toast.error("No se pudo guardar el dashboard personalizado.");
        return;
      }

      if (!options?.silent) toast.success("Dashboard actualizado.");
    },
    [companyId, userId],
  );

  const resetPreferences = useCallback(
    () => savePreferences(getDefaultDashboardWidgetPreferences()),
    [savePreferences],
  );

  const enabledPreferences = useMemo(
    () => preferences.filter((preference) => preference.enabled),
    [preferences],
  );

  return {
```
