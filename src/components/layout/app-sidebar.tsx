import { useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  Image,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Store,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useT } from "@/i18n";
import { usePermissions } from "@/hooks/use-permissions";

type SidebarItem = {
  titleKey?: string;
  title?: string;
  url?: string;
  icon: React.ElementType;
  iconClassName?: string;
  permission?: string;
};

type CollapsedFlyoutProps = {
  label: string;
  items: SidebarItem[];
  itemLabel: (item: SidebarItem) => string;
};

function MetaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <img
      src="/meta-platforms-logo.svg"
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
    />
  );
}

function GmailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <img
      src="/gmail-2026-logo.svg"
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
    />
  );
}

const mainItems: SidebarItem[] = [
  {
    titleKey: "nav.dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    iconClassName: "text-blue-600",
  },
  { titleKey: "nav.clients", url: "/clients", icon: Building2, iconClassName: "text-blue-600" },
];

const salesItems: SidebarItem[] = [
  { titleKey: "nav.leads", url: "/leads", icon: Users, iconClassName: "text-blue-600" },
  { titleKey: "nav.pipeline", url: "/pipeline", icon: GitBranch, iconClassName: "text-blue-600" },
  {
    titleKey: "nav.proposals",
    url: "/proposals",
    icon: FileText,
    iconClassName: "text-blue-600",
  },
  { title: "Cotizaciones", url: "/estimates", icon: FileCheck2, iconClassName: "text-blue-600" },
  { titleKey: "nav.invoices", url: "/invoices", icon: Receipt, iconClassName: "text-blue-600" },
  { title: "Pagos", url: "/payments", icon: CreditCard, iconClassName: "text-blue-600" },
  {
    title: "Notas de crédito",
    url: "/credit-notes",
    icon: ReceiptText,
    iconClassName: "text-blue-600",
  },
  { titleKey: "nav.products", url: "/products", icon: Package, iconClassName: "text-blue-600" },
  {
    title: "Suscripciones",
    url: "/subscriptions",
    icon: RotateCcw,
    iconClassName: "text-blue-600",
  },
  { title: "Gastos", url: "/expenses", icon: BadgeDollarSign, iconClassName: "text-blue-600" },
  { title: "Reportes", url: "/reports", icon: BarChart3, iconClassName: "text-blue-600" },
];

const communicationItems: SidebarItem[] = [
  {
    title: "TeamChat",
    url: "/internal-chat",
    icon: Users,
    iconClassName: "text-blue-600",
  },
  {
    title: "Meta Inbox",
    url: "/whatsapp-web",
    icon: MetaIcon,
    iconClassName: "text-[#0866ff]",
  },
  { titleKey: "nav.emailInbox", url: "/email", icon: GmailIcon },
];

const operationsItems: SidebarItem[] = [
  { titleKey: "nav.tasks", url: "/tasks", icon: CheckSquare, iconClassName: "text-rose-600" },
  {
    titleKey: "nav.projects",
    url: "/projects",
    icon: FolderOpen,
    iconClassName: "text-indigo-600",
  },
  { title: "Contratos", url: "/contracts", icon: FileText, iconClassName: "text-slate-700" },
  { title: "Soporte", url: "/tickets", icon: LifeBuoy, iconClassName: "text-cyan-600" },
];

const utilitiesItems: SidebarItem[] = [
  {
    titleKey: "nav.aiAssistant",
    url: "/ai-assistant",
    icon: Bot,
    iconClassName: "text-blue-600",
  },
  { titleKey: "nav.calendar", url: "/calendar", icon: Calendar, iconClassName: "text-blue-600" },
  {
    title: "Biblioteca multimedia",
    url: "/media-library",
    icon: Image,
    iconClassName: "text-blue-600",
  },
  { title: "Exportar PDFs", url: "/pdf-export", icon: Download, iconClassName: "text-blue-600" },
  { title: "Exportar CSV", url: "/csv-export", icon: FileText, iconClassName: "text-blue-600" },
  {
    title: "Registro de actividad",
    url: "/activity-log",
    icon: Activity,
    iconClassName: "text-blue-600",
  },
];

const setupItems: SidebarItem[] = [
  {
    title: "Equipo",
    url: "/team",
    icon: UserCog,
    iconClassName: "text-blue-600",
    permission: "team.view",
  },
  {
    titleKey: "nav.settings",
    url: "/settings",
    icon: SlidersHorizontal,
    iconClassName: "text-blue-600",
    permission: "settings.view",
  },
];

const menuButtonClass =
  "h-10 rounded-lg px-3 text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-950 data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-10 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";
const linkClass =
  "flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[mobile=true]:justify-start group-data-[mobile=true]:gap-3";
const childButtonClass =
  "h-8 rounded-lg px-3 text-slate-600 transition-colors hover:bg-slate-50 data-[active=true]:bg-blue-50 data-[active=true]:font-semibold data-[active=true]:text-blue-700 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-9 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";

function CollapsedFlyout({ label, items, itemLabel }: CollapsedFlyoutProps) {
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 12, left: 72, maxHeight: 460 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const flyout = flyoutRef.current;
      const trigger = flyout?.closest<HTMLElement>("[data-sidebar-flyout-trigger]");
      if (!flyout || !trigger || typeof window === "undefined") return;

      const padding = 12;
      const triggerRect = trigger.getBoundingClientRect();
      const panelHeight = flyout.offsetHeight || 320;
      const availableHeight = Math.max(220, window.innerHeight - padding * 2);
      const usablePanelHeight = Math.min(panelHeight, availableHeight);
      const maxTop = window.innerHeight - usablePanelHeight - padding;
      const top = Math.min(Math.max(triggerRect.top, padding), Math.max(padding, maxTop));
      const left = Math.min(triggerRect.right + 8, window.innerWidth - 256 - padding);

      setPosition({
        top,
        left: Math.max(triggerRect.right + 8, left),
        maxHeight: availableHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [items.length]);

  return (
    <div
      ref={flyoutRef}
      className="pointer-events-none invisible fixed z-50 min-w-60 rounded-lg border border-slate-200 bg-white p-2 opacity-0 transition-[opacity,visibility] duration-150 group-hover/menu-item:pointer-events-auto group-hover/menu-item:visible group-hover/menu-item:opacity-100 group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:visible group-focus-within/menu-item:opacity-100"
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
    >
      <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className="space-y-1 overflow-auto pr-1"
        style={{ maxHeight: Math.max(160, position.maxHeight - 44) }}
      >
        {items.map((item) => {
          const childLabel = itemLabel(item);
          const Icon = item.icon;
          const rowClass =
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950";
          return (
            <Link
              key={item.titleKey || item.title}
              to={item.url || "/dashboard"}
              className={rowClass}
            >
              <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
              <span className="min-w-0 flex-1 truncate">{childLabel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isCollapsedDesktop = collapsed && !isMobile;
  const showLabels = isMobile || !collapsed;
  const { t } = useT();
  const { can } = usePermissions();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const visibleSalesItems = isMobile
    ? salesItems.filter((item) => item.url !== "/pipeline")
    : salesItems;
  const visibleSetupItems = setupItems.filter(
    (item) => !item.permission || can(item.permission as any),
  );
  const isSalesPath = visibleSalesItems.some(
    (item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")),
  );
  const isCommunicationPath = communicationItems.some(
    (item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")),
  );
  const isOperationsPath = operationsItems.some(
    (item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")),
  );
  const isUtilitiesPath = utilitiesItems.some(
    (item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")),
  );
  const isSetupPath = visibleSetupItems.some(
    (item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")),
  );
  const [salesOpen, setSalesOpen] = useState(isSalesPath || isMobile);
  const [communicationOpen, setCommunicationOpen] = useState(isCommunicationPath || isMobile);
  const [operationsOpen, setOperationsOpen] = useState(isOperationsPath || isMobile);
  const [utilitiesOpen, setUtilitiesOpen] = useState(isUtilitiesPath || isMobile);
  const [setupOpen, setSetupOpen] = useState(isSetupPath || isMobile);

  const isActive = (path?: string) =>
    !!path && (currentPath === path || currentPath.startsWith(path + "/"));
  const itemLabel = (item: SidebarItem) => item.title || t(item.titleKey as any);

  const renderMenuItem = (item: SidebarItem, child = false) => {
    const label = itemLabel(item);
    const Icon = item.icon;
    const buttonClass = child ? childButtonClass + (showLabels ? " pl-8" : "") : menuButtonClass;
    return (
      <SidebarMenuItem
        key={item.titleKey || item.title}
        className="group-data-[collapsible=icon]:w-full"
      >
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          tooltip={isMobile ? undefined : label}
          className={buttonClass}
        >
          <Link
            to={item.url || "/dashboard"}
            className={linkClass}
            aria-label={label}
            title={collapsed && !isMobile ? label : undefined}
          >
            <Icon
              className={
                (child ? "h-4 w-4 " : "h-[18px] w-[18px] ") +
                "shrink-0 " +
                (item.iconClassName || "")
              }
            />
            {showLabels && <span className="truncate text-sm font-medium">{label}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (items: SidebarItem[]) => (
    <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1 group-data-[mobile=true]:px-2 group-data-[mobile=true]:py-1">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          {items.map((item) => renderMenuItem(item))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const renderChildItems = (items: SidebarItem[]) => (
    <div className="space-y-1">{items.map((item) => renderMenuItem(item, true))}</div>
  );

  const renderCollapsibleGroup = ({
    label,
    icon: Icon,
    open,
    setOpen,
    active,
    items,
  }: {
    label: string;
    icon: React.ElementType;
    open: boolean;
    setOpen: (updater: (open: boolean) => boolean) => void;
    active: boolean;
    items: SidebarItem[];
  }) => (
    <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1 group-data-[mobile=true]:px-2 group-data-[mobile=true]:py-1">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          <SidebarMenuItem
            className="group-data-[collapsible=icon]:w-full group/menu-item relative"
            data-sidebar-flyout-trigger="true"
          >
            <SidebarMenuButton
              type="button"
              isActive={active}
              tooltip={isMobile || isCollapsedDesktop ? undefined : label}
              className={menuButtonClass}
              onClick={() => setOpen((current) => !current)}
            >
              <span
                className={linkClass}
                aria-label={label}
                title={collapsed && !isMobile ? label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 text-slate-900" />
                {showLabels && <span className="truncate text-sm font-semibold">{label}</span>}
                {showLabels && (
                  <ChevronDown
                    className={
                      "ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform " +
                      (open ? "rotate-180" : "")
                    }
                  />
                )}
              </span>
            </SidebarMenuButton>
            {isCollapsedDesktop && (
              <CollapsedFlyout label={label} items={items} itemLabel={itemLabel} />
            )}
          </SidebarMenuItem>
          {!isCollapsedDesktop && open && renderChildItems(items)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#e6eaf0]"
      style={
        {
          "--sidebar": "#ffffff",
          "--sidebar-foreground": "#111827",
          "--sidebar-accent": "#eaf1ff",
          "--sidebar-accent-foreground": "#111827",
          "--sidebar-border": "#e6eaf0",
          "--sidebar-ring": "#1d62f9",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 group-data-[mobile=true]:p-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:justify-start"
          aria-label="Corevix Dashboard"
          title={collapsed && !isMobile ? "Corevix" : undefined}
        >
          {showLabels && (
            <img
              src="/corevix-logo.svg"
              alt="Corevix"
              className="h-4 w-auto max-w-[96px] object-contain"
            />
          )}
          {!showLabels && (
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-blue-100 bg-blue-50">
              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-5 w-5 object-contain" />
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-2">
        {renderGroup(mainItems)}
        {renderCollapsibleGroup({
          label: "Ventas",
          icon: Store,
          open: salesOpen,
          setOpen: setSalesOpen,
          active: isSalesPath,
          items: visibleSalesItems,
        })}
        {isCollapsedDesktop
          ? renderCollapsibleGroup({
              label: "Comunicación",
              icon: Users,
              open: communicationOpen,
              setOpen: setCommunicationOpen,
              active: isCommunicationPath,
              items: communicationItems,
            })
          : renderGroup(communicationItems)}
        {isCollapsedDesktop
          ? renderCollapsibleGroup({
              label: "Operaciones",
              icon: FolderOpen,
              open: operationsOpen,
              setOpen: setOperationsOpen,
              active: isOperationsPath,
              items: operationsItems,
            })
          : renderGroup(operationsItems)}
        {renderCollapsibleGroup({
          label: "Herramientas",
          icon: Wrench,
          open: utilitiesOpen,
          setOpen: setUtilitiesOpen,
          active: isUtilitiesPath,
          items: utilitiesItems,
        })}
        {renderCollapsibleGroup({
          label: "Configuración",
          icon: Settings,
          open: setupOpen,
          setOpen: setSetupOpen,
          active: isSetupPath,
          items: visibleSetupItems,
        })}
      </SidebarContent>
    </Sidebar>
  );
}
