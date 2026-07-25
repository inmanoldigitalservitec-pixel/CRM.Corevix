import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type CompanyTax = {
  id: string;
  company_id: string;
  name: string;
  rate: number | string;
  tax_type: string | null;
  is_active: boolean;
  is_default: boolean;
  description?: string | null;
};

export function normalizeTaxRate(value: unknown) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
}

export function formatTaxOptionLabel(tax: Pick<CompanyTax, "name" | "rate">) {
  return `${tax.name} · ${normalizeTaxRate(tax.rate).toLocaleString("es-DO", {
    maximumFractionDigits: 4,
  })}%`;
}

export function useCompanyTaxes(type = "sales") {
  const { profile } = useAuth();
  const companyId = profile?.company_id || null;
  const [taxes, setTaxes] = useState<CompanyTax[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadTaxes = async () => {
      if (!companyId) {
        setTaxes([]);
        return;
      }

      setLoading(true);
      const db = supabase as any;
      const { data, error } = await db
        .from("company_taxes")
        .select("id,company_id,name,rate,tax_type,is_active,is_default,description")
        .eq("company_id", companyId)
        .eq("tax_type", type)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (cancelled) return;
      setLoading(false);
      if (error) {
        setTaxes([]);
        return;
      }
      setTaxes((Array.isArray(data) ? data : []) as CompanyTax[]);
    };

    void loadTaxes();
    return () => {
      cancelled = true;
    };
  }, [companyId, type]);

  const taxById = useMemo(() => new Map(taxes.map((tax) => [tax.id, tax])), [taxes]);
  const defaultTax = useMemo(() => taxes.find((tax) => tax.is_default) || null, [taxes]);

  return { taxes, taxById, defaultTax, loading };
}
