import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoTourStep = {
  id: string;
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
        title: "Inicio del flujo: WhatsApp",
        description: "El demo empieza donde realmente entra el prospecto: una conversación de WhatsApp. Desde aquí el agente revisa el mensaje, entiende la solicitud y conecta el flujo comercial.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-main"]',
      },
      {
        id: "whatsapp-list",
        title: "Lista de conversaciones",
        description: "Aquí llegan todos los chats. El agente puede buscar, filtrar conversaciones, ver mensajes recientes, no leídos, bot apagado o conversaciones que necesitan atención humana.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-conversation-list"]',
      },
      {
        id: "whatsapp-thread",
        title: "Conversación activa",
        description: "En el centro se atiende al prospecto. Si la ventana de 24 horas está abierta, el agente puede responder libremente. Si está cerrada, debe usar una plantilla aprobada.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-active-thread"]',
      },
      {
        id: "whatsapp-crm-panel",
        title: "Panel CRM del contacto",
        description: "Este panel convierte la conversación en acción comercial. Aquí se ve el perfil, producto sugerido, datos detectados, propuestas, seguimiento, oportunidad y cliente.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-crm-panel"]',
      },
      {
        id: "whatsapp-utility-actions",
        title: "Plantillas Utility",
        description: "Cuando la ventana está cerrada, el agente no debe escribir un mensaje libre. Aquí elige una plantilla Utility: propuesta, factura, seguimiento, documentos, recordatorio o actualización.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-utility-actions"]',
      },
      {
        id: "whatsapp-create-lead",
        title: "Crear prospecto desde WhatsApp",
        description: "Si la conversación aún no está conectada a un lead, el agente puede crear el prospecto directamente desde WhatsApp sin salir del módulo.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-create-lead"]',
      },
      {
        id: "whatsapp-detected-data",
        title: "Datos detectados",
        description: "El CRM resume información útil detectada en la conversación: servicio solicitado, necesidad, contexto y datos importantes para vender mejor.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-detected-data"]',
      },
      {
        id: "whatsapp-product",
        title: "Producto sugerido",
        description: "Cuando el sistema detecta interés, el agente puede marcar un producto como interés del lead. Esto ayuda a conectar la oportunidad y luego la propuesta.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-suggested-product"]',
      },
      {
        id: "whatsapp-followup",
        title: "Seguimiento conectado a tareas",
        description: "Los seguimientos comerciales deben convertirse en tareas del CRM. Así el equipo sabe qué debe hacer, cuándo hacerlo y con quién.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-followup"]',
      },
      {
        id: "whatsapp-opportunity",
        title: "Oportunidad comercial",
        description: "Cuando el prospecto muestra intención real, se crea una oportunidad para moverla por el pipeline: contacto, propuesta, negociación y cierre.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-opportunity"]',
      },
      {
        id: "whatsapp-proposals",
        title: "Propuestas desde WhatsApp",
        description: "Aquí el agente selecciona o crea una propuesta para el prospecto. No hace falta convertirlo en cliente antes de enviarle una propuesta.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-proposals"]',
      },
      {
        id: "leads",
        title: "Leads: administrar prospectos",
        description: "En Leads se revisan los prospectos capturados, su responsable, estado, seguimiento y datos comerciales.",
        to: "/leads",
        selector: '[data-demo="leads-main"]',
      },
      {
        id: "pipeline",
        title: "Pipeline: mover la oportunidad",
        description: "En Pipeline se gestiona la venta. El agente mueve la oportunidad por etapas y conecta productos, valor y próximos pasos.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-deal-products"]',
      },
      {
        id: "clients",
        title: "Cliente 360",
        description: "Cuando la venta se cierra, el prospecto pasa a cliente. Aquí queda su historial, productos, oportunidades, propuestas, proyectos y tareas.",
        to: "/clients",
        selector: '[data-demo="clients-main"]',
      },
      {
        id: "projects",
        title: "Proyecto y entrega",
        description: "Después del cierre, el trabajo pasa a ejecución. El proyecto organiza tareas, responsables, entregables y progreso hasta la entrega final.",
        to: "/projects",
        selector: '[data-demo="projects-tasks"]',
      },
      {
        id: "products",
        title: "Workflows de productos",
        description: "Cada producto puede tener un workflow. Esto permite generar tareas automáticamente cuando se gana una oportunidad o se inicia un proyecto.",
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
    title: "Demo",
    description: "—",
    to: "/",
  };

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div
      className={cn(
        "fixed right-5 bottom-5 z-[1001] pointer-events-auto w-[min(420px,calc(100vw-40px))] rounded-[18px] border bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.55)]",
        "dark:bg-slate-950 dark:border-slate-800",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Demo tour"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-slate-500 dark:text-slate-400">
            Paso {index + 1} de {total}
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

