import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ContractDocumentPreview,
  type ContractDocumentData,
} from "@/components/contracts/contract-document-preview";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contract/public/$publicToken")({
  component: PublicContractPage,
  head: () => ({ meta: [{ title: "Contrato" }] }),
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

function PublicContractPage() {
  const { publicToken } = Route.useParams();
  const token = useMemo(() => clean(publicToken), [publicToken]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ContractDocumentData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) {
        setError("Token inválido.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await (supabase as any).rpc("get_contract_public", {
          p_public_token: token,
        });
        if (rpcError) throw rpcError;

        const contract = data?.contract;
        if (!contract) throw new Error("No se encontró el contrato.");

        const metadata =
          contract.metadata && typeof contract.metadata === "object" ? contract.metadata : {};
        const client = contract.client && typeof contract.client === "object" ? contract.client : {};
        const project = contract.project && typeof contract.project === "object" ? contract.project : {};

        const nextDocument: ContractDocumentData = {
          number: contract.contract_number,
          subject: contract.subject,
          description: contract.description,
          contractType: contract.contract_type,
          status: contract.status,
          signatureStatus: contract.signature_status,
          value: Number(contract.contract_value || 0),
          currency: contract.currency,
          startDate: contract.start_date,
          endDate: contract.end_date,
          signedAt: contract.signed_at,
          issuer: {
            name: metadata.issuerName,
            taxId: metadata.issuerTaxId,
            email: metadata.issuerEmail,
            phone: metadata.issuerPhone,
            address: joinAddress(
              metadata.issuerAddress,
              metadata.issuerCity,
              metadata.issuerCountry,
            ),
            website: metadata.issuerWebsite,
            logoUrl: metadata.issuerLogoUrl,
          },
          client: {
            name: client.company_name || client.contact_person,
            taxId: client.tax_id,
            email: client.email,
            phone: client.phone,
            address: joinAddress(client.address, client.city, client.country),
          },
          representative: {
            name: metadata.representativeName,
            title: metadata.representativeTitle,
            email: metadata.representativeEmail,
            phone: metadata.representativePhone,
          },
          projectName: project.name,
        };

        if (active) setDocument(nextDocument);
      } catch (caught: any) {
        if (active) setError(caught?.message || "No se pudo cargar el contrato.");
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
    return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Cargando contrato…</div>;
  }

  if (error || !document) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-5">
          <h1 className="font-semibold text-slate-950">Contrato no disponible</h1>
          <p className="mt-2 text-sm text-slate-500">{error || "No se encontró el documento."}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <ContractDocumentPreview data={document} />
    </main>
  );
}
