import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Check,
  Printer,
  Copy,
  User,
  Calendar,
  FileText,
  Target,
  MessageCircle,
  Star,
  Plus,
  AlertCircle,
  Info,
  Folder,
  Lock,
  Clock,
  RefreshCcw,
  Shield,
  ArrowRightCircle,
  DollarSign,
  CreditCard,
  Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProposalTemplateRenderer } from "@/components/proposals/ProposalTemplateRenderer";
import { formatCurrencyAmount } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/proposal/public/$publicToken")({
  component: ProposalPublicPage,
  head: () => ({ meta: [{ title: "Propuesta — Corevix" }] }),
});

function formatMoney(amount: number, currency: string | null | undefined) {
  return formatCurrencyAmount(amount, currency || "USD");
}

function splitProposalItems(value: string) {
  return String(value || "")
    .split(/\n|•/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function LetterProposalView(props: {
  proposal: any;
  approved: boolean;
  approving: boolean;
  onApprove: () => void;
  onPrint: () => void;
}) {
  const { proposal, approved, approving, onApprove, onPrint } = props;
  const data =
    proposal?.proposal_data && typeof proposal.proposal_data === "object"
      ? proposal.proposal_data
      : {};

  const currency = proposal?.currency || "USD";
  const amount = Number(proposal?.amount || 0);
  const clientName =
    String((data as any)?.companyName || (data as any)?.clientName || "").trim() ||
    (proposal?.client_id ? `Cliente ${String(proposal.client_id).slice(0, 8)}` : "Cliente");
  const serviceDescription = String(
    (data as any)?.serviceDescription || proposal?.description || proposal?.title || "",
  ).trim();
  const deliverables = splitProposalItems(String((data as any)?.deliverablesText || ""));
  const features = splitProposalItems(String((data as any)?.featuresText || ""));
  const termsText = String((data as any)?.termsText || "").trim();
  const paymentTermsText = String((data as any)?.paymentTermsText || "").trim();
  const estimatedTime = String((data as any)?.estimatedTime || "").trim();
  const nextStep = String((data as any)?.nextStep || "").trim();
  const notes = String(proposal?.content || proposal?.notes || "").trim();
  const today = proposal?.created_at
    ? new Date(proposal.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  const lineItems = (
    deliverables.length ? deliverables : features.length ? features : [serviceDescription]
  )
    .filter(Boolean)
    .slice(0, 5)
    .map((item, index) => ({
      name: item,
      description:
        index === 0 && serviceDescription && serviceDescription !== item ? serviceDescription : "",
      qty: 1,
      total: index === 0 ? amount : 0,
    }));

  const rows = lineItems.length
    ? lineItems
    : [{ name: proposal?.title || "Propuesta comercial", description: "", qty: 1, total: amount }];

  return (
    <main className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .proposal-print-toolbar { display: none !important; }
          .proposal-letter-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="proposal-print-toolbar sticky top-3 z-20 mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-end gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-slate-200 bg-white shadow-none"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button
          type="button"
          className="h-9 rounded-full bg-blue-600 px-4 text-white shadow-none hover:bg-blue-700"
          onClick={onApprove}
          disabled={approved || approving}
        >
          <Check className="h-4 w-4" />
          {approved ? "Aprobada" : approving ? "Aprobando..." : "Aprobar"}
        </Button>
      </div>

      <article className="proposal-letter-page mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-white px-[0.62in] py-[0.58in] shadow-[0_24px_70px_rgba(15,23,42,0.18)] print:h-[11in] print:w-[8.5in] print:max-w-none print:px-[0.62in] print:py-[0.58in]">
        <header className="grid grid-cols-[1fr_auto] gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-14 w-14" />
              <div>
                <div className="text-2xl font-semibold leading-none tracking-normal text-[#1d62f9]">
                  Corevix
                </div>
                <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  CRM & Automatización
                </div>
              </div>
            </div>

            <div className="mt-8 text-[12px] leading-5 text-slate-600">
              <div className="font-semibold text-slate-950">Corevix</div>
              <div>Santo Domingo, República Dominicana</div>
              <div>hello@corevix.com</div>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-[34px] font-bold uppercase leading-none tracking-normal text-[#1d62f9]">
              Propuesta
            </h1>
            <div className="mt-2 text-sm font-semibold text-slate-700">{today}</div>
            <div className="mt-8 text-[12px] leading-5 text-slate-600">
              <div className="font-semibold uppercase tracking-wide text-slate-500">Para</div>
              <div className="font-semibold text-slate-950">{clientName}</div>
              <div>{proposal?.number || "Sin número"}</div>
              <div>
                {proposal?.valid_until
                  ? `Válida hasta ${proposal.valid_until}`
                  : "Validez pendiente"}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <div className="grid grid-cols-[1fr_1.1in_0.75in_1.25in] bg-[#1d62f9] px-5 py-3 text-[12px] font-semibold text-white">
            <div>Descripción</div>
            <div className="text-right">Precio</div>
            <div className="text-center">Cant.</div>
            <div className="text-right">Total</div>
          </div>

          <div>
            {rows.map((row, index) => (
              <div
                key={`${row.name}-${index}`}
                className="grid min-h-[0.72in] grid-cols-[1fr_1.1in_0.75in_1.25in] items-start border-b border-slate-300 px-5 py-4 text-[12px]"
              >
                <div className="pr-6">
                  <div className="font-bold text-slate-950">{row.name}</div>
                  {row.description ? (
                    <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                      {row.description}
                    </div>
                  ) : null}
                </div>
                <div className="text-right font-semibold">
                  {row.total ? formatMoney(row.total, currency) : "Incluido"}
                </div>
                <div className="text-center font-semibold">{row.qty}</div>
                <div className="text-right font-semibold">
                  {row.total ? formatMoney(row.total, currency) : "-"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-[1fr_2.45in] gap-10">
          <div className="text-[11px] leading-5 text-slate-600">
            <div className="mb-2 font-bold text-slate-950">Nota</div>
            <p className="m-0">
              {notes ||
                nextStep ||
                "Esta propuesta resume el alcance, inversión y condiciones principales del servicio."}
            </p>
          </div>

          <div className="text-[12px]">
            <div className="flex justify-between border-b border-slate-200 py-2">
              <span className="font-semibold uppercase text-[#1d62f9]">Subtotal</span>
              <span className="font-bold">{formatMoney(amount, currency)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 py-2">
              <span className="font-semibold">Impuestos</span>
              <span className="font-bold">{formatMoney(0, currency)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 py-2">
              <span className="font-semibold">Descuento</span>
              <span className="font-bold">{formatMoney(0, currency)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between bg-[#1d62f9] px-5 py-4 text-white">
              <span className="text-[15px] font-bold uppercase">Total</span>
              <span className="text-[18px] font-bold">{formatMoney(amount, currency)}</span>
            </div>
          </div>
        </section>

        <div className="mt-auto">
          <div className="mb-7 text-[15px] font-bold text-[#1d62f9]">
            Gracias por considerar a Corevix.
          </div>

          <footer className="grid grid-cols-3 gap-8 border-t border-[#1d62f9] pt-5 text-[9.5px] leading-4 text-slate-600">
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Contacto</div>
              <div>Email: hello@corevix.com</div>
              <div>Web: corevix.com</div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Condiciones</div>
              <div>{estimatedTime ? `Tiempo: ${estimatedTime}` : "Tiempo a coordinar"}</div>
              <div>{paymentTermsText || "Pago según acuerdo comercial."}</div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Términos</div>
              <div className="line-clamp-3">
                {termsText ||
                  "La propuesta está sujeta a disponibilidad, alcance final y aprobación del cliente."}
              </div>
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}

function ProposalDocumentView(props: {
  proposal: any;
  items?: any[];
  approved: boolean;
  approving: boolean;
  onApprove: () => void;
  onPrint: () => void;
}) {
  const { proposal, items = [], approved, approving, onApprove, onPrint } = props;
  const data =
    proposal?.proposal_data && typeof proposal.proposal_data === "object"
      ? proposal.proposal_data
      : {};
  const client = proposal?.client && typeof proposal.client === "object" ? proposal.client : {};
  const currency = proposal?.currency || "USD";
  const subtotal = Number(proposal?.subtotal ?? proposal?.amount ?? 0);
  const taxTotal = Number(proposal?.tax_total ?? 0);
  const total = Number(proposal?.total ?? proposal?.amount ?? subtotal + taxTotal);

  const clientName =
    String(
      proposal?.recipient_name ||
        client?.company_name ||
        client?.contact_person ||
        (data as any)?.companyName ||
        (data as any)?.clientName ||
        "",
    ).trim() || "Cliente";
  const clientEmail = String(proposal?.recipient_email || client?.email || "").trim();
  const clientPhone = String(proposal?.recipient_phone || client?.phone || "").trim();
  const clientAddress = String(proposal?.recipient_address || "").trim();
  const serviceDescription = String(
    (data as any)?.serviceDescription || proposal?.description || proposal?.title || "",
  ).trim();
  const introductionText = String((data as any)?.introductionText || "").trim();
  const objectiveText = String((data as any)?.objectiveText || "").trim();
  const content = String(proposal?.content || proposal?.notes || "").trim();
  const deliverables = splitProposalItems(String((data as any)?.deliverablesText || ""));
  const features = splitProposalItems(String((data as any)?.featuresText || ""));
  const optionalServices = splitProposalItems(String((data as any)?.optionalServicesText || ""));
  const requirements = splitProposalItems(String((data as any)?.clientRequirementsText || ""));
  const estimatedTime = String((data as any)?.estimatedTime || "").trim();
  const nextStep = String((data as any)?.nextStep || "").trim();
  const termsText = String((data as any)?.termsText || "").trim();
  const paymentTermsText = String((data as any)?.paymentTermsText || "").trim();
  const investmentDetailsText = String((data as any)?.investmentDetailsText || "").trim();
  const proposalDate = proposal?.proposal_date || proposal?.created_at || null;

  const documentRows = (Array.isArray(items) ? items : [])
    .map((item) => ({
      name: String(item?.item_name || item?.name || item?.description || "Servicio").trim(),
      description: String(item?.description || "").trim(),
      qty: Number(item?.quantity || 1),
      rate: Number(item?.rate || item?.converted_rate || 0),
      taxRate: Number(item?.tax_rate || 0),
      amount: Number(item?.amount || 0),
    }))
    .filter((item) => item.name || item.description);

  const fallbackRows = (
    deliverables.length ? deliverables : features.length ? features : [serviceDescription]
  )
    .filter(Boolean)
    .slice(0, 6)
    .map((item, index) => ({
      name: item,
      description:
        index === 0 && serviceDescription && serviceDescription !== item ? serviceDescription : "",
      qty: 1,
      rate: index === 0 ? total : 0,
      taxRate: 0,
      amount: index === 0 ? total : 0,
    }));

  const rows = documentRows.length
    ? documentRows
    : fallbackRows.length
      ? fallbackRows
      : [
          {
            name: proposal?.title || "Propuesta comercial",
            description: serviceDescription,
            qty: 1,
            rate: total,
            taxRate: 0,
            amount: total,
          },
        ];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-3 text-[18px] font-bold tracking-normal text-slate-950">{title}</h2>
      <div className="text-[12px] leading-5 text-slate-700">{children}</div>
    </section>
  );

  return (
    <main className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @page { size: A4; margin: 0.48in; }
        @media print {
          html, body { background: #fff !important; }
          .proposal-print-toolbar { display: none !important; }
          .proposal-document-page { box-shadow: none !important; margin: 0 !important; width: auto !important; max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="proposal-print-toolbar sticky top-3 z-20 mx-auto mb-4 flex max-w-[8.27in] flex-wrap items-center justify-end gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-slate-200 bg-white shadow-none"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button
          type="button"
          className="h-9 rounded-full bg-slate-950 px-4 text-white shadow-none hover:bg-slate-800"
          onClick={onApprove}
          disabled={approved || approving}
        >
          <Check className="h-4 w-4" />
          {approved ? "Aprobada" : approving ? "Aprobando..." : "Aprobar"}
        </Button>
      </div>

      <article className="proposal-document-page mx-auto w-full max-w-[8.27in] bg-white px-[0.45in] py-[0.42in] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <header className="grid grid-cols-[1fr_auto] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-14 w-14" />
              <div>
                <div className="text-2xl font-semibold leading-none tracking-normal">Corevix</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  CRM & Automatización
                </div>
              </div>
            </div>
            <div className="mt-8 text-[12px] leading-5 text-slate-600">
              <div className="font-semibold text-slate-950">Corevix Agency</div>
              <div>Santo Domingo, República Dominicana</div>
              <div>corevix.rd@gmail.com</div>
            </div>
          </div>

          <div className="max-w-[2.8in] text-right text-[12px] leading-5 text-slate-600">
            <div className="font-semibold uppercase tracking-wide text-slate-500">Para</div>
            <div className="font-semibold text-slate-950">{clientName}</div>
            {clientAddress ? <div>{clientAddress}</div> : null}
            {clientPhone ? <div>{clientPhone}</div> : null}
            {clientEmail ? <div>{clientEmail}</div> : null}
          </div>
        </header>

        <section className="mt-10 grid grid-cols-[1fr_1.75in] gap-8">
          <div>
            <div className="text-[22px] font-bold leading-tight">
              {proposal?.number || "PROP"} · {proposal?.title || "Propuesta comercial"}
            </div>
            {serviceDescription ? (
              <p className="mt-2 max-w-[5.2in] text-[12px] leading-5 text-slate-600">
                {serviceDescription}
              </p>
            ) : null}
          </div>
          <div className="rounded-sm border border-slate-200 text-[11px]">
            <div className="flex justify-between border-b border-slate-200 px-3 py-2">
              <span className="font-semibold text-slate-500">Fecha</span>
              <span>{proposalDate ? new Date(proposalDate).toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 px-3 py-2">
              <span className="font-semibold text-slate-500">Válida hasta</span>
              <span>{proposal?.valid_until || "—"}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="font-semibold text-slate-500">Estado</span>
              <span>{approved ? "Aprobada" : proposal?.status || "Borrador"}</span>
            </div>
          </div>
        </section>

        <section className="mt-8 break-inside-avoid">
          <div className="grid grid-cols-[0.34in_1fr_0.62in_1in_0.72in_1.05in] bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700">
            <div>#</div>
            <div>Ítem</div>
            <div className="text-right">Cant.</div>
            <div className="text-right">Tarifa</div>
            <div className="text-right">Imp.</div>
            <div className="text-right">Importe</div>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${row.name}-${index}`}
              className="grid grid-cols-[0.34in_1fr_0.62in_1in_0.72in_1.05in] border-b border-slate-200 px-3 py-3 text-[11px] leading-4"
            >
              <div>{index + 1}</div>
              <div className="pr-5">
                <div className="font-bold text-slate-950">{row.name}</div>
                {row.description ? (
                  <div className="mt-1 text-[10px] leading-4 text-slate-600">{row.description}</div>
                ) : null}
              </div>
              <div className="text-right">{row.qty}</div>
              <div className="text-right">{formatMoney(row.rate, currency)}</div>
              <div className="text-right">{row.taxRate ? `${row.taxRate}%` : "0%"}</div>
              <div className="text-right font-semibold">{formatMoney(row.amount, currency)}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-[1fr_2.35in] gap-8 break-inside-avoid">
          <div className="text-[11px] leading-5 text-slate-600">
            {introductionText || objectiveText || content ? (
              <>
                <div className="mb-2 font-bold text-slate-950">Resumen</div>
                <p className="m-0 whitespace-pre-line">
                  {introductionText || objectiveText || content}
                </p>
              </>
            ) : null}
          </div>
          <div className="text-[12px]">
            <div className="flex justify-between border-b border-slate-200 py-2">
              <span className="font-semibold">Sub total</span>
              <span className="font-bold">{formatMoney(subtotal, currency)}</span>
            </div>
            {taxTotal ? (
              <div className="flex justify-between border-b border-slate-200 py-2">
                <span className="font-semibold">Impuestos</span>
                <span className="font-bold">{formatMoney(taxTotal, currency)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
              <span className="font-bold uppercase">Total</span>
              <span className="text-[17px] font-bold">{formatMoney(total, currency)}</span>
            </div>
          </div>
        </section>

        {deliverables.length || features.length ? (
          <Section title="Servicios incluidos">
            <div className="grid grid-cols-2 gap-5">
              {deliverables.length ? (
                <ul className="m-0 list-disc space-y-1 pl-5">
                  {deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {features.length ? (
                <ul className="m-0 list-disc space-y-1 pl-5">
                  {features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Section>
        ) : null}

        {optionalServices.length ? (
          <Section title="Servicios opcionales">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {optionalServices.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Condiciones comerciales">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="font-bold text-slate-950">Tiempo y proceso</div>
              <p className="m-0 mt-1 whitespace-pre-line">
                {estimatedTime ||
                  nextStep ||
                  "El calendario final se coordina al aprobar la propuesta."}
              </p>
            </div>
            <div>
              <div className="font-bold text-slate-950">Pago</div>
              <p className="m-0 mt-1 whitespace-pre-line">
                {paymentTermsText ||
                  investmentDetailsText ||
                  "Los pagos se coordinan según el acuerdo comercial aprobado."}
              </p>
            </div>
          </div>
        </Section>

        {requirements.length ? (
          <Section title="Requisitos del cliente">
            <ul className="m-0 list-disc space-y-1 pl-5">
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Términos y firma">
          <p className="m-0 whitespace-pre-line">
            {termsText ||
              "Esta propuesta está sujeta a validación final de alcance, disponibilidad del equipo y aprobación del cliente."}
          </p>
          <div className="mt-10 text-[12px] text-slate-700">
            Firma autorizada ______________________________________
          </div>
        </Section>
      </article>
    </main>
  );
}

function PublicProposalView(props: {
  proposal: any;
  approved: boolean;
  approving: boolean;
  onApprove: () => void;
  onPrint: () => void;
}) {
  const { proposal, approved, approving, onApprove, onPrint } = props;

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const data =
    proposal?.proposal_data && typeof proposal.proposal_data === "object"
      ? proposal.proposal_data
      : {};

  const clientLabel =
    String((data as any)?.companyName || (data as any)?.clientName || "").trim() ||
    (proposal?.client_id ? `Cliente ${String(proposal.client_id).slice(0, 8)}…` : "—");

  const introductionText = String((data as any)?.introductionText || "").trim();
  const objectiveText = String((data as any)?.objectiveText || "").trim();
  const serviceDescription = String(
    (data as any)?.serviceDescription || proposal?.description || "",
  ).trim();

  const deliverablesText = String((data as any)?.deliverablesText || "").trim();
  const featuresText = String((data as any)?.featuresText || "").trim();
  const optionalServicesText = String((data as any)?.optionalServicesText || "").trim();
  const outOfScopeText = String((data as any)?.outOfScopeText || "").trim();

  const initialStageText = String((data as any)?.initialStageText || "").trim();
  const productionStageText = String((data as any)?.productionStageText || "").trim();
  const revisionStageText = String((data as any)?.revisionStageText || "").trim();
  const finalStageText = String((data as any)?.finalStageText || "").trim();
  const processText = String((data as any)?.processText || "").trim();
  const processStepsRaw = Array.isArray((data as any)?.processSteps)
    ? (data as any).processSteps
    : [];

  const clientRequirementsText = String((data as any)?.clientRequirementsText || "").trim();
  const requiredMaterialsText = String((data as any)?.requiredMaterialsText || "").trim();
  const requiredAccessText = String((data as any)?.requiredAccessText || "").trim();
  const clientResponseTimeText = String((data as any)?.clientResponseTimeText || "").trim();

  const estimatedTime = String((data as any)?.estimatedTime || "").trim();
  const revisionRoundsText = String((data as any)?.revisionRoundsText || "").trim();
  const termsText = String((data as any)?.termsText || "").trim();
  const nextStep = String((data as any)?.nextStep || "").trim();

  const paymentFrequency = String((data as any)?.paymentFrequency || "").trim();
  const investmentDetailsText = String((data as any)?.investmentDetailsText || "").trim();
  const additionalCostsText = String((data as any)?.additionalCostsText || "").trim();
  const paymentTermsText = String((data as any)?.paymentTermsText || "").trim();

  const additionalMessage = String(proposal?.content || "").trim();

  const statusLabel = approved ? "Aprobada" : String(proposal?.status || "Draft");
  const amountLabel = formatMoney(Number(proposal?.amount || 0), proposal?.currency);

  const splitItems = (text: string) =>
    String(text || "")
      .split(/\n|•/)
      .map((item) => item.trim())
      .filter(Boolean);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const showExecutiveSummary = introductionText || objectiveText || serviceDescription;
  const showScope = deliverablesText || featuresText || optionalServicesText || outOfScopeText;
  const showProcess =
    processStepsRaw.length ||
    processText ||
    initialStageText ||
    productionStageText ||
    revisionStageText ||
    finalStageText;
  const showRequirements =
    clientRequirementsText || requiredMaterialsText || requiredAccessText || clientResponseTimeText;
  const showTerms = estimatedTime || revisionRoundsText || termsText || nextStep;
  const showInvestment = investmentDetailsText || additionalCostsText || paymentTermsText;

  const Icon = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={`inline-grid place-items-center ${className}`}>{children}</span>;

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <section className="mb-2 overflow-hidden rounded-[10px] border border-[#dce6f3] bg-white shadow-[0_8px_22px_rgba(10,32,80,0.07)]">
      {children}
    </section>
  );

  const SectionTitle = ({ title, right }: { title: string; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 px-[13px] pb-2 pt-3">
      <h2 className="m-0 text-[17px] font-[720] leading-[1.18] tracking-[-0.012em] text-[#151b2c]">
        {title}
      </h2>
      {right}
    </div>
  );

  const SummaryItem = ({
    icon,
    title,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <article className="min-w-0 border-r border-[#edf2f7] px-2 pb-3 pt-2.5 last:border-r-0">
      <div className="mb-[7px] grid h-9 w-9 place-items-center rounded-[10px] bg-[#eef5ff] text-[#1d62f9]">
        <Icon className="h-5 w-5">{icon}</Icon>
      </div>
      <p className="mb-[5px] mt-0 text-[11.8px] font-[680] leading-[1.18] tracking-[-0.004em] text-[#151b2c]">
        {title}
      </p>
      <div className="text-[10.8px] font-medium leading-[1.45] tracking-[0.006em] text-[#344054]">
        {children}
      </div>
    </article>
  );

  const CheckGrid = ({ items }: { items: string[] }) => (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-[7px] px-[13px] pb-[11px]">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="flex items-start gap-[7px] text-[12.5px] font-medium leading-[1.35] tracking-[0.002em] text-[#263146]"
        >
          <span className="mt-px grid h-4 w-4 min-w-4 place-items-center rounded-full bg-[#1d62f9] text-[10px] font-[780] text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );

  const AccordionItem = ({
    id,
    icon,
    title,
    items,
    tone = "blue",
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    items: string[];
    tone?: "blue" | "purple" | "orange";
  }) => {
    if (!items.length) return null;

    const isOpen = Boolean(openAccordions[id]);
    const toneClass =
      tone === "purple"
        ? "text-[#7c3aed]"
        : tone === "orange"
          ? "text-[#f59e0b]"
          : "text-[#1d62f9]";

    return (
      <>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleAccordion(id)}
          className={`flex h-[37px] w-full cursor-pointer select-none items-center justify-between border-0 border-b border-[#edf2f7] bg-white px-[13px] text-left text-[13.5px] font-[650] tracking-[0.002em] text-[#151b2c] appearance-none ${
            isOpen ? "bg-[#fbfdff]" : ""
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Icon className={`h-[18px] w-[18px] ${toneClass}`}>{icon}</Icon>
            <span>{title}</span>
          </span>
          <span className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </button>

        {isOpen ? (
          <div className="border-b border-[#edf2f7] bg-white px-[13px] pb-2.5 pl-[41px] text-[11.8px] leading-[1.38] tracking-[0.006em] text-[#344054]">
            <ul className="m-0 grid list-none gap-[7px] p-0">
              {items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="relative pl-3.5 before:absolute before:left-0 before:top-[0.62em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[#1d62f9]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    );
  };

  const ProcessStep = ({
    number,
    title,
    text,
    isLast = false,
  }: {
    number: string;
    title: string;
    text: string;
    isLast?: boolean;
  }) => (
    <article className="relative min-w-0 text-center">
      {!isLast ? (
        <span className="absolute left-1/2 top-[14px] z-0 w-full border-t-2 border-[#9bc1ff]" />
      ) : null}
      <div className="relative z-10 mx-auto mb-[17px] grid h-[30px] w-[30px] place-items-center rounded-full bg-[#1d62f9] text-[11.8px] font-[780] text-white shadow-[0_0_0_4px_#fff]">
        {number}
      </div>
      <span className="absolute left-1/2 top-[30px] h-[17px] border-l-2 border-[#1d62f9]" />
      <h3 className="mb-1 mt-0 text-[11.8px] font-[680] leading-[1.18] tracking-[-0.004em] text-[#151b2c]">
        {title}
      </h3>
      <p className="m-0 text-[10.8px] font-medium leading-[1.25] tracking-[0.006em] text-[#344054]">
        {text}
      </p>
    </article>
  );

  const MiniCard = ({
    icon,
    title,
    text,
  }: {
    icon: React.ReactNode;
    title: string;
    text: string;
  }) => {
    if (!text) return null;

    return (
      <article className="min-w-0 rounded-lg border border-[#dce6f3] px-[7px] pb-2 pt-[9px]">
        <Icon className="mb-1 h-[21px] w-[21px] text-[#1d62f9]">{icon}</Icon>
        <h3 className="mb-1 mt-0 text-[11.8px] font-[680] leading-[1.16] tracking-[-0.004em] text-[#151b2c]">
          {title}
        </h3>
        <p className="m-0 text-[10.4px] font-medium leading-[1.25] tracking-[0.006em] text-[#344054]">
          {text}
        </p>
      </article>
    );
  };

  const DetailCard = ({
    icon,
    title,
    text,
  }: {
    icon: React.ReactNode;
    title: string;
    text: string;
  }) => {
    if (!text) return null;

    return (
      <article className="min-w-0 border border-r-0 border-[#dce6f3] bg-white px-[7px] py-2 first:rounded-l-lg last:rounded-r-lg last:border-r">
        <Icon className="mb-[5px] h-[22px] w-[22px] text-[#1d62f9]">{icon}</Icon>
        <h3 className="mb-1 mt-0 text-[11.8px] font-[680] leading-[1.05] tracking-[-0.004em] text-[#151b2c]">
          {title}
        </h3>
        <p className="m-0 text-[10.5px] font-medium leading-[1.28] tracking-[0.006em] text-[#344054]">
          {text}
        </p>
      </article>
    );
  };

  const InvestmentDetailCard = ({
    icon,
    title,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <article className="min-w-0 border border-r-0 border-[#dce6f3] px-2.5 py-2.5 first:rounded-l-lg last:rounded-r-lg last:border-r">
      <Icon className="mb-[5px] h-[22px] w-[22px] text-[#1d62f9]">{icon}</Icon>
      <h3 className="mb-1 mt-0 text-[11.8px] font-[680] leading-[1.18] tracking-[-0.004em] text-[#151b2c]">
        {title}
      </h3>
      <div className="text-[10.6px] font-medium leading-[1.35] tracking-[0.006em] text-[#344054]">
        {children}
      </div>
    </article>
  );

  const deliverableItems = splitItems(deliverablesText);
  const featuresItems = splitItems(featuresText);
  const optionalItems = splitItems(optionalServicesText);
  const outOfScopeItems = splitItems(outOfScopeText);

  const processStepsFromData = processStepsRaw
    .map((step: any, index: number) => ({
      number: String(index + 1).padStart(2, "0"),
      title: String(step?.title || `Paso ${index + 1}`).trim(),
      text: String(step?.description || "").trim(),
      order: Number(step?.order || index + 1),
    }))
    .sort((a: any, b: any) => a.order - b.order)
    .filter((step: any) => step.title || step.text);

  const processStepsFromFallback = [
    { number: "01", title: "Etapa inicial", text: initialStageText },
    { number: "02", title: "Producción / desarrollo", text: productionStageText },
    { number: "03", title: "Revisión", text: revisionStageText },
    { number: "04", title: "Entrega final", text: finalStageText },
  ].filter((step) => step.text);

  const processStepsFromText = processText
    ? processText
        .split(/\n{2,}/)
        .map((chunk, index) => {
          const lines = chunk
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          if (!lines.length) return null;
          const header = lines[0];
          const content = lines.slice(1).join(" ");
          const cleanedHeader = header.replace(/^\d+\.\s*/, "").trim();
          return {
            number: String(index + 1).padStart(2, "0"),
            title: cleanedHeader || `Paso ${index + 1}`,
            text: content,
          };
        })
        .filter(Boolean)
    : [];

  const processSteps =
    processStepsFromData.length > 0
      ? processStepsFromData
      : processStepsFromText.length > 0
        ? (processStepsFromText as Array<{ number: string; title: string; text: string }>)
        : processStepsFromFallback;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(29,98,249,.28),transparent_34%),linear-gradient(180deg,#020817_0%,#07152e_100%)] px-3 py-4 text-[#101828] print:bg-white">
      <article className="mx-auto w-full max-w-[430px] overflow-hidden bg-white shadow-[0_20px_60px_rgba(10,32,80,0.14)] print:max-w-none print:shadow-none">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-b-[24px] bg-[radial-gradient(circle_at_85%_34%,rgba(29,98,249,.45),transparent_34%),linear-gradient(135deg,#030b1d_0%,#07152e_55%,#0b3c94_100%)] px-[18px] pb-[18px] pt-[22px] text-white before:absolute before:inset-0 before:-z-10 before:translate-x-[120px] before:translate-y-5 before:bg-[linear-gradient(30deg,transparent_0_47%,rgba(255,255,255,.06)_48%_49%,transparent_50%),linear-gradient(150deg,transparent_0_47%,rgba(255,255,255,.05)_48%_49%,transparent_50%)] before:bg-[length:86px_86px] before:opacity-55 print:rounded-none">
          <div className="mb-[22px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/corevix-logo-white.svg"
                alt="Corevix"
                className="h-7 w-auto max-w-[150px] object-contain"
              />
            </div>

            <div className="inline-flex items-center gap-[7px] rounded-full border border-white/30 bg-white/10 px-[13px] py-[7px] text-[11.8px] font-[680]">
              <span className="h-[7px] w-[7px] rounded-full bg-white/90" />
              <span>{statusLabel}</span>
            </div>
          </div>

          <p className="mb-2 mt-0 text-[13.5px] font-[680] text-[#4f94ff]">Propuesta comercial</p>

          <h1 className="m-0 max-w-[350px] text-[26px] font-[760] leading-[1.12] tracking-[-0.024em]">
            {proposal?.title || "Propuesta"}
          </h1>

          <div className="mt-3.5 grid gap-2 text-[13.5px] font-medium tracking-[0.006em] text-white/80">
            <div className="flex items-center gap-[9px]">
              <span>{proposal?.number || "—"}</span>
              <Icon className="h-[18px] w-[18px]">
                <Copy className="h-[18px] w-[18px]" />
              </Icon>
            </div>

            <div className="flex items-center gap-[9px]">
              <Icon className="h-[18px] w-[18px]">
                <User className="h-[18px] w-[18px]" />
              </Icon>
              <span>{clientLabel}</span>
            </div>
          </div>

          <div className="mt-[18px] grid grid-cols-2 gap-2.5 print:hidden">
            <button
              type="button"
              onClick={onApprove}
              disabled={approved || approving}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] border-0 bg-[linear-gradient(180deg,#2d75ff,#1d62f9)] px-3 text-[13.5px] font-[680] tracking-[0.004em] text-white shadow-[0_12px_26px_rgba(29,98,249,.34)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <Icon className="h-[18px] w-[18px]">
                <Check className="h-[18px] w-[18px]" />
              </Icon>
              {approved ? "Aprobada" : approving ? "Aprobando…" : "Aprobar propuesta"}
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] border border-white/60 bg-white px-3 text-[13.5px] font-[680] tracking-[0.004em] text-[#121826] shadow-[0_12px_24px_rgba(0,0,0,.10)] transition-transform hover:-translate-y-px"
            >
              <Icon className="h-[18px] w-[18px]">
                <Printer className="h-[18px] w-[18px]" />
              </Icon>
              Imprimir
            </button>
          </div>
        </section>

        <div className="px-2 pt-3">
          {/* Investment Card */}
          <section className="relative mb-2.5 overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,#0f5bf4_0%,#1775ff_100%)] px-4 pb-4 pt-[18px] text-white shadow-[0_14px_34px_rgba(29,98,249,.28)] after:absolute after:right-[26px] after:top-5 after:grid after:h-[68px] after:w-[68px] after:place-items-center after:rounded-full after:bg-white/15 after:text-[42px] after:font-normal after:text-white/70 after:content-['$']">
            <p className="m-0 text-base font-[700] leading-none">Inversión</p>
            <div className="my-3 mb-[5px] text-[40px] font-[720] leading-[0.9] tracking-[0.005em]">
              {amountLabel}
            </div>
            <p className="m-0 text-[13.5px] font-[700] opacity-95">
              {paymentFrequency || "Mensual"}
            </p>

            <div className="mt-4 flex items-center justify-end gap-[7px] text-[13.5px] font-[650] tracking-[0.006em]">
              <Icon className="h-4 w-4">
                <Calendar className="h-4 w-4" />
              </Icon>
              <span>Válida hasta: {proposal?.valid_until || "—"}</span>
            </div>
          </section>

          {/* Approval Notice */}
          {approved ? (
            <section className="mb-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-[12.5px] leading-relaxed text-emerald-900 print:hidden">
              Esta propuesta ya fue aprobada. Gracias por confirmar el avance.
            </section>
          ) : null}

          {/* Simple Summary */}
          {showExecutiveSummary ? (
            <SectionCard>
              <SectionTitle title="Resumen rápido" />
              <div className="px-[13px] pb-3 text-[13px] leading-relaxed text-[#344054]">
                {introductionText || objectiveText || serviceDescription}
              </div>
            </SectionCard>
          ) : null}

          {/* What is included */}
          {deliverableItems.length || featuresItems.length ? (
            <SectionCard>
              <SectionTitle title="Qué incluye" />
              <CheckGrid
                items={(deliverableItems.length ? deliverableItems : featuresItems).slice(0, 6)}
              />
            </SectionCard>
          ) : null}

          {/* Workflow Process */}
          {showProcess ? (
            <SectionCard>
              <SectionTitle title="Proceso de trabajo" />
              <div className="px-[13px] pb-[13px]">
                {processSteps.length ? (
                  <div className="grid gap-2">
                    {processSteps.map((step: any, index: number) => (
                      <div
                        key={`${step.number}-${index}`}
                        className="flex gap-3 rounded-[10px] border border-[#e7eef8] bg-[#f8fbff] px-3 py-2.5"
                      >
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1d62f9] text-[12px] font-[800] text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-[720] leading-tight text-[#151b2c]">
                            {step.title}
                          </div>
                          {step.text ? (
                            <div className="mt-1 text-[12px] font-medium leading-[1.4] text-[#475467]">
                              {step.text}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : processText ? (
                  <div className="rounded-[10px] border border-[#e7eef8] bg-[#f8fbff] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#344054]">
                    {processText}
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {/* Simple Conditions */}
          {estimatedTime || paymentFrequency || proposal?.valid_until || nextStep ? (
            <SectionCard>
              <SectionTitle title="Condiciones principales" />
              <div className="grid grid-cols-3 px-2 pb-2">
                <DetailCard
                  icon={<Calendar className="h-[22px] w-[22px]" />}
                  title="Tiempo estimado"
                  text={estimatedTime || "A coordinar"}
                />
                <DetailCard
                  icon={<CreditCard className="h-[22px] w-[22px]" />}
                  title="Forma de pago"
                  text={paymentFrequency || paymentTermsText || "A coordinar"}
                />
                <DetailCard
                  icon={<ArrowRightCircle className="h-[22px] w-[22px]" />}
                  title="Validez"
                  text={proposal?.valid_until || "—"}
                />
              </div>
            </SectionCard>
          ) : null}

          {/* Additional Message */}
          {additionalMessage ? (
            <SectionCard>
              <SectionTitle title="Mensaje adicional" />
              <div className="px-[13px] pb-3 text-[12.5px] leading-relaxed text-[#344054]">
                {additionalMessage}
              </div>
            </SectionCard>
          ) : null}

          {/* CTA */}
          <section className="relative mb-3 overflow-hidden rounded-[10px] bg-[radial-gradient(circle_at_85%_10%,rgba(29,98,249,.30),transparent_28%),linear-gradient(135deg,#030b1d_0%,#07152e_100%)] px-[13px] py-3.5 text-white after:absolute after:-bottom-10 after:-right-10 after:h-40 after:w-40 after:bg-[linear-gradient(30deg,transparent_0_47%,rgba(255,255,255,.07)_48%_49%,transparent_50%),linear-gradient(150deg,transparent_0_47%,rgba(255,255,255,.06)_48%_49%,transparent_50%)] after:bg-[length:48px_48px] after:opacity-70 print:hidden">
            <div className="relative z-10 mb-3 flex items-center gap-3">
              <div className="grid h-[43px] w-[43px] min-w-[43px] place-items-center rounded-full bg-[linear-gradient(180deg,#2d75ff,#1d62f9)] shadow-[0_0_0_8px_rgba(29,98,249,.18)]">
                <Icon className="h-6 w-6">
                  <Rocket className="h-6 w-6" />
                </Icon>
              </div>

              <div>
                <h2 className="m-0 text-[21px] font-[720] leading-[1.16] tracking-[-0.012em]">
                  ¿Listo para avanzar?
                </h2>
                <p className="m-0 mt-0.5 text-[11.8px] font-medium leading-[1.35] text-white/75">
                  Aprobar esta propuesta es el primer paso para impulsar tu marca en redes sociales.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onApprove}
              disabled={approved || approving}
              className="relative z-10 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border-0 bg-[linear-gradient(180deg,#2d75ff,#1d62f9)] px-3 text-[13.5px] font-[680] tracking-[0.004em] text-white shadow-[0_12px_26px_rgba(29,98,249,.34)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <Icon className="h-[18px] w-[18px]">
                <Check className="h-[18px] w-[18px]" />
              </Icon>
              {approved ? "Propuesta aprobada" : approving ? "Aprobando…" : "Aprobar propuesta"}
            </button>

            <p className="relative z-10 m-0 mt-2 text-center text-[11.5px] font-medium leading-[1.35] text-white/70">
              Al aprobar, el sistema genera automáticamente una factura en el módulo de Invoices.
            </p>
          </section>

          <div className="px-2.5 pb-3 text-center text-[11.8px] leading-[1.35] text-[#7b8495]">
            Gracias por confiar en Corevix.
            <strong className="block font-[680] text-[#6b7280]">
              Impulsamos tu marca, conectamos resultados.
            </strong>
          </div>
        </div>
      </article>
    </main>
  );
}

function ProposalPublicPage() {
  const { publicToken } = Route.useParams();
  const token = useMemo(() => String(publicToken || "").trim(), [publicToken]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any | null>(null);
  const [proposalItems, setProposalItems] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [invoicePublicToken, setInvoicePublicToken] = useState<string | null>(null);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);
  const [approvedInvoice, setApprovedInvoice] = useState<{
    publicToken: string;
    number: string | null;
    status: string | null;
    total: number | null;
  } | null>(null);

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
        const { data, error: err } = await db.rpc("get_proposal_public", {
          p_proposal_public_token: token,
        });
        if (err) throw err;

        const proposalData = data?.proposal ?? null;
        if (!proposalData) {
          setProposal(null);
          setError("No se encontró la propuesta.");
          setLoading(false);
          return;
        }

        if (cancelled) return;
        setProposal(proposalData);
        setProposalItems(Array.isArray(data?.items) ? data.items : []);
        setApproved(
          String(proposalData?.status || "").toLowerCase() === "approved" ||
            Boolean(proposalData?.approved_at),
        );
        setInvoicePublicToken(null);
        setApproveMessage(null);
        setApprovedInvoice(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "No se pudo cargar la propuesta.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!proposal) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") === "1") {
      const timeout = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(timeout);
    }
  }, [proposal]);

  async function handleApprove() {
    if (!token) return;
    if (approving) return;
    setApproving(true);
    try {
      const db = supabase as any;
      const { data, error: err } = await db.rpc("approve_proposal_public", {
        p_proposal_public_token: token,
      });
      if (err) {
        console.error("approve_proposal_public error:", err);
        throw err;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const nextInvoiceToken = row?.invoice_public_token ? String(row.invoice_public_token) : null;

      setInvoicePublicToken(nextInvoiceToken);
      if (nextInvoiceToken) {
        setApprovedInvoice({
          publicToken: nextInvoiceToken,
          number: row?.invoice_number ? String(row.invoice_number) : null,
          status: row?.invoice_status ? String(row.invoice_status) : null,
          total: row?.invoice_total != null ? Number(row.invoice_total) : null,
        });
      }
      setApproveMessage("Propuesta aprobada. Tu factura fue generada correctamente.");
      setApproved(true);
      setProposal((p: any) =>
        p
          ? { ...p, status: "Approved", approved_at: p.approved_at ?? new Date().toISOString() }
          : p,
      );
    } catch (e: any) {
      toast.error("No se pudo aprobar la propuesta. Intenta nuevamente.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        Cargando propuesta…
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

  if (!proposal) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        No se encontró la propuesta.
      </div>
    );
  }

  return (
    <div>
      {String(proposal?.template_key || "") === "custom_html" && proposal?.content ? (
        <ProposalTemplateRenderer
          proposal={proposal}
          items={proposalItems}
          mode="public"
          approved={approved}
          approving={approving}
          onApprove={() => void handleApprove()}
          onPrint={() => window.print()}
        />
      ) : (
        <ProposalDocumentView
          proposal={proposal}
          items={proposalItems}
          approved={approved}
          approving={approving}
          onApprove={() => void handleApprove()}
          onPrint={() => window.print()}
        />
      )}

      {approved && (approveMessage || invoicePublicToken) ? (
        <div className="mx-auto w-full max-w-[430px] px-4 pb-10 -mt-6 print:hidden">
          <div className="rounded-[12px] border bg-white px-4 py-3 text-sm">
            <div className="font-medium">{approveMessage || "Propuesta aprobada."}</div>
            {approvedInvoice?.publicToken || invoicePublicToken ? (
              <div className="mt-2">
                <Button
                  type="button"
                  className="h-9"
                  onClick={() => {
                    const t = approvedInvoice?.publicToken || invoicePublicToken;
                    if (!t) return;
                    window.open(
                      `${window.location.origin}/invoice/public/${t}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  Ver factura
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
