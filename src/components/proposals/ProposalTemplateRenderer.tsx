import { useEffect, useMemo, useState } from "react";
import { SocialMediaProposalTemplate } from "@/components/proposals/templates/SocialMediaProposalTemplate";
import {
  renderProposalTemplateHtml,
  type ProposalCompanyProfile,
} from "@/components/proposals/proposal-template-rendering";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Check, Printer } from "lucide-react";

function clean(value: unknown) {
  return String(value || "").trim();
}

function companyFromSnapshot(proposalData: any): ProposalCompanyProfile {
  return {
    company_name:
      clean(proposalData?.issuerName) || clean(proposalData?.companyName) || null,
    tax_id:
      clean(proposalData?.issuerTaxId) || clean(proposalData?.companyTaxId) || null,
    email:
      clean(proposalData?.issuerEmail) || clean(proposalData?.companyEmail) || null,
    phone:
      clean(proposalData?.issuerPhone) || clean(proposalData?.companyPhone) || null,
    address:
      clean(proposalData?.issuerAddress) || clean(proposalData?.companyAddress) || null,
    city:
      clean(proposalData?.issuerCity) || clean(proposalData?.companyCity) || null,
    country:
      clean(proposalData?.issuerCountry) || clean(proposalData?.companyCountry) || null,
    website:
      clean(proposalData?.issuerWebsite) || clean(proposalData?.companyWebsite) || null,
    logo_url:
      clean(proposalData?.issuerLogoUrl) || clean(proposalData?.companyLogoUrl) || null,
  };
}

function mergeCompanyProfiles(
  snapshot: ProposalCompanyProfile,
  current: ProposalCompanyProfile | null,
): ProposalCompanyProfile {
  return {
    company_name: snapshot.company_name || current?.company_name || null,
    tax_id: snapshot.tax_id || current?.tax_id || null,
    email: snapshot.email || current?.email || null,
    phone: snapshot.phone || current?.phone || null,
    address: snapshot.address || current?.address || null,
    city: snapshot.city || current?.city || null,
    country: snapshot.country || current?.country || null,
    website: snapshot.website || current?.website || null,
    logo_url: snapshot.logo_url || current?.logo_url || null,
  };
}

function companyAddress(company: ProposalCompanyProfile) {
  const parts: string[] = [];
  const append = (value: unknown) => {
    const next = clean(value);
    if (!next) return;
    const current = parts.join(", ").toLocaleLowerCase("es");
    if (!current.includes(next.toLocaleLowerCase("es"))) parts.push(next);
  };

  append(company.address);
  append(company.city);
  append(company.country);
  return parts.join(", ");
}

export function ProposalTemplateRenderer({
  proposal,
  mode,
  items = [],
  approved = false,
  approving = false,
  onApprove,
  onPrint,
}: {
  proposal: any;
  mode: "preview" | "public" | "admin";
  items?: any[];
  approved?: boolean;
  approving?: boolean;
  onApprove?: () => void | Promise<void>;
  onPrint?: () => void;
}) {
  const { profile } = useAuth();
  const [company, setCompany] = useState<ProposalCompanyProfile | null>(null);
  const templateKey = String(proposal?.template_key || "");
  const proposalData = (proposal?.proposal_data ?? null) as any;
  const snapshotCompany = useMemo(
    () => companyFromSnapshot(proposalData),
    [proposalData],
  );
  const resolvedCompany = useMemo(
    () => mergeCompanyProfiles(snapshotCompany, company),
    [company, snapshotCompany],
  );

  useEffect(() => {
    const companyId = profile?.company_id;

    if (!companyId) {
      setCompany(null);
      return;
    }

    let active = true;

    void supabase
      .from("companies")
      .select(
        "company_name,tax_id,email,phone,address,city,country,website,logo_url",
      )
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("No se pudo cargar la empresa de la propuesta:", error);
          setCompany(null);
          return;
        }
        setCompany(data as ProposalCompanyProfile | null);
      });

    return () => {
      active = false;
    };
  }, [profile?.company_id]);

  if (templateKey === "social_media_mobile") {
    const socialData = {
      ...proposalData,
      issuerName: resolvedCompany.company_name,
      issuerTaxId: resolvedCompany.tax_id,
      issuerEmail: resolvedCompany.email,
      issuerPhone: resolvedCompany.phone,
      issuerAddress: resolvedCompany.address,
      issuerCity: resolvedCompany.city,
      issuerCountry: resolvedCompany.country,
      issuerWebsite: resolvedCompany.website,
      issuerLogoUrl: resolvedCompany.logo_url,
    };

    return (
      <main className="min-h-screen bg-[#020817] px-3 py-4 print:bg-white print:p-0">
        <style>{`
          .proposal-company-brand { max-width: 430px; margin: 0 auto 10px; }
          .social-media-proposal-template .brand-logo,
          .social-media-proposal-template .footer-note { display: none !important; }
          @media print {
            .proposal-company-brand { margin: 0 auto 8px; }
          }
        `}</style>

        <section className="proposal-company-brand rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-lg backdrop-blur print:border-slate-200 print:bg-white print:text-slate-950 print:shadow-none">
          <div className="flex items-start gap-3">
            {resolvedCompany.logo_url ? (
              <img
                src={resolvedCompany.logo_url}
                alt={resolvedCompany.company_name || "Empresa"}
                className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1"
              />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {resolvedCompany.company_name || "Empresa"}
              </div>
              <div className="mt-1 text-xs leading-5 text-white/70 print:text-slate-600">
                {companyAddress(resolvedCompany) || null}
                {resolvedCompany.email ? <><br />{resolvedCompany.email}</> : null}
                {resolvedCompany.phone ? <><br />{resolvedCompany.phone}</> : null}
                {resolvedCompany.website ? <><br />{resolvedCompany.website}</> : null}
                {resolvedCompany.tax_id ? <><br />RNC / ID: {resolvedCompany.tax_id}</> : null}
              </div>
            </div>
          </div>
        </section>

        <SocialMediaProposalTemplate
          proposalData={socialData}
          proposalId={proposal?.id ?? null}
          publicToken={proposal?.public_token ?? null}
          mode={mode}
          onApprove={onApprove as (() => Promise<void>) | undefined}
        />

        <div className="mx-auto mt-2 max-w-[430px] px-2 text-center text-xs text-white/60 print:text-slate-500">
          Propuesta creada por {resolvedCompany.company_name || "la empresa"}.
        </div>
      </main>
    );
  }

  if (templateKey === "custom_html" && proposal?.content) {
    const html = renderProposalTemplateHtml(proposal, items, resolvedCompany);

    return (
      <main className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
        <style>{`
          @page { size: A4; margin: 0.48in; }
          @media print {
            html, body { background: #fff !important; }
            .proposal-print-toolbar { display: none !important; }
            .proposal-template-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          }
          .proposal-template-page h1 { font-size: 30px; line-height: 1.1; margin: 0 0 16px; }
          .proposal-template-page h2 { font-size: 22px; line-height: 1.18; margin: 24px 0 10px; }
          .proposal-template-page h3 { font-size: 17px; line-height: 1.2; margin: 18px 0 8px; }
          .proposal-template-page p { margin: 0 0 12px; line-height: 1.65; }
          .proposal-template-page ul, .proposal-template-page ol { margin: 0 0 14px 22px; padding: 0; }
          .proposal-template-page img { max-width: 100%; height: auto; }
        `}</style>

        {mode === "public" ? (
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
        ) : null}

        <article
          className="proposal-template-page mx-auto w-full max-w-[8.27in] bg-white px-[0.45in] py-[0.42in] text-[14px] leading-6 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    );
  }

  return (
    <div className="p-5">
      <div className="text-lg font-semibold">Plantilla no disponible</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Esta propuesta no tiene un template compatible. `template_key`:{" "}
        <span className="font-mono">{templateKey || "—"}</span>
      </div>
      <div className="mt-4 rounded-md border bg-background p-4 text-sm whitespace-pre-wrap">
        {proposal?.content || "—"}
      </div>
    </div>
  );
}
