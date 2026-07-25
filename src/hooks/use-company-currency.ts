import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  convertToBaseCurrency,
  DEFAULT_COMPANY_CURRENCY_SETTINGS,
  formatCurrencyAmount,
  normalizeCurrency,
  type CompanyCurrencySettings,
} from "@/lib/currency";

type CurrencySettingsRow = {
  base_currency?: string | null;
  usd_to_dop_rate?: number | string | null;
  rate_source?: string | null;
  rate_updated_at?: string | null;
};

function mapCurrencySettings(row: CurrencySettingsRow | null): CompanyCurrencySettings {
  if (!row) return DEFAULT_COMPANY_CURRENCY_SETTINGS;

  const parsedRate = Number(row.usd_to_dop_rate);
  return {
    baseCurrency: normalizeCurrency(row.base_currency),
    usdToDopRate:
      Number.isFinite(parsedRate) && parsedRate > 0
        ? parsedRate
        : DEFAULT_COMPANY_CURRENCY_SETTINGS.usdToDopRate,
    rateSource: "manual",
    rateUpdatedAt: row.rate_updated_at || null,
  };
}

export function useCompanyCurrencySettings() {
  const { profile } = useAuth();
  const companyId = profile?.company_id || null;
  const [settings, setSettings] = useState<CompanyCurrencySettings>(
    DEFAULT_COMPANY_CURRENCY_SETTINGS,
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setSettings(DEFAULT_COMPANY_CURRENCY_SETTINGS);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("company_currency_settings")
      .select("base_currency,usd_to_dop_rate,rate_source,rate_updated_at")
      .eq("company_id", companyId)
      .maybeSingle();
    setLoading(false);

    if (error) {
      setSettings(DEFAULT_COMPANY_CURRENCY_SETTINGS);
      return;
    }

    setSettings(mapCurrencySettings((data as CurrencySettingsRow | null) || null));
  }, [companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    settings,
    loading,
    refresh,
    baseCurrency: settings.baseCurrency,
    usdToDopRate: settings.usdToDopRate,
    convertToBase: (value: number | string | null | undefined, fromCurrency?: string | null) =>
      convertToBaseCurrency(value, fromCurrency, settings),
    format: (value: number | string | null | undefined, currency?: string | null) =>
      formatCurrencyAmount(value, currency || settings.baseCurrency),
    formatBase: (value: number | string | null | undefined) =>
      formatCurrencyAmount(value, settings.baseCurrency),
  };
}
