import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PublicInvoiceView } from "@/components/invoices/PublicInvoiceView";

export const Route = createFileRoute("/invoice/public/$publicToken")({
  component: InvoicePublicPage,
  head: () => ({ meta: [{ title: "Factura — Corevix" }] }),
});

function InvoicePublicPage() {
  const { publicToken } = Route.useParams();
  const token = useMemo(() => String(publicToken || "").trim(), [publicToken]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const db = supabase as any;
        const { data, error: err } = await db.rpc("get_invoice_public", {
          p_invoice_public_token: token,
        });
        if (err) throw err;

        const inv = data?.invoice ?? null;
        const invItems = data?.items ?? [];
        if (!inv) {
          setInvoice(null);
          setItems([]);
          setError("No se encontró la factura.");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setInvoice(inv);
        setItems(Array.isArray(invItems) ? invItems : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "No se pudo cargar la factura.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        Cargando factura…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-5">
          <div className="text-base font-semibold">No disponible</div>
          <div className="mt-1 text-sm text-muted-foreground">{error}</div>
          <div className="mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        No se encontró la factura.
      </div>
    );
  }

  return <PublicInvoiceView invoice={invoice} items={items} onPrint={() => window.print()} />;
}
