import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CreditNoteDocumentPreview,
  type CreditNoteDocumentData,
} from "@/components/credit-notes/credit-note-document-preview";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/credit-note/public/$publicToken")({
  component: PublicCreditNotePage,
  head: () => ({ meta: [{ title: "Nota de crédito" }] }),
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

function PublicCreditNotePage() {
  const { publicToken } = Route.useParams();
  const token = useMemo(() => clean(publicToken), [publicToken]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<CreditNoteDocumentData | null>(null);

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
        const { data, error: rpcError } = await (supabase as any).rpc("get_credit_note_public", {
          p_public_token: token,
        });
        if (rpcError) throw rpcError;

        const creditNote = data?.credit_note;
        if (!creditNote) throw new Error("No se encontró la nota de crédito.");

        const snapshot =
          creditNote.credit_note_data && typeof creditNote.credit_note_data === "object"
            ? creditNote.credit_note_data
            : {};

        const nextDocument: CreditNoteDocumentData = {
          number: creditNote.credit_note_number,
          status: creditNote.status,
          dateIssued: creditNote.date_issued,
          reason: creditNote.reason,
          notes: creditNote.notes,
          currency: creditNote.currency,
          amount: Number(creditNote.amount || 0),
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
            name: snapshot.clientName,
            taxId: snapshot.clientTaxId,
            email: snapshot.clientEmail,
            phone: snapshot.clientPhone,
            address: joinAddress(snapshot.clientAddress, snapshot.clientCity, snapshot.clientCountry),
          },
          invoice: {
            number: snapshot.invoiceNumber,
            date: snapshot.invoiceDate,
            total: Number(snapshot.invoiceTotal || 0),
            currency: snapshot.invoiceCurrency,
          },
        };

        if (active) setDocument(nextDocument);
      } catch (caught: any) {
        if (active) setError(caught?.message || "No se pudo cargar la nota de crédito.");
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
    return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Cargando nota de crédito…</div>;
  }

  if (error || !document) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-5">
          <h1 className="font-semibold text-slate-950">Nota de crédito no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{error || "No se encontró el documento."}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <CreditNoteDocumentPreview data={document} />
    </main>
  );
}
