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
        id: "whatsapp-entry",
        title: "WhatsApp: entrada del prospecto",
        description: "Empieza el demo desde un mensaje entrante. Aquí se ve la conversación y el panel CRM.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-main"]',
      },
      {
        id: "whatsapp-create-lead",
        title: "Crear prospecto desde WhatsApp",
        description: "Si la conversación no tiene lead conectado, crea el prospecto con un clic (sin salir de WhatsApp).",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-create-lead"]',
      },
      {
        id: "whatsapp-proposals",
        title: "Propuestas en WhatsApp",
        description: "Selecciona una propuesta, cópiala y registra el envío para dejar historial.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-proposals"]',
      },
      {
        id: "leads",
        title: "Leads: prospecto y oportunidad",
        description: "Gestiona asignación, seguimiento y creación de oportunidad desde el lead.",
        to: "/leads",
        selector: '[data-demo="leads-main"]',
      },
      {
        id: "pipeline",
        title: "Pipeline: oportunidad + producto",
        description: "Asocia el producto vendido al deal para que el proyecto use el workflow correcto.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-deal-products"]',
      },
      {
        id: "projects",
        title: "Projects: proyecto + tareas",
        description: "Crea/visualiza el proyecto y ejecuta el trabajo mediante tareas y progreso.",
        to: "/projects",
        selector: '[data-demo="projects-tasks"]',
      },
      {
        id: "clients",
        title: "Clients: Cliente 360",
        description: "Vista 360 del cliente: productos, proyectos, tareas, oportunidades, propuestas y próximo paso.",
        to: "/clients",
        selector: '[data-demo="clients-main"]',
      },
      {
        id: "products",
        title: "Products: workflows del producto",
        description: "Define el workflow (pasos) del producto para generar tareas automáticamente al ganar el deal.",
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
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={close} />

          {hasTarget && targetRect ? (
            <div
              className="absolute pointer-events-none rounded-[14px] ring-2 ring-[#1d62f9] shadow-[0_0_0_6px_rgba(29,98,249,0.12),0_24px_68px_rgba(2,6,23,0.55)]"
              style={{
                left: Math.max(8, targetRect.left - 6),
                top: Math.max(8, targetRect.top - 6),
                width: Math.max(0, targetRect.width + 12),
                height: Math.max(0, targetRect.height + 12),
              }}
            />
          ) : null}

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

  const padding = 14;
  const cardWidth = 360;

  const position = useMemo(() => {
    if (!anchoredRect) {
      return {
        left: `calc(50% - ${cardWidth / 2}px)`,
        top: "18%",
      } as React.CSSProperties;
    }
    const rightSpace = window.innerWidth - anchoredRect.right;
    const leftSpace = anchoredRect.left;
    const placeRight = rightSpace > cardWidth + 24;
    const placeLeft = leftSpace > cardWidth + 24;
    const top = clamp(anchoredRect.top, 12, window.innerHeight - 220);
    if (placeRight) {
      return { left: anchoredRect.right + padding, top } as React.CSSProperties;
    }
    if (placeLeft) {
      return { left: anchoredRect.left - cardWidth - padding, top } as React.CSSProperties;
    }
    const fallbackLeft = clamp(anchoredRect.left, 12, window.innerWidth - cardWidth - 12);
    return { left: fallbackLeft, top: anchoredRect.bottom + padding } as React.CSSProperties;
  }, [anchoredRect]);

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div
      className={cn(
        "absolute z-[1001] w-[360px] max-w-[calc(100vw-24px)] rounded-[18px] border bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.55)]",
        "dark:bg-slate-950 dark:border-slate-800",
      )}
      style={position}
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

