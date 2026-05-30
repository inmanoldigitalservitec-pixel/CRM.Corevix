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
import { toast } from "sonner";

export const Route = createFileRoute("/proposal/public/$publicToken")({
  component: ProposalPublicPage,
  head: () => ({ meta: [{ title: "Propuesta — Corevix" }] }),
});

function formatMoney(amount: number, currency: string | null | undefined) {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${Number(amount || 0).toLocaleString()}`;
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
    (data as any)?.serviceDescription || proposal?.description || ""
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
  const processStepsRaw = Array.isArray((data as any)?.processSteps) ? (data as any).processSteps : [];

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
  const showProcess = processStepsRaw.length || processText || initialStageText || productionStageText || revisionStageText || finalStageText;
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
  }) => (
    <span className={`inline-grid place-items-center ${className}`}>
      {children}
    </span>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <section className="mb-2 overflow-hidden rounded-[10px] border border-[#dce6f3] bg-white shadow-[0_8px_22px_rgba(10,32,80,0.07)]">
      {children}
    </section>
  );

  const SectionTitle = ({
    title,
    right,
  }: {
    title: string;
    right?: React.ReactNode;
  }) => (
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
          <span
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
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

          <p className="mb-2 mt-0 text-[13.5px] font-[680] text-[#4f94ff]">
            Propuesta comercial
          </p>

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
          {(deliverableItems.length || featuresItems.length) ? (
            <SectionCard>
              <SectionTitle title="Qué incluye" />
              <CheckGrid items={(deliverableItems.length ? deliverableItems : featuresItems).slice(0, 6)} />
            </SectionCard>
          ) : null}

          {/* Workflow Process */}
          {showProcess ? (
            <SectionCard>
              <SectionTitle title="Proceso de trabajo" />
              <div className="px-[13px] pb-[13px]">
                {processSteps.length ? (
                  <div className="grid gap-2">
                    {processSteps.map((step, index) => (
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
          {(estimatedTime || paymentFrequency || proposal?.valid_until || nextStep) ? (
            <SectionCard>
              <SectionTitle title="Condiciones principales" />
              <div className="grid grid-cols-3 px-2 pb-2">
                <DetailCard icon={<Calendar className="h-[22px] w-[22px]" />} title="Tiempo estimado" text={estimatedTime || "A coordinar"} />
                <DetailCard icon={<CreditCard className="h-[22px] w-[22px]" />} title="Forma de pago" text={paymentFrequency || paymentTermsText || "A coordinar"} />
                <DetailCard icon={<ArrowRightCircle className="h-[22px] w-[22px]" />} title="Validez" text={proposal?.valid_until || "—"} />
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
        const { data, error: err } = await db
          .from("proposals")
          .select("*")
          .eq("public_token", token)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setProposal(null);
          setError("No se encontró la propuesta.");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setProposal(data);
        setApproved(String(data?.status || "").toLowerCase() === "approved" || Boolean(data?.approved_at));
        setInvoicePublicToken(null);
        setApproveMessage(null);
        setApprovedInvoice(null);

        // Mark as viewed (best-effort). Requires DB column + permissive RLS for anon.
        const viewedAt = data?.viewed_at ?? null;
        if (!viewedAt) {
          await db
            .from("proposals")
            .update({ viewed_at: new Date().toISOString(), status: data?.status === "Sent" ? "Viewed" : data?.status })
            .eq("public_token", token);
        }
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
      setProposal((p) => (p ? { ...p, status: "Approved", approved_at: p.approved_at ?? new Date().toISOString() } : p));
    } catch (e: any) {
      toast.error("No se pudo aprobar la propuesta. Intenta nuevamente.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">Cargando propuesta…</div>;
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
      <PublicProposalView
        proposal={proposal}
        approved={approved}
        approving={approving}
        onApprove={() => void handleApprove()}
        onPrint={() => window.print()}
      />

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
                    window.open(`${window.location.origin}/invoice/public/${t}`, "_blank", "noopener,noreferrer");
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
