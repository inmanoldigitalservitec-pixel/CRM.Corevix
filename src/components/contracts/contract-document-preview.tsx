import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";

export type ContractDocumentParty = {
  name?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

export type ContractRepresentative = {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ContractDocumentData = {
  number?: string | number | null;
  subject?: string | null;
  description?: string | null;
  contractType?: string | null;
  status?: string | null;
  signatureStatus?: string | null;
  value?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedAt?: string | null;
  issuer?: ContractDocumentParty;
  client?: ContractDocumentParty;
  representative?: ContractRepresentative;
  projectName?: string | null;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function PartyBlock({ title, party }: { title: string; party?: ContractDocumentParty }) {
  const lines = [
    clean(party?.address),
    clean(party?.email),
    clean(party?.phone),
    clean(party?.website),
    clean(party?.taxId) ? `RNC / ID: ${clean(party?.taxId)}` : "",
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">
        {clean(party?.name) || "—"}
      </div>
      {lines.map((line) => (
        <div key={line} className="mt-1 break-words text-xs leading-5 text-slate-500">
          {line}
        </div>
      ))}
    </div>
  );
}

export function ContractDocumentPreview({ data }: { data: ContractDocumentData }) {
  const currency = clean(data.currency).toUpperCase() || "USD";

  return (
    <div className="min-w-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="mx-auto min-h-[900px] max-w-[850px] border border-slate-200 bg-white px-6 py-7 shadow-sm md:px-10 md:py-9 print:min-h-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-start gap-4">
            {data.issuer?.logoUrl ? (
              <img
                src={data.issuer.logoUrl}
                alt={clean(data.issuer.name) || "Empresa"}
                className="h-12 w-12 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Contrato</div>
              <h1 className="mt-2 text-2xl font-normal tracking-normal text-slate-950">
                {clean(data.subject) || "Contrato comercial"}
              </h1>
              <div className="mt-2 text-sm text-slate-500">
                {clean(data.contractType) || "Acuerdo comercial"}
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Número</div>
            <div className="mt-2 text-lg text-slate-950">#{data.number || "—"}</div>
            <div className="mt-2 text-xs text-slate-500">{data.status || "—"}</div>
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-200 py-6 sm:grid-cols-2">
          <PartyBlock title="Entidad contratante" party={data.issuer} />
          <PartyBlock title="Cliente / contraparte" party={data.client} />
        </section>

        <section className="grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Inicio</div>
            <div className="mt-1 text-sm text-slate-950">{formatDate(data.startDate)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Finalización</div>
            <div className="mt-1 text-sm text-slate-950">{formatDate(data.endDate)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Valor</div>
            <div className="mt-1 text-sm text-slate-950">
              {formatCurrencyAmount(Number(data.value || 0), currency)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Firma</div>
            <div className="mt-1 text-sm text-slate-950">{data.signatureStatus || "—"}</div>
          </div>
        </section>

        {data.projectName ? (
          <section className="border-b border-slate-200 py-5">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Proyecto</div>
            <div className="mt-1 text-sm text-slate-950">{data.projectName}</div>
          </section>
        ) : null}

        <section className="py-7">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Objeto y condiciones</div>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {clean(data.description) || "No se registraron condiciones adicionales para este contrato."}
          </div>
        </section>

        <section className="mt-12 grid gap-10 border-t border-slate-200 pt-8 sm:grid-cols-2">
          <div>
            <div className="h-14 border-b border-slate-400" />
            <div className="mt-3 text-sm font-semibold text-slate-950">
              {clean(data.representative?.name) || clean(data.issuer?.name) || "Representante"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {clean(data.representative?.title) || "Representante de la empresa"}
            </div>
            {data.representative?.email ? (
              <div className="mt-1 text-xs text-slate-500">{data.representative.email}</div>
            ) : null}
          </div>

          <div>
            <div className="h-14 border-b border-slate-400" />
            <div className="mt-3 text-sm font-semibold text-slate-950">
              {clean(data.client?.name) || "Representante del cliente"}
            </div>
            <div className="mt-1 text-xs text-slate-500">Cliente / contraparte</div>
          </div>
        </section>

        {data.signedAt ? (
          <div className="mt-8 text-xs text-slate-500">Firmado el {formatDate(data.signedAt)}</div>
        ) : null}
      </article>
    </div>
  );
}
