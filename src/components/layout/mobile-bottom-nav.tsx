import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Building2,
  CheckSquare,
  FileText,
  Home,
  Menu,
  Plus,
  Search,
  Target,
  User,
} from "lucide-react";
import { MobileSectionsMenu } from "@/components/layout/mobile-sections-menu";

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [transitionCover, setTransitionCover] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const menuOpenTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const holdMobileOverlay = () => {
    setTransitionCover(true);
    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = window.setTimeout(() => {
      setTransitionCover(false);
      transitionTimeoutRef.current = null;
    }, 360);
  };

  useEffect(() => {
    const handleSearchState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setSearchOpen(Boolean(detail?.open));
    };
    window.addEventListener("corevix:global-search-state", handleSearchState);
    return () => window.removeEventListener("corevix:global-search-state", handleSearchState);
  }, []);

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
      if (menuOpenTimeoutRef.current) window.clearTimeout(menuOpenTimeoutRef.current);
    },
    [],
  );

  const primaryItems = [
    {
      label: "Inicio",
      icon: Home,
      active: !sectionsOpen && !searchOpen && isActivePath(currentPath, "/dashboard"),
      onClick: () => {
        if (sectionsOpen || searchOpen) holdMobileOverlay();
        setSectionsOpen(false);
        setSearchOpen(false);
        setQuickActionsOpen(false);
        window.dispatchEvent(new CustomEvent("corevix:close-global-search"));
        navigate({ to: "/dashboard" });
      },
    },
    {
      label: "Menú",
      icon: Menu,
      active: sectionsOpen && !searchOpen,
      onClick: () => {
        if (menuOpenTimeoutRef.current) window.clearTimeout(menuOpenTimeoutRef.current);
        if (searchOpen) {
          setSearchOpen(false);
          setQuickActionsOpen(false);
          window.dispatchEvent(new CustomEvent("corevix:close-global-search"));
          menuOpenTimeoutRef.current = window.setTimeout(() => {
            setSectionsOpen(true);
            menuOpenTimeoutRef.current = null;
          }, 180);
          return;
        }
        const nextOpen = !sectionsOpen;
        setSectionsOpen(nextOpen);
        setSearchOpen(false);
        setQuickActionsOpen(false);
      },
    },
    {
      label: "Crear",
      icon: Plus,
      active: false,
      onClick: () => {
        if (sectionsOpen || searchOpen) holdMobileOverlay();
        setSectionsOpen(false);
        setSearchOpen(false);
        window.dispatchEvent(new CustomEvent("corevix:close-global-search"));
        setQuickActionsOpen((current) => !current);
      },
      featured: true,
    },
    {
      label: "Buscar",
      icon: Search,
      active: searchOpen,
      onClick: () => {
        if (sectionsOpen) holdMobileOverlay();
        setSectionsOpen(false);
        setQuickActionsOpen(false);
        setSearchOpen(true);
        window.dispatchEvent(new CustomEvent("corevix:open-global-search"));
      },
    },
    {
      label: "Perfil",
      icon: User,
      active: !sectionsOpen && !searchOpen && isActivePath(currentPath, "/profile"),
      onClick: () => {
        if (sectionsOpen || searchOpen) holdMobileOverlay();
        setSectionsOpen(false);
        setSearchOpen(false);
        setQuickActionsOpen(false);
        window.dispatchEvent(new CustomEvent("corevix:close-global-search"));
        navigate({ to: "/profile" });
      },
    },
  ];

  const quickActions = [
    {
      label: "Consultar con el agente",
      icon: Bot,
      onClick: () => navigate({ to: "/ai-assistant" }),
    },
    {
      label: "Crear Lead",
      icon: Target,
      onClick: () =>
        window.dispatchEvent(
          new CustomEvent("corevix:open-quick-create", { detail: { type: "lead" } }),
        ),
    },
    {
      label: "Crear tarea",
      icon: CheckSquare,
      onClick: () =>
        window.dispatchEvent(
          new CustomEvent("corevix:open-quick-create", { detail: { type: "task" } }),
        ),
    },
    {
      label: "Crear cliente",
      icon: Building2,
      onClick: () =>
        window.dispatchEvent(
          new CustomEvent("corevix:open-quick-create", { detail: { type: "client" } }),
        ),
    },
    {
      label: "Crear Propuesta",
      icon: FileText,
      onClick: () =>
        window.dispatchEvent(
          new CustomEvent("corevix:open-quick-create", { detail: { type: "proposal" } }),
        ),
    },
  ];

  const runQuickAction = (action: (typeof quickActions)[number]) => {
    setQuickActionsOpen(false);
    setSectionsOpen(false);
    setSearchOpen(false);
    window.dispatchEvent(new CustomEvent("corevix:close-global-search"));
    action.onClick();
  };

  return (
    <>
      {transitionCover ? (
        <div className="fixed inset-0 z-[65] bg-white md:hidden" aria-hidden="true" />
      ) : null}
      {quickActionsOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[88] bg-transparent md:hidden"
          aria-label="Cerrar acciones rápidas"
          onClick={() => setQuickActionsOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-x-0 bottom-[calc(3.85rem+env(safe-area-inset-bottom))] z-[89] rounded-t-[28px] border-t border-slate-200 bg-white px-4 pb-6 pt-4 transition-transform duration-300 ease-in-out md:hidden ${
          quickActionsOpen ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+1rem)]"
        }`}
      >
        <div className="mx-auto flex max-w-md flex-col">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => runQuickAction(action)}
                className="flex h-12 w-full items-center gap-3 border-b border-slate-100 px-2 text-left text-sm font-medium text-slate-900 last:border-b-0"
              >
                <span className="grid h-8 w-8 place-items-center text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-[90] overflow-visible border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={
                  item.featured
                    ? "flex flex-col items-center gap-0 text-[11px] font-semibold text-slate-950"
                    : "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950"
                }
                aria-label={item.label}
              >
                <span
                  className={
                    item.featured
                      ? "-mt-5 mb-1 grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white"
                      : `grid h-8 w-8 place-items-center rounded-2xl transition-colors ${
                          item.active ? "bg-slate-950 text-white" : "text-slate-500"
                        }`
                  }
                >
                  <Icon className={item.featured ? "h-6 w-6" : "h-4 w-4"} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <MobileSectionsMenu open={sectionsOpen} onOpenChange={setSectionsOpen} />
    </>
  );
}
