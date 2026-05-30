import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoTourStep = {
  id: string;
  module: string;
  moduleTitle: string;
  title: string;
  description: string;
  to: string;
  selector?: string;
};

type DemoTourApi = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const DemoTourContext = createContext<DemoTourApi | null>(null);

export function useDemoTour() {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error("useDemoTour must be used within DemoTourProvider");
  return ctx;
}

const STORAGE_KEY = "crm_demo_tour_v1";
const DEMO_CONVERSATION_ID = "10000000-0000-4000-8000-000000000103";
const DEMO_CONVERSATION_STORAGE_KEY = "crm_demo_conversation_id";
const DEMO_LEAD_ID = "10000000-0000-4000-8000-000000000102";
const DEMO_LEAD_STORAGE_KEY = "crm_demo_lead_id";

function safeGetRect(el: Element | null) {
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return null;
  if (r.width <= 0 || r.height <= 0) return null;
  return r;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scrollIntoViewIfNeeded(el: Element | null) {
  if (!el) return;
  try {
    (el as HTMLElement).scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  } catch {}
}

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const steps: DemoTourStep[] = useMemo(
    () => [
      {
        id: "whatsapp-start",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Entrada del lead por WhatsApp",
        description: "El flujo empieza cuando un prospecto escribe por WhatsApp. Aquí el equipo ve la conversación, el origen del lead y el estado de atención.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-conversation-list"]',
      },
      {
        id: "whatsapp-thread",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Conversación activa",
        description: "En el centro se atiende al prospecto. Si la ventana de 24 horas está abierta, puedes responder libremente. Si está cerrada, debes usar una plantilla aprobada.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-active-thread"]',
      },
      {
        id: "whatsapp-crm-panel",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Panel CRM del contacto",
        description: "El panel derecho convierte el chat en información accionable: datos detectados, prospecto, seguimiento, oportunidad, propuestas y cliente.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-crm-panel"]',
      },
      {
        id: "whatsapp-utility-actions",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Plantillas Utility",
        description: "Cuando la ventana está cerrada, el agente continúa con una plantilla aprobada. Esto evita enviar mensajes libres fuera de la ventana permitida.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-utility-actions"]',
      },
      {
        id: "whatsapp-quick-actions",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Acciones rápidas",
        description: "Desde aquí el agente crea oportunidad, convierte a cliente, abre el prospecto, agenda seguimiento o marca la conversación como resuelta.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-quick-actions"]',
      },
      {
        id: "whatsapp-detected-data",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Datos detectados",
        description: "El CRM resume información útil de la conversación: empresa, servicio, necesidad, urgencia, canal y preferencia.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-detected-data"]',
      },
      {
        id: "whatsapp-product",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Producto sugerido",
        description: "El sistema relaciona la conversación con un producto de interés. Esto ayuda a conectar el lead con una oportunidad y una propuesta.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-suggested-product"]',
      },
      {
        id: "whatsapp-followup",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Seguimiento conectado a tareas",
        description: "Los seguimientos comerciales se convierten en tareas. Así el equipo sabe qué hacer, cuándo hacerlo y con quién.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-followup"]',
      },
      {
        id: "whatsapp-proposals",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Propuestas desde WhatsApp",
        description: "El agente puede seleccionar una propuesta y continuar el proceso comercial desde el mismo panel de WhatsApp.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-proposals"]',
      },

      {
        id: "leads-main",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Administrar leads",
        description: "Aquí se revisan los prospectos capturados desde WhatsApp, formularios u otros canales. El equipo puede filtrar, asignar y priorizar oportunidades.",
        to: "/leads",
        selector: '[data-demo="leads-main"]',
      },
      {
        id: "leads-new-lead",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Crear lead manualmente",
        description: "Además de capturar prospectos automáticamente desde WhatsApp, también puedes crear un lead manualmente desde el botón Nuevo lead.",
        to: "/leads",
        selector: '[data-demo="leads-new-lead-button"]',
      },
      {
        id: "leads-quick-actions",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Acciones rápidas del lead",
        description: "Cuando abres el detalle de un prospecto, aquí puedes escribir por WhatsApp, enviar email, llamar o crear un seguimiento.",
        to: "/leads",
        selector: '[data-demo="leads-quick-actions"]',
      },
      {
        id: "leads-followup",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Seguimiento del prospecto",
        description: "El seguimiento se conecta con tareas del CRM para que el equipo no olvide llamar, escribir o revisar una propuesta pendiente.",
        to: "/leads",
        selector: '[data-demo="leads-followup"]',
      },
      {
        id: "leads-assignment",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Asignación del responsable",
        description: "Cada prospecto puede tener un responsable. Esto evita confusión y deja claro quién debe atender el seguimiento.",
        to: "/leads",
        selector: '[data-demo="leads-assignment"]',
      },
      {
        id: "leads-contact",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Datos de contacto",
        description: "Aquí están los datos principales del prospecto: teléfono, WhatsApp y servicio de interés.",
        to: "/leads",
        selector: '[data-demo="leads-contact"]',
      },
      {
        id: "leads-last-activity",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Última actividad",
        description: "Esta sección muestra cuándo fue la última interacción registrada para entender qué tan reciente está el contacto.",
        to: "/leads",
        selector: '[data-demo="leads-last-activity"]',
      },


      {
        id: "pipeline-main",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Mover oportunidades por etapas",
        description: "El pipeline muestra la venta por etapas. Aquí el equipo ve qué oportunidades están nuevas, en propuesta, negociación, ganadas o perdidas.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-main"]',
      },
      {
        id: "pipeline-products",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Productos dentro de la oportunidad",
        description: "Cada oportunidad puede tener productos asociados. Esto permite calcular valor, preparar propuesta y pasar el trabajo a proyecto después del cierre.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-deal-products"]',
      },

      {
        id: "proposals-main",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Crear y enviar propuestas",
        description: "En propuestas se preparan ofertas comerciales conectadas a leads, clientes, productos y oportunidades. Cada propuesta puede tener enlace público.",
        to: "/proposals",
        selector: '[data-demo="proposals-main"]',
      },

      {
        id: "clients-main",
        module: "Módulo 5",
        moduleTitle: "Clientes",
        title: "Cliente 360",
        description: "Cuando se cierra la venta, el prospecto pasa a cliente. Aquí se centralizan datos, productos contratados, oportunidades, proyectos, facturas y actividad.",
        to: "/clients",
        selector: '[data-demo="clients-main"]',
      },

      {
        id: "projects-main",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Ejecución después del cierre",
        description: "Después de vender, el trabajo pasa a proyectos. Aquí se organiza la entrega, responsables, fechas y progreso.",
        to: "/projects",
        selector: '[data-demo="projects-main"]',
      },
      {
        id: "projects-tasks",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Tareas del proyecto",
        description: "Las tareas permiten controlar la ejecución: brief, configuración, integración, revisión y entrega final.",
        to: "/projects",
        selector: '[data-demo="projects-tasks"]',
      },

      {
        id: "products-workflow",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Productos como base del sistema",
        description: "Los productos definen qué vendes, cuánto cuesta, qué incluye y qué tareas o workflows se pueden activar después de cerrar una venta.",
        to: "/products",
        selector: '[data-demo="products-workflow"]',
      },
    ],
    [],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);

  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const leadDetailOpenedRef = useRef(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetRect(null);
    setHasTarget(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setStepIndex(0);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, stepIndex: 0 }));
      localStorage.setItem(DEMO_CONVERSATION_STORAGE_KEY, DEMO_CONVERSATION_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-select-conversation", {
          detail: { conversationId: DEMO_CONVERSATION_ID },
        }),
      );
    } catch {}
  }, []);

  // Restore session (nice for demo mistakes)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.open) {
        setIsOpen(true);
        setStepIndex(typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0);
      }
    } catch {}
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, stepIndex }));
    } catch {}
  }, [isOpen, stepIndex]);

  // Navigate to the step route
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIndex];
    if (!step) return;
    if (currentPath !== step.to) {
      navigate({ to: step.to });
    }
  }, [currentPath, isOpen, navigate, stepIndex, steps]);

  // Desde el paso 3 en adelante, abrir automáticamente el chat demo de WhatsApp.
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex < 2) return;

    const step = steps[stepIndex];
    if (!step || step.to !== "/whatsapp") return;

    try {
      localStorage.setItem(DEMO_CONVERSATION_STORAGE_KEY, DEMO_CONVERSATION_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-select-conversation", {
          detail: { conversationId: DEMO_CONVERSATION_ID },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Leads, abrir automáticamente el detalle del lead demo.
  // Se abre una sola vez para evitar que el panel se cierre/abra al cambiar de paso.
  useEffect(() => {
    if (!isOpen) {
      leadDetailOpenedRef.current = false;
      return;
    }

    const step = steps[stepIndex];
    if (!step) return;

    if (step.to !== "/leads") {
      leadDetailOpenedRef.current = false;
      return;
    }

    const stepsThatNeedLeadDetail = new Set([
      "leads-quick-actions",
      "leads-followup",
      "leads-assignment",
      "leads-contact",
      "leads-last-activity",
    ]);

    if (!stepsThatNeedLeadDetail.has(step.id)) return;
    if (leadDetailOpenedRef.current) return;

    leadDetailOpenedRef.current = true;

    try {
      localStorage.setItem(DEMO_LEAD_STORAGE_KEY, DEMO_LEAD_ID);

      window.dispatchEvent(
        new CustomEvent("crm-demo-open-lead-detail", {
          detail: {
            leadId: DEMO_LEAD_ID,
            open: true,
          },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // Find and track target element position (without conditional hooks)
  useEffect(() => {
    if (!isOpen) return;

    const step = steps[stepIndex];
    const selector = step?.selector || null;

    const update = () => {
      const el = selector ? document.querySelector(selector) : null;
      if (el) scrollIntoViewIfNeeded(el);
      const rect = safeGetRect(el);
      setTargetRect(rect);
      setHasTarget(Boolean(rect));
    };

    update();

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(update, 250);

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isOpen, stepIndex, steps]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStepIndex((i) => clamp(i + 1, 0, steps.length - 1));
      if (e.key === "ArrowLeft") setStepIndex((i) => clamp(i - 1, 0, steps.length - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, steps.length]);

  const api = useMemo<DemoTourApi>(() => ({ open, close, isOpen }), [close, isOpen, open]);

  const overlay = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[1000] pointer-events-none">
          {hasTarget && targetRect ? (
            <>
              {(() => {
                const pad = 8;
                const left = Math.max(0, targetRect.left - pad);
                const top = Math.max(0, targetRect.top - pad);
                const right = Math.min(window.innerWidth, targetRect.right + pad);
                const bottom = Math.min(window.innerHeight, targetRect.bottom + pad);

                return (
                  <>
                    <div className="absolute left-0 right-0 top-0 bg-black/55" style={{ height: top }} />
                    <div className="absolute left-0 bg-black/55" style={{ top, width: left, height: Math.max(0, bottom - top) }} />
                    <div className="absolute right-0 bg-black/55" style={{ top, left: right, height: Math.max(0, bottom - top) }} />
                    <div className="absolute left-0 right-0 bottom-0 bg-black/55" style={{ top: bottom }} />

                    <div
                      className="absolute rounded-[14px] ring-2 ring-[#1d62f9] shadow-[0_0_0_6px_rgba(29,98,249,0.16),0_18px_48px_rgba(29,98,249,0.22)]"
                      style={{
                        left,
                        top,
                        width: Math.max(0, right - left),
                        height: Math.max(0, bottom - top),
                      }}
                    />
                  </>
                );
              })()}
            </>
          ) : (
            <div className="absolute inset-0 bg-black/55" />
          )}

          <DemoTourCard
            step={steps[stepIndex]}
            index={stepIndex}
            total={steps.length}
            anchoredRect={hasTarget ? targetRect : null}
            onPrev={() => setStepIndex((i) => clamp(i - 1, 0, steps.length - 1))}
            onNext={() => setStepIndex((i) => clamp(i + 1, 0, steps.length - 1))}
            onClose={close}
          />
        </div>,
        document.body,
      )
    : null;

  // Cleanup any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <DemoTourContext.Provider value={api}>
      {children}
      {overlay}
    </DemoTourContext.Provider>
  );
}

function DemoTourCard({
  step,
  index,
  total,
  anchoredRect,
  onPrev,
  onNext,
  onClose,
}: {
  step: DemoTourStep | undefined;
  index: number;
  total: number;
  anchoredRect: DOMRect | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const safeStep = step || {
    id: "unknown",
    module: "Demo",
    moduleTitle: "CRM",
    title: "Demo",
    description: "—",
    to: "/",
  };

  const cardPosition = useMemo(() => {
    const margin = 20;

    if (!anchoredRect) {
      return {
        right: margin,
        bottom: margin,
      } as React.CSSProperties;
    }

    const targetIsOnRightPanel = anchoredRect.left > window.innerWidth * 0.62;
    const targetIsLow = anchoredRect.top > window.innerHeight * 0.52;

    if (targetIsOnRightPanel) {
      return {
        left: Math.max(260, margin),
        bottom: margin,
      } as React.CSSProperties;
    }

    if (targetIsLow) {
      return {
        right: margin,
        top: margin + 64,
      } as React.CSSProperties;
    }

    return {
      right: margin,
      bottom: margin,
    } as React.CSSProperties;
  }, [anchoredRect]);

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div
      className={cn(
        "fixed z-[1001] pointer-events-auto w-[min(420px,calc(100vw-40px))] rounded-[18px] border bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.55)]",
        "dark:bg-slate-950 dark:border-slate-800",
      )}
      style={cardPosition}
      role="dialog"
      aria-modal="true"
      aria-label="Demo tour"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-slate-500 dark:text-slate-400">
            {safeStep.module} · {safeStep.moduleTitle} · Paso {index + 1} de {total}
          </div>
          <div className="mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
            {safeStep.title}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <div className="mt-3 text-[13px] leading-[1.45] text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        {safeStep.description}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" className="h-9 px-3 text-xs" onClick={onPrev} disabled={!canPrev}>
          Anterior
        </Button>
        <Button className="h-9 px-3 text-xs" onClick={onNext} disabled={!canNext}>
          {canNext ? "Siguiente" : "Finalizar"}
        </Button>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Tip: usa <span className="font-mono">←</span>/<span className="font-mono">→</span> para navegar y <span className="font-mono">Esc</span> para cerrar.
      </div>
    </div>
  );
}

