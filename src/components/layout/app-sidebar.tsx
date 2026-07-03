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
  CircleDot,
  CreditCard,
  Database,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  HelpCircle,
  Image,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  Palette,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useT } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

type SidebarItem = {
  titleKey?: string;
  title?: string;
  url?: string;
  icon: React.ElementType;
  iconClassName?: string;
  placeholder?: boolean;
  permission?: string;
};

type CollapsedFlyoutProps = {
  label: string;
  items: SidebarItem[];
  itemLabel: (item: SidebarItem) => string;
};

const mainItems: SidebarItem[] = [
  { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, iconClassName: "text-blue-600" },
  { titleKey: "nav.clients", url: "/clients", icon: Building2, iconClassName: "text-emerald-600" },
];

const salesItems: SidebarItem[] = [
  { titleKey: "nav.leads", url: "/leads", icon: Users, iconClassName: "text-violet-600" },
  { titleKey: "nav.pipeline", url: "/pipeline", icon: GitBranch, iconClassName: "text-amber-600" },
  { titleKey: "nav.proposals", url: "/proposals", icon: FileText, iconClassName: "text-purple-600" },
  { title: "Estimates", url: "/estimates", icon: FileCheck2, iconClassName: "text-sky-600" },
  { titleKey: "nav.invoices", url: "/invoices", icon: Receipt, iconClassName: "text-orange-600" },
  { title: "Payments", url: "/payments", icon: CreditCard, iconClassName: "text-emerald-600" },
  { title: "Credit Notes", url: "/credit-notes", icon: ReceiptText, iconClassName: "text-rose-600" },
  { titleKey: "nav.products", url: "/products", icon: Package, iconClassName: "text-slate-700" },
  { title: "Subscriptions", url: "/subscriptions", icon: RotateCcw, iconClassName: "text-indigo-600" },
  { title: "Expenses", url: "/expenses", icon: BadgeDollarSign, iconClassName: "text-red-600" },
];

const communicationItems: SidebarItem[] = [
  { titleKey: "nav.whatsappInbox", url: "/whatsapp", icon: MessageCircle, iconClassName: "text-green-600" },
  { titleKey: "nav.emailInbox", url: "/email", icon: Mail, iconClassName: "text-sky-600" },
];

const operationsItems: SidebarItem[] = [
  { titleKey: "nav.tasks", url: "/tasks", icon: CheckSquare, iconClassName: "text-rose-600" },
  { titleKey: "nav.projects", url: "/projects", icon: FolderOpen, iconClassName: "text-indigo-600" },
  { title: "Contracts", url: "/contracts", icon: FileText, iconClassName: "text-slate-700" },
  { title: "Support", url: "/tickets", icon: LifeBuoy, iconClassName: "text-cyan-600" },
];

const utilitiesItems: SidebarItem[] = [
  { title: "Media", icon: Image, iconClassName: "text-sky-600", placeholder: true },
  { title: "Bulk PDF Export", icon: Download, iconClassName: "text-slate-700", placeholder: true },
  { title: "e-Invoice Export", icon: ReceiptText, iconClassName: "text-orange-600", placeholder: true },
  { title: "CSV Export", icon: FileText, iconClassName: "text-emerald-600", placeholder: true },
  { titleKey: "nav.calendar", url: "/calendar", icon: Calendar, iconClassName: "text-slate-600" },
  { title: "Announcements", icon: Megaphone, iconClassName: "text-amber-600", placeholder: true },
  { title: "Goals", icon: Target, iconClassName: "text-violet-600", placeholder: true },
  { title: "Activity Log", icon: Activity, iconClassName: "text-blue-700", placeholder: true },
  { title: "Database Backup", icon: Database, iconClassName: "text-slate-700", placeholder: true },
];

const reportsItems: SidebarItem[] = [
  { title: "Sales", url: "/reports", icon: BarChart3, iconClassName: "text-blue-700" },
  { title: "Expenses", icon: BadgeDollarSign, iconClassName: "text-red-600", placeholder: true },
  { title: "Expenses vs Income", icon: BarChart3, iconClassName: "text-emerald-700", placeholder: true },
  { title: "Leads", icon: Users, iconClassName: "text-violet-600", placeholder: true },
  { title: "Timesheets overview", icon: Activity, iconClassName: "text-slate-700", placeholder: true },
  { title: "KB Articles", icon: FileText, iconClassName: "text-amber-700", placeholder: true },
];

const setupItems: SidebarItem[] = [
  { title: "Staff", url: "/team", icon: UserCog, iconClassName: "text-fuchsia-600", permission: "team.view" },
  { title: "Customers", icon: Building2, iconClassName: "text-emerald-600", placeholder: true },
  { title: "Support", icon: LifeBuoy, iconClassName: "text-cyan-600", placeholder: true },
  { title: "Leads", icon: Users, iconClassName: "text-violet-600", placeholder: true },
  { title: "Finance", icon: BadgeDollarSign, iconClassName: "text-emerald-700", placeholder: true },
  { title: "Contract Types", icon: FileText, iconClassName: "text-slate-700", placeholder: true },
  { title: "Estimate Request", icon: FileCheck2, iconClassName: "text-sky-600", placeholder: true },
  { title: "Modules", icon: Layers, iconClassName: "text-indigo-600", placeholder: true },
  { title: "Email Templates", icon: Mail, iconClassName: "text-sky-600", placeholder: true },
  { title: "Custom Fields", icon: SlidersHorizontal, iconClassName: "text-amber-600", placeholder: true },
  { title: "GDPR", icon: ShieldCheck, iconClassName: "text-blue-700", placeholder: true },
  { title: "Roles", icon: UserCog, iconClassName: "text-purple-600", placeholder: true },
  { title: "Menu Setup", icon: Menu, iconClassName: "text-slate-700", placeholder: true },
  { title: "Theme Style", icon: Palette, iconClassName: "text-pink-600", placeholder: true },
  { titleKey: "nav.settings", url: "/settings", icon: Settings, iconClassName: "text-slate-700", permission: "settings.view" },
  { title: "Help", icon: HelpCircle, iconClassName: "text-slate-600", placeholder: true },
];

const menuButtonClass =
  "h-10 rounded-2xl px-3 text-slate-900 transition-all hover:bg-[#f1f5ff] hover:text-slate-950 data-[active=true]:bg-[#eaf1ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-10 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";
const linkClass =
  "flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[mobile=true]:justify-start group-data-[mobile=true]:gap-3";
const childButtonClass =
  "h-8 rounded-xl px-3 text-slate-700 transition-colors hover:bg-[#f7f9ff] data-[active=true]:bg-[#eef4ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-9 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";

function initials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]).join("") || "U").toUpperCase();
}

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
      className="pointer-events-none invisible fixed z-50 min-w-60 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl shadow-slate-900/15 transition-[opacity,visibility] duration-150 group-hover/menu-item:pointer-events-auto group-hover/menu-item:visible group-hover/menu-item:opacity-100 group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:visible group-focus-within/menu-item:opacity-100"
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
    >
      <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="space-y-1 overflow-auto pr-1" style={{ maxHeight: Math.max(160, position.maxHeight - 44) }}>
        {items.map((item) => {
          const childLabel = itemLabel(item);
          const Icon = item.icon;
          const rowClass = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#f1f5ff] hover:text-slate-950";
          if (item.placeholder) {
            return (
              <button key={item.titleKey || item.title} type="button" disabled className={rowClass + " cursor-default opacity-60 hover:bg-transparent"}>
                <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
                <span className="min-w-0 flex-1 truncate text-left">{childLabel}</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Soon</span>
              </button>
            );
          }
          return (
            <Link key={item.titleKey || item.title} to={item.url || "/dashboard"} className={rowClass}>
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
  const { profile, user, signOut } = useAuth();
  const { can } = usePermissions();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const profileName = profile?.full_name || user?.email || "My Profile";
  const profileEmail = user?.email || "Open profile";
  const profileInitials = initials(profileName || profileEmail);

  const visibleSetupItems = setupItems.filter((item) => !item.permission || can(item.permission as any));
  const isSalesPath = salesItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isCommunicationPath = communicationItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isOperationsPath = operationsItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isUtilitiesPath = utilitiesItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isReportsPath = reportsItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isSetupPath = visibleSetupItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const [salesOpen, setSalesOpen] = useState(isSalesPath || isMobile);
  const [communicationOpen, setCommunicationOpen] = useState(isCommunicationPath || isMobile);
  const [operationsOpen, setOperationsOpen] = useState(isOperationsPath || isMobile);
  const [utilitiesOpen, setUtilitiesOpen] = useState(isUtilitiesPath || isMobile);
  const [reportsOpen, setReportsOpen] = useState(isReportsPath || isMobile);
  const [setupOpen, setSetupOpen] = useState(isSetupPath || isMobile);

  const isActive = (path?: string) => !!path && (currentPath === path || currentPath.startsWith(path + "/"));
  const itemLabel = (item: SidebarItem) => item.title || t(item.titleKey as any);

  const renderMenuItem = (item: SidebarItem, child = false) => {
    const label = itemLabel(item);
    const Icon = item.icon;
    const buttonClass = child ? childButtonClass + (showLabels ? " pl-8" : "") : menuButtonClass;
    if (item.placeholder) {
      return (
        <SidebarMenuItem key={item.titleKey || item.title} className="group-data-[collapsible=icon]:w-full">
          <SidebarMenuButton className={buttonClass + " cursor-default opacity-70 hover:bg-transparent"} disabled>
            <span className={linkClass} aria-label={`${label} placeholder`}>
              <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
              {showLabels && <span className="truncate text-sm font-medium">{label}</span>}
              {showLabels && <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Soon</span>}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={item.titleKey || item.title} className="group-data-[collapsible=icon]:w-full">
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={isMobile ? undefined : label} className={buttonClass}>
          <Link to={item.url || "/dashboard"} className={linkClass} aria-label={label} title={collapsed && !isMobile ? label : undefined}>
            <Icon className={(child ? "h-4 w-4 " : "h-[18px] w-[18px] ") + "shrink-0 " + (item.iconClassName || "")} />
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

  const renderChildItems = (items: SidebarItem[]) => <div className="space-y-1">{items.map((item) => renderMenuItem(item, true))}</div>;

  const renderCollapsibleGroup = ({ label, icon: Icon, open, setOpen, active, items }: { label: string; icon: React.ElementType; open: boolean; setOpen: (updater: (open: boolean) => boolean) => void; active: boolean; items: SidebarItem[] }) => (
    <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1 group-data-[mobile=true]:px-2 group-data-[mobile=true]:py-1">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          <SidebarMenuItem className="group-data-[collapsible=icon]:w-full group/menu-item relative" data-sidebar-flyout-trigger="true">
            <SidebarMenuButton type="button" isActive={active} tooltip={isMobile || isCollapsedDesktop ? undefined : label} className={menuButtonClass} onClick={() => setOpen((current) => !current)}>
              <span className={linkClass} aria-label={label} title={collapsed && !isMobile ? label : undefined}>
                <Icon className="h-[18px] w-[18px] shrink-0 text-slate-900" />
                {showLabels && <span className="truncate text-sm font-semibold">{label}</span>}
                {showLabels && <ChevronDown className={"ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform " + (open ? "rotate-180" : "")} />}
              </span>
            </SidebarMenuButton>
            {isCollapsedDesktop && <CollapsedFlyout label={label} items={items} itemLabel={itemLabel} />}
          </SidebarMenuItem>
          {!isCollapsedDesktop && open && renderChildItems(items)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-[#e6eaf0]" style={{ "--sidebar": "#ffffff", "--sidebar-foreground": "#111827", "--sidebar-accent": "#eaf1ff", "--sidebar-accent-foreground": "#111827", "--sidebar-border": "#e6eaf0", "--sidebar-ring": "#1d62f9" } as React.CSSProperties}>
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 group-data-[mobile=true]:p-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:justify-start" aria-label="Corevix Dashboard" title={collapsed && !isMobile ? "Corevix" : undefined}>
          {showLabels && <img src="/corevix-logo.svg" alt="Corevix" className="h-7 w-auto max-w-[160px] object-contain" />}
          {!showLabels && <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef4ff] shadow-[inset_0_0_0_1px_rgba(29,98,249,0.14)]"><img src="/imagotipo_corevix.svg" alt="Corevix" className="h-5 w-5 object-contain" /></span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-2">
        {renderGroup(mainItems)}
        {renderCollapsibleGroup({ label: "Sales", icon: Zap, open: salesOpen, setOpen: setSalesOpen, active: isSalesPath, items: salesItems })}
        {isCollapsedDesktop
          ? renderCollapsibleGroup({ label: "Communication", icon: MessageCircle, open: communicationOpen, setOpen: setCommunicationOpen, active: isCommunicationPath, items: communicationItems })
          : renderGroup(communicationItems)}
        {isCollapsedDesktop
          ? renderCollapsibleGroup({ label: "Operations", icon: FolderOpen, open: operationsOpen, setOpen: setOperationsOpen, active: isOperationsPath, items: operationsItems })
          : renderGroup(operationsItems)}
        {renderCollapsibleGroup({ label: "Utilities", icon: CircleDot, open: utilitiesOpen, setOpen: setUtilitiesOpen, active: isUtilitiesPath, items: utilitiesItems })}
        {renderCollapsibleGroup({ label: "Reports", icon: BarChart3, open: reportsOpen, setOpen: setReportsOpen, active: isReportsPath, items: reportsItems })}
        {renderCollapsibleGroup({ label: "Setup", icon: Settings, open: setupOpen, setOpen: setSetupOpen, active: isSetupPath, items: visibleSetupItems })}
      </SidebarContent>
      <SidebarFooter className="border-t border-[#e6eaf0] p-2 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          <SidebarMenuItem className="group-data-[collapsible=icon]:w-full">
            <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip={isMobile ? undefined : "My Profile"} className="h-12 rounded-2xl px-2 text-slate-900 transition-all hover:bg-[#f1f5ff] data-[active=true]:bg-[#eaf1ff] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:!h-12 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-2">
              <Link to="/profile" className="flex w-full min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:justify-start" aria-label="My Profile" title={collapsed && !isMobile ? "My Profile" : undefined}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
                  {profileInitials}
                </span>
                {showLabels && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold leading-4">{profileName}</span>
                    <span className="block truncate text-xs text-slate-500">{profileEmail}</span>
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {renderMenuItem({ titleKey: "nav.aiAssistant", url: "/ai-assistant", icon: Bot, iconClassName: "text-indigo-600" })}
          {showLabels && (
            <SidebarMenuItem>
              <SidebarMenuButton type="button" className="h-9 rounded-xl px-3 text-slate-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => void signOut()}>
                <span className="flex w-full items-center gap-3">
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm font-medium">Logout</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
