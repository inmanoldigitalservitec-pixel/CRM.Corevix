import { useMemo, useState } from "react";

type ProposalTemplateMode = "preview" | "public" | "admin";

type DiagnosticCard = { icon?: string | null; title?: string | null; copy?: string | null };
type Deliverable = { title?: string | null; copy?: string | null };
type ProcessStep = { number?: string | number | null; title?: string | null; copy?: string | null };
type Benefit = { icon?: string | null; title?: string | null; copy?: string | null };
type Term = { title?: string | null; copy?: string | null };

export type SocialMediaProposalData = {
  proposalNumber?: string | null;
  proposalTitle?: string | null;
  createdDate?: string | null;
  validUntil?: string | null;
  status?: string | null;

  companyName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientIndustry?: string | null;
  clientCity?: string | null;
  clientCurrentSocials?: string | null;
  clientWebsite?: string | null;

  productName?: string | null;
  planName?: string | null;
  serviceObjective?: string | null;
  proposalAmount?: string | null;
  currency?: string | null;
  paymentFrequency?: string | null;
  duration?: string | null;
  frequency?: string | null;
  deliveryTime?: string | null;
  suggestedStartDate?: string | null;
  revisionRounds?: string | null;
  clientReviewDays?: string | null;

  heroDescription?: string | null;
  productDescription?: string | null;
  investmentDescription?: string | null;
  investmentScopeDescription?: string | null;

  coverCaption?: string | null;
  coverImage?: string | null;
  showcaseImage?: string | null;

  diagnosticCards?: DiagnosticCard[] | null;
  deliverables?: Deliverable[] | null;
  processSteps?: ProcessStep[] | null;
  benefits?: Benefit[] | null;
  investmentScope?: string[] | null;
  clientRequirements?: string[] | null;
  terms?: Term[] | null;
  darkBenefits?: string[] | null;
};

export function SocialMediaProposalTemplate({
  proposalData,
  proposalId,
  publicToken,
  mode,
  onApprove,
}: {
  proposalData: SocialMediaProposalData | null | undefined;
  proposalId?: string | null;
  publicToken?: string | null;
  mode: ProposalTemplateMode;
  onApprove?: () => Promise<void>;
}) {
  const [approving, setApproving] = useState(false);
  const [approvedUi, setApprovedUi] = useState(false);
  const [approvedMsg, setApprovedMsg] = useState("Gracias. Hemos registrado tu aprobación para avanzar con el siguiente paso.");

  const data = proposalData ?? {};
  const companyName = String(data.companyName ?? "");
  const clientName = String(data.clientName ?? "");
  const coverCaption = String(data.coverCaption ?? "");

  const heroDescription = useMemo(() => {
    const raw = String(data.heroDescription ?? "");
    return raw
      .replaceAll("{{clientName}}", clientName)
      .replaceAll("{{companyName}}", companyName);
  }, [clientName, companyName, data.heroDescription]);

  const diagnosticCards = Array.isArray(data.diagnosticCards) ? data.diagnosticCards : [];
  const deliverables = Array.isArray(data.deliverables) ? data.deliverables : [];
  const processSteps = Array.isArray(data.processSteps) ? data.processSteps : [];
  const benefits = Array.isArray(data.benefits) ? data.benefits : [];
  const investmentScope = Array.isArray(data.investmentScope) ? data.investmentScope : [];
  const clientRequirements = Array.isArray(data.clientRequirements) ? data.clientRequirements : [];
  const terms = Array.isArray(data.terms) ? data.terms : [];
  const darkBenefits = Array.isArray(data.darkBenefits) ? data.darkBenefits : [];

  const showStickyActions = mode !== "admin";
  const showApprove = mode === "public";

  async function handleApprove() {
    if (!showApprove) return;
    if (!onApprove) return;
    if (approving || approvedUi) return;
    setApproving(true);
    try {
      await onApprove();
      setApprovedUi(true);
    } catch (e: any) {
      setApprovedUi(false);
      setApprovedMsg(e?.message || "No se pudo aprobar la propuesta. Intenta nuevamente.");
      throw e;
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="social-media-proposal-template">
      <style>{SOCIAL_MEDIA_PROPOSAL_CSS}</style>
      <div className="desktop-stage">
        <main className="proposal-shell" id="proposalShell">
          <section className="hero">
            <div className="topbar">
              <div className="brand">
                <img className="brand-logo" src={COREVIX_LOGO_DATA_URI} alt="Corevix" />
              </div>
              <div className="proposal-id" id="proposalNumberTop">{String(data.proposalNumber ?? proposalId ?? publicToken ?? "")}</div>
            </div>

            <div className="hero-card hero-card-upgraded">
              <div className="eyebrow">Propuesta de Manejo de Redes Sociales</div>

              <h1 className="hero-title">
                Propuesta personalizada para <span className="accent" id="companyNameHero">{companyName}</span>
              </h1>
              <p className="hero-copy" id="heroDescription">{heroDescription}</p>

              <div className="hero-proof-list">
                <div className="hero-proof-item"><span className="hero-proof-check">✓</span> Diseño visual más sólido</div>
                <div className="hero-proof-item"><span className="hero-proof-check">✓</span> Contenido que comunica mejor</div>
                <div className="hero-proof-item"><span className="hero-proof-check">✓</span> Presencia constante y profesional</div>
              </div>

              <div className="hero-offer-row">
                <div className="hero-offer-card">
                  <div className="hero-offer-top">
                    <div>
                      <div className="mini-label">Plan recomendado</div>
                      <div className="mini-value" id="productNameMetric">{String(data.productName ?? "")}</div>
                    </div>
                    <div className="mini-social-row" aria-label="Redes sociales">
                      <span className="social-logo-pill"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/instagram.svg" alt="Instagram" /></span>
                      <span className="social-logo-pill"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/tiktok.svg" alt="TikTok" /></span>
                      <span className="social-logo-pill"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/facebook.svg" alt="Facebook" /></span>
                    </div>
                  </div>
                  <div className="hero-offer-price" id="proposalPriceMetric">{String(data.proposalAmount ?? "")}</div>
                </div>
                <div className="hero-offer-note" id="coverCaption">
                  {coverCaption || "Una propuesta pensada para mejorar la imagen de tu negocio y mantener una presencia activa, clara y profesional en redes sociales."}
                </div>
              </div>

              <div className="hero-showcase">
                <div className="phone-mockup">
                  <div className="phone-bar" />
                  <img src={String(data.coverImage ?? "")} alt="Visual de redes sociales" />
                </div>

                <div className="floating-card floating-card-1">
                  <strong>+ Imagen profesional</strong>
                  <span>Contenido más claro, atractivo y alineado a tu marca.</span>
                </div>

                <div className="floating-card floating-card-2">
                  <strong>{String(data.frequency ?? "") || "8 posts + 4 reels"}</strong>
                  <span>Presencia activa y organizada cada mes.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Diagnóstico</div>
            <h2 className="section-title">
              Tu marca necesita verse <span className="accent">clara, constante y confiable</span>.
            </h2>
            <p className="section-copy">
              Las personas deciden rápido. Si tu presencia digital no comunica bien lo que ofreces, puedes perder oportunidades antes de recibir el primer mensaje.
            </p>
            <div className="stack">
              {diagnosticCards.map((item, idx) => (
                <article key={idx} className="card">
                  <div className="icon-box"><TemplateIcon name={String(item?.icon ?? "sparkles")} /></div>
                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
                  <p className="card-copy">{String(item?.copy ?? "")}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Servicio propuesto</div>
            <h2 className="section-title">
              Lo que construiremos para <span className="accent">{companyName}</span>
            </h2>
            <p className="section-copy">{String(data.productDescription ?? "")}</p>
            <ul className="check-list">
              {deliverables.map((item, idx) => (
                <li key={idx} className="check-item">
                  <div className="check-icon">✓</div>
                  <div>
                    <h3 className="item-title">{String(item?.title ?? "")}</h3>
                    <p className="item-copy">{String(item?.copy ?? "")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <div className="eyebrow">Dirección visual</div>
            <h2 className="section-title">
              Contenido que se sienta <span className="accent">más profesional y atractivo</span>
            </h2>
            <p className="section-copy">
              La propuesta busca mejorar cómo se ve tu marca en redes, manteniendo una imagen consistente y más fácil de reconocer.
            </p>
            <div className="single-showcase">
              {String(data.showcaseImage ?? "") ? (
                <img src={String(data.showcaseImage ?? "")} alt="Referencia visual de redes sociales" />
              ) : (
                <div className="showcase-fallback" aria-hidden />
              )}
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Proceso</div>
            <h2 className="section-title">
              Un proceso claro para avanzar <span className="accent">sin confusión</span>
            </h2>
            <div className="stack">
              {processSteps.map((item, idx) => (
                <article key={idx} className="card process-card">
                  <div className="process-number">{String(item?.number ?? idx + 1)}</div>
                  <div>
                    <h3 className="card-title">{String(item?.title ?? "")}</h3>
                    <p className="card-copy">{String(item?.copy ?? "")}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Beneficios</div>
            <h2 className="section-title">Lo que esta propuesta puede mejorar</h2>
            <div className="two-grid">
              {benefits.map((item, idx) => (
                <article key={idx} className="card">
                  <div className="icon-box"><TemplateIcon name={String(item?.icon ?? "sparkles")} /></div>
                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
                  <p className="card-copy">{String(item?.copy ?? "")}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Inversión</div>
            <h2 className="section-title">Inversión para iniciar</h2>
            <div className="investment-card">
              <div className="mini-label">Plan propuesto</div>
              <div className="mini-value">{String(data.planName ?? "")}</div>
              <div className="price">{String(data.proposalAmount ?? "")}</div>
              <p className="investment-note">{String(data.investmentDescription ?? "")}</p>

              <div className="scope-card">
                <div className="mini-label">Lo que cubre la inversión</div>
                <ul className="scope-list">
                  {investmentScope.map((item, idx) => (
                    <li key={idx}>{String(item ?? "")}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-list">
                <div className="detail-row">
                  <span>Validez</span>
                  <strong>{String(data.validUntil ?? "")}</strong>
                </div>
                <div className="detail-row">
                  <span>Duración</span>
                  <strong>{String(data.duration ?? "")}</strong>
                </div>
                <div className="detail-row">
                  <span>Frecuencia</span>
                  <strong>{String(data.frequency ?? "")}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Información necesaria</div>
            <h2 className="section-title">
              Para iniciar necesitamos tener <span className="accent">todo claro</span>
            </h2>
            <p className="section-copy">
              Para trabajar con orden y evitar retrasos, el contenido debe iniciar con la información principal del negocio, materiales disponibles y preferencias de marca.
            </p>
            <ul className="check-list">
              {clientRequirements.map((item, idx) => (
                <li key={idx} className="check-item">
                  <div className="check-icon">✓</div>
                  <div>
                    <h3 className="item-title">{String(item ?? "")}</h3>
                    <p className="item-copy">Información necesaria para trabajar con dirección clara y evitar retrasos.</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <div className="eyebrow">Condiciones</div>
            <h2 className="section-title">Alcance, revisión y tiempos</h2>
            <p className="section-copy">
              Esta propuesta incluye un proceso mensual de creación, revisión y programación. Cualquier cambio fuera del alcance inicial puede evaluarse como servicio adicional.
            </p>
            <div className="stack">
              {terms.map((item, idx) => (
                <article key={idx} className="card">
                  <div className="icon-box"><TemplateIcon name="fileCheck" /></div>
                  <h3 className="card-title">{String(item?.title ?? "")}</h3>
                  <p className="card-copy">{String(item?.copy ?? "")}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section dark-cta">
            <div className="eyebrow">Próximo paso</div>
            <h2 className="section-title">¿Listo para aprobar y avanzar?</h2>
            <p className="section-copy">
              Si esta propuesta se alinea con lo que necesitas, puedes aprobarla para coordinar el inicio y poner en marcha la estrategia de contenido.
            </p>
            <div className="dark-panel">
              <h3 className="card-title">Al aprobar esta propuesta avanzamos con:</h3>
              <ul className="dark-list">
                {darkBenefits.map((item, idx) => (
                  <li key={idx}><span className="dark-dot" /><span>{String(item ?? "")}</span></li>
                ))}
              </ul>
            </div>
          </section>

          {showStickyActions ? (
            <div className="sticky-actions no-print">
              <div className={approvedUi ? "approved-notice active" : "approved-notice"} id="approvedNotice">
                <strong>Propuesta aprobada</strong>
                <span id="approvedNoticeText">{approvedMsg}</span>
              </div>

              <div className="action-stack">
                {showApprove ? (
                  <button
                    className={approvedUi ? "btn btn-success" : "btn btn-primary"}
                    onClick={() => void handleApprove()}
                    disabled={approvedUi || approving || !onApprove}
                  >
                    {approvedUi ? "✓ Propuesta aprobada" : approving ? "Aprobando…" : "✓ Aprobar propuesta"}
                  </button>
                ) : null}
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  ⤓ Descargar / Imprimir PDF
                </button>
              </div>
              <div className="footer-note">
                Propuesta creada por Corevix · <span>{String(data.proposalNumber ?? "")}</span>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function TemplateIcon({ name }: { name: string }) {
  const key = String(name || "sparkles");
  if (key === "messageCircle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
      </svg>
    );
  }
  if (key === "image") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="m21 15-4.5-4.5L8 19" />
      </svg>
    );
  }
  if (key === "calendarCheck") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 9h18M8 15l2.3 2.3L16 12" />
      </svg>
    );
  }
  if (key === "trendingUp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 17 9 11l4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    );
  }
  if (key === "palette") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 4-4 4h-1.5a1.5 1.5 0 0 0 0 3H17a5 5 0 0 1-5 3Z" />
        <circle cx="7.5" cy="10" r=".8" />
        <circle cx="10.5" cy="7" r=".8" />
        <circle cx="14" cy="7" r=".8" />
        <circle cx="16.5" cy="10" r=".8" />
      </svg>
    );
  }
  if (key === "activity") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </svg>
    );
  }
  if (key === "fileCheck") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h5" />
        <path d="m9 15 2 2 4-5" />
      </svg>
    );
  }
  // sparkles (default)
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.8 4.4L18 9.2l-4.2 1.8L12 15l-1.8-4L6 9.2l4.2-1.8L12 3Z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" />
      <path d="M5 13l.7 1.6L7.3 15l-1.6.7L5 17.3l-.7-1.6L2.7 15l1.6-.4L5 13Z" />
    </svg>
  );
}

const COREVIX_LOGO_DATA_URI =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%223360%22%20height%3D%22487%22%20viewBox%3D%220%200%203360%20487%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M1077.82%20478.427V8.02191H1320.09C1365.01%208.02191%201399.34%2011.8724%201423.09%2019.5735C1446.83%2027.2745%201465.98%2041.607%201480.52%2062.5709C1495.07%2083.3209%201502.34%20108.67%201502.34%20138.619C1502.34%20164.717%201496.78%20187.285%201485.66%20206.324C1474.53%20225.148%201459.24%20240.443%201439.77%20252.209C1427.37%20259.696%201410.36%20265.9%201388.75%20270.82C1406.08%20276.596%201418.7%20282.371%201426.62%20288.147C1431.96%20291.998%201439.67%20300.233%201449.72%20312.855C1459.99%20325.476%201466.83%20335.209%201470.26%20342.054L1540.53%20478.427H1376.24L1298.59%20334.674C1288.75%20316.063%201279.98%20303.977%201272.28%20298.415C1261.79%20291.142%201249.92%20287.505%201236.66%20287.505H1223.82V478.427H1077.82ZM1223.82%20198.623H1285.11C1291.74%20198.623%201304.58%20196.483%201323.62%20192.205C1333.24%20190.28%201341.05%20185.36%201347.04%20177.445C1353.24%20169.53%201356.34%20160.438%201356.34%20150.17C1356.34%20134.982%201351.53%20123.324%201341.91%20115.195C1332.28%20107.066%201314.2%20103.001%201287.68%20103.001H1223.82V198.623Z%22%20fill%3D%22black%22%2F%3E%0A%3Cpath%20d%3D%22M510.194%20243.545C510.194%20166.749%20531.585%20106.959%20574.369%2064.1753C617.153%2021.3918%20676.729%200%20753.097%200C831.391%200%20891.716%2021.0709%20934.072%2063.2127C976.427%20105.141%20997.605%20163.968%20997.605%20239.695C997.605%20294.672%20988.3%20339.808%20969.689%20375.105C951.292%20410.187%20924.552%20437.569%20889.47%20457.249C854.601%20476.716%20811.069%20486.449%20758.873%20486.449C705.821%20486.449%20661.861%20477.999%20626.993%20461.1C592.338%20444.2%20564.208%20417.46%20542.602%20380.88C520.997%20344.301%20510.194%20298.522%20510.194%20243.545ZM655.551%20244.187C655.551%20291.677%20664.321%20325.797%20681.863%20346.547C699.618%20367.297%20723.684%20377.672%20754.06%20377.672C785.292%20377.672%20809.465%20367.511%20826.578%20347.188C843.691%20326.866%20852.248%20290.393%20852.248%20237.77C852.248%20193.489%20843.264%20161.187%20825.294%20140.865C807.539%20120.329%20783.367%20110.061%20752.776%20110.061C723.47%20110.061%20699.939%20120.436%20682.184%20141.186C664.428%20161.936%20655.551%20196.269%20655.551%20244.187Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M330.182%20286.222L457.57%20324.727C449.013%20360.451%20435.536%20390.293%20417.139%20414.252C398.743%20438.21%20375.853%20456.286%20348.472%20468.48C321.304%20480.673%20286.65%20486.77%20244.508%20486.77C193.382%20486.77%20151.561%20479.39%20119.045%20464.629C86.7436%20449.655%2058.8274%20423.45%2035.2964%20386.014C11.7655%20348.579%200%20300.661%200%20242.262C0%20164.396%2020.6431%20104.606%2061.9292%2062.8918C103.429%2020.9639%20162.043%200%20237.77%200C297.025%200%20343.552%2011.9794%20377.351%2035.9382C411.364%2059.897%20436.606%2096.6908%20453.078%20146.32L324.727%20174.878C320.235%20160.545%20315.529%20150.063%20310.608%20143.432C302.48%20132.308%20292.532%20123.751%20280.767%20117.762C269.001%20111.772%20255.846%20108.777%20241.299%20108.777C208.356%20108.777%20183.114%20122.04%20165.572%20148.566C152.309%20168.246%20145.678%20199.157%20145.678%20241.299C145.678%20293.495%20153.593%20329.326%20169.423%20348.793C185.253%20368.045%20207.5%20377.672%20236.165%20377.672C263.974%20377.672%20284.938%20369.864%20299.057%20354.248C313.389%20338.632%20323.764%20315.956%20330.182%20286.222Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2863%208.02191H3023.11L3106.54%20152.737L3187.4%208.02191H3345.92L3199.6%20235.844L3359.71%20478.427H3196.39L3103.65%20327.294L3010.6%20478.427H2848.24L3010.6%20233.277L2863%208.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2645.12%208.02191H2790.8V478.427H2645.12V8.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M2081.34%208.02191H2233.44L2339.33%20346.547L2443.61%208.02191H2591.21L2416.66%20478.427H2259.11L2081.34%208.02191Z%22%20fill%3D%22%230D0D0D%22%2F%3E%0A%3Cpath%20d%3D%22M1601.82%2010H2011.82V110H1601.82V10Z%22%20fill%3D%22%231560FF%22%2F%3E%0A%3Cpath%20d%3D%22M1601.82%20190H1929.82V299H1601.82V190Z%22%20fill%3D%22%231560FF%22%2F%3E%0A%3Crect%20x%3D%221601.82%22%20y%3D%22369%22%20width%3D%22410%22%20height%3D%2299%22%20fill%3D%22%231560FF%22%2F%3E%0A%3C%2Fsvg%3E";

const SOCIAL_MEDIA_PROPOSAL_CSS = `
  :root {
    --blue: #1d62f9;
    --blue-2: #0f49c9;
    --blue-soft: #eaf1ff;
    --blue-border: #cfe0ff;
    --dark: #07111f;
    --dark-2: #0d1728;
    --text: #0d1728;
    --muted: #667085;
    --line: #dde7f5;
    --bg: #f4f7fb;
    --card: #ffffff;
    --success: #12b76a;
    --success-bg: #ecfdf3;
    --success-border: #abefc6;
    --warning: #f79009;
    --shadow: 0 18px 55px rgba(7, 17, 31, 0.08);
    --shadow-soft: 0 10px 26px rgba(7, 17, 31, 0.06);
    --radius-xl: 30px;
    --radius-lg: 24px;
    --radius-md: 18px;
    --radius-sm: 14px;
  }

  .social-media-proposal-template * {
    box-sizing: border-box;
  }

  .social-media-proposal-template {
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--text);
    background:
      radial-gradient(circle at top left, rgba(29, 98, 249, 0.14), transparent 30%),
      linear-gradient(180deg, #f7f9fd 0%, #edf3fb 100%);
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  .social-media-proposal-template button,
  .social-media-proposal-template input,
  .social-media-proposal-template textarea {
    font: inherit;
  }

  .desktop-stage {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 18px 10px 90px;
  }

  .proposal-shell {
    width: 100%;
    max-width: 450px;
    background: #ffffff;
    border: 1px solid rgba(221, 231, 245, 0.85);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow);
    overflow: hidden;
    position: relative;
  }

  .section {
    padding: 24px 20px;
    position: relative;
  }

  .section + .section {
    border-top: 1px solid rgba(221, 231, 245, 0.72);
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--dark);
  }

  .brand-logo {
    display: block;
    width: 118px;
    height: auto;
    object-fit: contain;
  }

  .proposal-id {
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-align: right;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--blue);
    background: var(--blue-soft);
    border: 1px solid var(--blue-border);
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero {
    padding: 20px 20px 28px;
    background:
      linear-gradient(180deg, rgba(29, 98, 249, 0.08) 0%, rgba(29, 98, 249, 0.015) 80%),
      #ffffff;
  }

  .hero-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(221, 231, 245, 0.95);
    border-radius: 28px;
    padding: 20px 17px 17px;
    box-shadow: var(--shadow-soft);
  }

  .hero-card-upgraded {
    position: relative;
    overflow: hidden;
    padding: 20px 17px 20px;
    background:
      radial-gradient(circle at 84% 8%, rgba(29, 98, 249, 0.18), transparent 28%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  }

  .hero-card-upgraded::before {
    content: "";
    position: absolute;
    inset: auto -42px -70px auto;
    width: 180px;
    height: 180px;
    border-radius: 999px;
    background: rgba(29, 98, 249, 0.08);
    pointer-events: none;
  }

  .hero-title {
    margin: 14px 0 10px;
    font-size: 26px;
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.055em;
    color: var(--dark);
  }

  .accent {
    color: var(--blue);
  }

  .hero-copy {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.65;
  }

  .hero-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 16px;
    position: relative;
    z-index: 1;
  }

  .metric {
    border: 1px solid rgba(221, 231, 245, 0.95);
    background: rgba(255, 255, 255, 0.86);
    border-radius: 18px;
    padding: 12px 12px;
    box-shadow: 0 12px 24px rgba(7, 17, 31, 0.045);
  }

  .mini-label {
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .mini-value {
    margin-top: 6px;
    color: var(--dark);
    font-size: 14px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  .mini-pill {
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    color: var(--blue);
    background: var(--blue-soft);
    border: 1px solid var(--blue-border);
    white-space: nowrap;
  }

  .hero-proof-list {
    display: grid;
    gap: 8px;
    margin-top: 16px;
    position: relative;
    z-index: 1;
  }

  .hero-proof-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--dark);
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(221, 231, 245, 0.95);
    border-radius: 15px;
    padding: 10px 12px;
    font-size: 12.8px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .hero-proof-check {
    width: 19px;
    height: 19px;
    min-width: 19px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--blue);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
  }

  .hero-offer-row {
    display: grid;
    gap: 12px;
    margin-top: 17px;
    position: relative;
    z-index: 1;
  }

  .hero-offer-card {
    border: 1px solid rgba(207, 224, 255, 0.95);
    background: linear-gradient(180deg, #ffffff 0%, #f3f8ff 100%);
    border-radius: 21px;
    padding: 14px;
    box-shadow: 0 10px 24px rgba(29, 98, 249, 0.07);
  }

  .hero-offer-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .hero-offer-price {
    margin-top: 8px;
    font-size: 31px;
    line-height: 0.95;
    font-weight: 800;
    letter-spacing: -0.055em;
    color: var(--blue);
  }

  .hero-offer-note {
    color: var(--muted);
    font-size: 12.8px;
    line-height: 1.55;
    margin: 10px 0 0;
  }

  .hero-showcase {
    position: relative;
    margin-top: 22px;
    min-height: 315px;
    z-index: 1;
  }

  .phone-mockup {
    position: relative;
    width: 72%;
    max-width: 255px;
    margin: 0 auto;
    border-radius: 32px;
    overflow: hidden;
    border: 8px solid #0d1728;
    background: #0d1728;
    box-shadow: 0 22px 46px rgba(7, 17, 31, 0.18);
  }

  .phone-mockup img {
    width: 100%;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    display: block;
  }

  .mockup-fallback {
    width: 100%;
    aspect-ratio: 4 / 5;
    background:
      radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 45%),
      linear-gradient(180deg, rgba(29, 98, 249, 0.22), rgba(7, 17, 31, 0.35));
  }

  .phone-bar {
    position: absolute;
    top: 10px;
    left: 50%;
    width: 68px;
    height: 6px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.38);
    z-index: 2;
  }

  .floating-card {
    position: absolute;
    max-width: 176px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(221, 231, 245, 0.96);
    box-shadow: 0 14px 30px rgba(7, 17, 31, 0.09);
    border-radius: 18px;
    padding: 12px;
    display: grid;
    gap: 4px;
  }

  .floating-card strong {
    color: var(--dark);
    font-size: 12.7px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.015em;
  }

  .floating-card span {
    color: var(--muted);
    font-size: 11.3px;
    line-height: 1.45;
  }

  .floating-card-1 {
    top: 24px;
    left: -3px;
  }

  .floating-card-2 {
    right: -3px;
    bottom: 24px;
  }

  .section-title {
    margin: 14px 0 10px;
    font-size: 20px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--dark);
  }

  .section-copy {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .stack {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }

  .two-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }

  .card {
    background: var(--card);
    border: 1px solid rgba(221, 231, 245, 0.9);
    border-radius: var(--radius-md);
    padding: 14px 14px;
    box-shadow: var(--shadow-soft);
  }

  .card-title {
    margin: 10px 0 6px;
    font-size: 14px;
    line-height: 1.25;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--dark);
  }

  .card-copy {
    margin: 0;
    font-size: 12.6px;
    line-height: 1.6;
    color: var(--muted);
  }

  .icon-box {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: var(--blue-soft);
    border: 1px solid rgba(207, 224, 255, 0.9);
    color: var(--blue);
  }

  .icon-box svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  .check-list {
    list-style: none;
    padding: 0;
    margin: 16px 0 0;
    display: grid;
    gap: 12px;
  }

  .check-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: rgba(244, 247, 251, 0.85);
    border: 1px solid rgba(221, 231, 245, 0.85);
    border-radius: 18px;
    padding: 12px;
  }

  .check-icon {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 999px;
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success);
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 13px;
    margin-top: 1px;
  }

  .item-title {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--dark);
  }

  .item-copy {
    margin: 5px 0 0;
    font-size: 12.2px;
    line-height: 1.55;
    color: var(--muted);
  }

  .single-showcase {
    margin-top: 16px;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid rgba(221, 231, 245, 0.9);
    box-shadow: var(--shadow-soft);
    background: #fff;
  }

  .single-showcase img {
    width: 100%;
    display: block;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }

  .showcase-fallback {
    width: 100%;
    aspect-ratio: 16 / 10;
    background:
      radial-gradient(circle at 20% 20%, rgba(29, 98, 249, 0.18), transparent 40%),
      linear-gradient(180deg, #ffffff, #f3f8ff);
  }

  .cover-caption {
    margin-top: 14px;
    padding: 10px 12px;
    border-radius: 18px;
    border: 1px solid rgba(221, 231, 245, 0.92);
    background: rgba(255, 255, 255, 0.82);
    color: var(--muted);
    font-size: 12.4px;
    line-height: 1.55;
    position: relative;
    z-index: 1;
  }

  .process-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .process-number {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 999px;
    background: var(--blue);
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 900;
    letter-spacing: -0.02em;
    font-size: 13px;
    box-shadow: 0 12px 24px rgba(29, 98, 249, 0.24);
    margin-top: 1px;
  }

  .investment-card {
    margin-top: 16px;
    border: 1px solid rgba(207, 224, 255, 0.95);
    border-radius: 26px;
    background: linear-gradient(180deg, #ffffff 0%, #f3f8ff 100%);
    padding: 16px;
    box-shadow: 0 14px 34px rgba(29, 98, 249, 0.08);
  }

  .price {
    margin-top: 10px;
    font-size: 34px;
    line-height: 0.95;
    font-weight: 900;
    letter-spacing: -0.06em;
    color: var(--blue);
  }

  .investment-note {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 12.8px;
    line-height: 1.65;
  }

  .scope-card {
    margin-top: 14px;
    border-radius: 20px;
    border: 1px solid rgba(221, 231, 245, 0.9);
    background: rgba(255, 255, 255, 0.92);
    padding: 12px;
    box-shadow: var(--shadow-soft);
  }

  .scope-list {
    margin: 10px 0 0;
    padding-left: 18px;
    color: var(--dark);
    font-size: 12.6px;
    line-height: 1.6;
  }

  .detail-list {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid rgba(221, 231, 245, 0.88);
    background: rgba(255, 255, 255, 0.92);
  }

  .detail-row span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }

  .detail-row strong {
    color: var(--dark);
    font-size: 12.2px;
    font-weight: 800;
    text-align: right;
  }

  .dark-cta {
    background: linear-gradient(180deg, #0b1426 0%, #07111f 100%);
    color: rgba(255, 255, 255, 0.9);
  }

  .dark-cta .eyebrow {
    background: rgba(29, 98, 249, 0.14);
    border: 1px solid rgba(29, 98, 249, 0.28);
    color: rgba(255, 255, 255, 0.95);
  }

  .dark-cta .section-title {
    color: #ffffff;
  }

  .dark-cta .section-copy {
    color: rgba(255, 255, 255, 0.72);
  }

  .dark-panel {
    margin-top: 16px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 14px;
  }

  .dark-list {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    display: grid;
    gap: 10px;
  }

  .dark-list li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12.6px;
    line-height: 1.6;
  }

  .dark-dot {
    width: 10px;
    height: 10px;
    min-width: 10px;
    border-radius: 999px;
    background: rgba(29, 98, 249, 0.9);
    box-shadow: 0 10px 24px rgba(29, 98, 249, 0.22);
    margin-top: 5px;
  }

  .sticky-actions {
    position: sticky;
    bottom: 0;
    padding: 14px 16px 16px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(221, 231, 245, 0.85);
  }

  .approved-notice {
    display: none;
    border-radius: 18px;
    padding: 12px 12px;
    border: 1px solid var(--success-border);
    background: var(--success-bg);
    color: var(--dark);
    margin-bottom: 12px;
  }

  .approved-notice strong {
    display: block;
    font-size: 12.5px;
    font-weight: 900;
  }

  .approved-notice span {
    display: block;
    margin-top: 3px;
    font-size: 12.2px;
    color: var(--muted);
    line-height: 1.55;
  }

  .approved-notice.active {
    display: block;
  }

  .action-stack {
    display: grid;
    gap: 10px;
  }

  .btn {
    height: 46px;
    border-radius: 18px;
    border: 1px solid rgba(221, 231, 245, 0.92);
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-size: 13.2px;
    cursor: pointer;
    box-shadow: var(--shadow-soft);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    user-select: none;
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--blue), var(--blue-2));
    border: 1px solid rgba(29, 98, 249, 0.38);
    color: #fff;
    box-shadow: 0 16px 36px rgba(29, 98, 249, 0.22);
  }

  .btn-secondary {
    background: #ffffff;
    color: var(--dark);
  }

  .btn-success {
    background: var(--success);
    border-color: rgba(18, 183, 106, 0.35);
    color: #fff;
    box-shadow: 0 16px 36px rgba(18, 183, 106, 0.22);
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .footer-note {
    margin-top: 10px;
    text-align: center;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }

  @media print {
    .no-print {
      display: none !important;
    }
    .desktop-stage {
      padding: 0;
    }
    .proposal-shell {
      box-shadow: none;
      border: none;
      border-radius: 0;
      max-width: none;
    }
  }
`;
