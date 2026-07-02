import { useState } from "react";
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

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isCollapsedDesktop = collapsed && !isMobile;
  const showLabels = isMobile || !collapsed;
  const { t } = useT();
  const { can } = usePermissions();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const visibleSetupItems = setupItems.filter((item) => !item.permission || can(item.permission as any));
  const isSalesPath = salesItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isUtilitiesPath = utilitiesItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isReportsPath = reportsItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const isSetupPath = visibleSetupItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const [salesOpen, setSalesOpen] = useState(isSalesPath || isMobile);
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

  const renderCollapsedFlyout = (label: string, items: SidebarItem[]) => (
    <div className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-0 z-50 hidden min-w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 group-hover/menu-item:pointer-events-auto group-hover/menu-item:block group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:block">
      <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="max-h-[min(70vh,460px)] space-y-1 overflow-auto">
        {items.map((item) => {
          const childLabel = itemLabel(item);
          const Icon = item.icon;
          const rowClass = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#f1f5ff] hover:text-slate-950";
          if (item.placeholder) {
            return <button key={item.titleKey || item.title} type="button" disabled className={rowClass + " cursor-default opacity-60"}><Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} /><span className="flex-1 truncate text-left">{childLabel}</span><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Soon</span></button>;
          }
          return <Link key={item.titleKey || item.title} to={item.url || "/dashboard"} className={rowClass + (isActive(item.url) ? " bg-[#eef4ff] font-semibold text-slate-950" : "")}><Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} /><span className="truncate">{childLabel}</span></Link>;
        })}
      </div>
    </div>
  );

  const renderCollapsibleGroup = (label: string, icon: React.ElementType, items: SidebarItem[], open: boolean, setOpen: (value: boolean) => void) => {
    const Icon = icon;
    if (isCollapsedDesktop) {
      return (
        <SidebarGroup className="relative px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="group/menu-item relative">
                <SidebarMenuButton className={menuButtonClass} tooltip={label}>
                  <span className={linkClass} aria-label={label}><Icon className="h-[18px] w-[18px] shrink-0 text-slate-700" /></span>
                </SidebarMenuButton>
                {renderCollapsedFlyout(label, items)}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }
    return (
      <SidebarGroup className="px-2 py-1">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1.5">
            <SidebarMenuItem>
              <button type="button" onClick={() => setOpen(!open)} className={menuButtonClass + " flex w-full items-center gap-3"}>
                <Icon className="h-[18px] w-[18px] shrink-0 text-slate-700" />
                {showLabels && <span className="flex-1 truncate text-left text-sm font-semibold">{label}</span>}
                {showLabels && <ChevronDown className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")} />}
              </button>
            </SidebarMenuItem>
          </SidebarMenu>
          {open && showLabels ? <div className="mt-1">{renderChildItems(items)}</div> : null}
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar className="border-r bg-white/95 backdrop-blur-xl" collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20"><Bot className="h-4 w-4" /></div>{showLabels && <div><div className="text-sm font-extrabold tracking-tight text-slate-950">Corevix</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Agentic CRM</div></div>}</div></SidebarHeader>
      <SidebarContent className="gap-1 py-2">
        {renderGroup(mainItems)}
        {renderCollapsibleGroup("Sales", CircleDot, salesItems, salesOpen, setSalesOpen)}
        {renderGroup(communicationItems)}
        {renderGroup(operationsItems)}
        {renderCollapsibleGroup("Utilities", Zap, utilitiesItems, utilitiesOpen, setUtilitiesOpen)}
        {renderCollapsibleGroup("Reports", BarChart3, reportsItems, reportsOpen, setReportsOpen)}
        {renderCollapsibleGroup("Setup", Settings, visibleSetupItems, setupOpen, setSetupOpen)}
      </SidebarContent>
      <SidebarFooter className="border-t p-2">{showLabels ? <div className="rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-500">Agent connected to Corevix workspace</div> : null}</SidebarFooter>
    </Sidebar>
  );
}
