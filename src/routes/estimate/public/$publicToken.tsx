import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EstimateDocumentPreview, type EstimateDocumentData } from "@/components/estimates/estimate-document-preview";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/estimate/public/$publicToken")({
  component: PublicEstimatePage,
  head: () => ({ meta: [{ title: "Cotización" }] }),
});

function clean(value: unknown) {
  return String(value || "").trim();
}

function joinAddress(...values: unknown[]) {
  const parts: string[] = [];
  for (const value of values) {
    const next = clean(value);
    if (!next) continue;
    const current = parts.join(", ").toLocaleLowerCase("es");
    if (!current.includes(next.toLocaleLowerCase("es"))) parts.push(next);
  }
  return parts.join(", ");
}

function PublicEstimatePage() {
  const { publicToken } = Route.useParams();
  const token = useMemo(() => clean(publicToken), [publicToken]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<EstimateDocumentData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) {
        setError("Token inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await (supabase as any).rpc("get_estimate_public", {
          p_public_token: token,
        });
        if (rpcError) throw rpcError;

        const estimate = data?.estimate;
        if (!estimate) throw new Error("No se encontró la cotización.");

        const snapshot =
          estimate.estimate_data && typeof estimate.estimate_data === "object"
            ? estimate.estimate_data
            : {};
        const client = estimate.client && typeof estimate.client === "object" ? estimate.client : {};

        const nextDocument: EstimateDocumentData = {
          number: estimate.number,
          title: estimate.title,
          status: estimate.status,
          dateIssued: estimate.date_issued,
          expiryDate: estimate.expiry_date,
          currency: estimate.currency,
          subtotal: Number(estimate.subtotal || 0),
          tax: Number(estimate.tax || 0),
          discount: Number(estimate.discount_value || 0),
          adjustment: Number(estimate.adjustment || 0),
          total: Number(estimate.total || 0),
          notes: estimate.client_note || estimate.notes,
          terms: estimate.terms,
          issuer: {
            name: snapshot.issuerName,
            taxId: snapshot.issuerTaxId,
            email: snapshot.issuerEmail,
            phone: snapshot.issuerPhone,
            address: joinAddress(snapshot.issuerAddress, snapshot.issuerCity, snapshot.issuerCountry),
            website: snapshot.issuerWebsite,
            logoUrl: snapshot.issuerLogoUrl,
          },
          client: {
            name: snapshot.recipientName || client.company_name || client.contact_person,
            email: snapshot.recipientEmail || client.email,
            phone: snapshot.recipientPhone || client.phone,
            address: joinAddress(
              snapshot.recipientAddress || client.address,
              snapshot.recipientCity || client.city,
              snapshot.recipientState,
              snapshot.recipientCountry || client.country,
              snapshot.recipientZipCode,
            ),
            taxId: client.tax_id,
          },
          items: Array.isArray(data?.items) ? data.items : [],
        };

        if (active) setDocument(nextDocument);
      } catch (caught: any) {
        if (active) setError(caught?.message || "No se pudo cargar la cotización.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Cargando cotización…</div>;
  }

  if (error || !document) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-5">
          <h1 className="font-semibold text-slate-950">Cotización no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{error || "No se encontró el documento."}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <EstimateDocumentPreview data={document} />
    </main>
  );
}
