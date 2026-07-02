import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Package,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  Sparkles,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
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
};

const mainItems: SidebarItem[] = [
  { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, iconClassName: "text-blue-600" },
  { titleKey: "nav.clients", url: "/clients", icon: Building2, iconClassName: "text-emerald-600" },
];

const salesItems: SidebarItem[] = [
  { titleKey: "nav.leads", url: "/leads", icon: Users, iconClassName: "text-violet-600" },
  { titleKey: "nav.pipeline", url: "/pipeline", icon: GitBranch, iconClassName: "text-amber-600" },
  { titleKey: "nav.proposals", url: "/proposals", icon: FileText, iconClassName: "text-purple-600" },
  { title: "Estimates", icon: FileCheck2, iconClassName: "text-sky-600", placeholder: true },
  { titleKey: "nav.invoices", url: "/invoices", icon: Receipt, iconClassName: "text-orange-600" },
  { title: "Payments", icon: CreditCard, iconClassName: "text-emerald-600", placeholder: true },
  { title: "Credit Notes", icon: ReceiptText, iconClassName: "text-rose-600", placeholder: true },
  { titleKey: "nav.products", url: "/products", icon: Package, iconClassName: "text-slate-700" },
  { title: "Subscriptions", icon: RotateCcw, iconClassName: "text-indigo-600", placeholder: true },
  { title: "Expenses", icon: BadgeDollarSign, iconClassName: "text-red-600", placeholder: true },
];

const communicationItems: SidebarItem[] = [
  { titleKey: "nav.whatsappInbox", url: "/whatsapp", icon: MessageCircle, iconClassName: "text-green-600" },
  { titleKey: "nav.emailInbox", url: "/email", icon: Mail, iconClassName: "text-sky-600" },
];

const operationsItems: SidebarItem[] = [
  { titleKey: "nav.tasks", url: "/tasks", icon: CheckSquare, iconClassName: "text-rose-600" },
  { titleKey: "nav.projects", url: "/projects", icon: FolderOpen, iconClassName: "text-indigo-600" },
  { titleKey: "nav.calendar", url: "/calendar", icon: Calendar, iconClassName: "text-slate-600" },
];

const managementItems: SidebarItem[] = [
  { titleKey: "nav.automations", url: "/automations", icon: Zap, iconClassName: "text-yellow-600" },
  { titleKey: "nav.reports", url: "/reports", icon: BarChart3, iconClassName: "text-blue-700" },
  { titleKey: "nav.team", url: "/team", icon: UserCog, iconClassName: "text-fuchsia-600" },
  { titleKey: "nav.settings", url: "/settings", icon: Settings, iconClassName: "text-slate-700" },
];

const menuButtonClass =
  "h-10 rounded-2xl px-3 text-slate-900 transition-all hover:bg-[#f1f5ff] hover:text-slate-950 data-[active=true]:bg-[#eaf1ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-10 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";

const linkClass =
  "flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[mobile=true]:justify-start group-data-[mobile=true]:gap-3";

const salesChildClass =
  "h-8 rounded-xl px-3 text-slate-700 transition-colors hover:bg-[#f7f9ff] data-[active=true]:bg-[#eef4ff] data-[active=true]:font-semibold data-[active=true]:text-slate-950 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[mobile=true]:mx-0 group-data-[mobile=true]:!h-9 group-data-[mobile=true]:!w-full group-data-[mobile=true]:!justify-start group-data-[mobile=true]:!px-3";

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const showLabels = isMobile || !collapsed;
  const { t } = useT();
  const { can } = usePermissions();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const isSalesPath = salesItems.some((item) => item.url && (currentPath === item.url || currentPath.startsWith(item.url + "/")));
  const [salesOpen, setSalesOpen] = useState(isSalesPath || isMobile);

  const isActive = (path?: string) => !!path && (currentPath === path || currentPath.startsWith(path + "/"));
  const itemLabel = (item: SidebarItem) => item.title || t(item.titleKey as any);

  const renderGroup = (labelKey: string, items: SidebarItem[]) => (
    <SidebarGroup className="px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[mobile=true]:px-2 group-data-[mobile=true]:py-2">
      <SidebarGroupLabel className="text-slate-500 text-[10px] uppercase tracking-wider font-extrabold group-data-[collapsible=icon]:!hidden group-data-[mobile=true]:!flex">
        {t(labelKey)}
      </SidebarGroupLabel>
      <SidebarSeparator className="mx-auto my-1 hidden w-7 bg-slate-200/80 group-data-[collapsible=icon]:block group-data-[mobile=true]:hidden" />
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          {items.map((item) => {
            const label = itemLabel(item);
            return (
              <SidebarMenuItem key={item.titleKey || item.title} className="group-data-[collapsible=icon]:w-full">
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={isMobile ? undefined : label} className={menuButtonClass}>
                  <Link to={item.url || "/dashboard"} className={linkClass} aria-label={label} title={collapsed && !isMobile ? label : undefined}>
                    <item.icon className={"h-[18px] w-[18px] shrink-0 " + (item.iconClassName || "")} />
                    {showLabels && <span className="truncate text-sm font-medium">{label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const renderSalesGroup = () => {
    const salesLabel = "Sales";
    const parentActive = isSalesPath;
    return (
      <SidebarGroup className="px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[mobile=true]:px-2 group-data-[mobile=true]:py-2">
        <SidebarGroupLabel className="text-slate-500 text-[10px] uppercase tracking-wider font-extrabold group-data-[collapsible=icon]:!hidden group-data-[mobile=true]:!flex">
          {salesLabel}
        </SidebarGroupLabel>
        <SidebarSeparator className="mx-auto my-1 hidden w-7 bg-slate-200/80 group-data-[collapsible=icon]:block group-data-[mobile=true]:hidden" />
        <SidebarGroupContent>
          <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
            <SidebarMenuItem className="group-data-[collapsible=icon]:w-full">
              <SidebarMenuButton
                type="button"
                isActive={parentActive}
                tooltip={isMobile ? undefined : salesLabel}
                className={menuButtonClass}
                onClick={() => setSalesOpen((open) => !open)}
              >
                <span className={linkClass} aria-label={salesLabel} title={collapsed && !isMobile ? salesLabel : undefined}>
                  <Zap className="h-[18px] w-[18px] shrink-0 text-slate-900" />
                  {showLabels && <span className="truncate text-sm font-semibold">{salesLabel}</span>}
                  {showLabels && <ChevronDown className={"ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform " + (salesOpen ? "rotate-180" : "")} />}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {(salesOpen || collapsed) && (
              <div className="space-y-1 group-data-[collapsible=icon]:space-y-1 group-data-[mobile=true]:space-y-1">
                {salesItems.map((item) => {
                  const label = itemLabel(item);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.titleKey || item.title} className="group-data-[collapsible=icon]:w-full">
                      <SidebarMenuButton
                        asChild={!item.placeholder}
                        isActive={isActive(item.url)}
                        tooltip={isMobile ? undefined : label}
                        className={salesChildClass + (showLabels ? " pl-8" : "") + (item.placeholder ? " cursor-default opacity-70 hover:bg-transparent" : "")}
                      >
                        {item.placeholder ? (
                          <button type="button" className={linkClass} aria-label={`${label} placeholder`} title={collapsed && !isMobile ? `${label} - placeholder` : undefined} disabled>
                            <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
                            {showLabels && <span className="truncate text-sm font-medium">{label}</span>}
                            {showLabels && <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">Soon</span>}
                          </button>
                        ) : (
                          <Link to={item.url || "/dashboard"} className={linkClass} aria-label={label} title={collapsed && !isMobile ? label : undefined}>
                            <Icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
                            {showLabels && <span className="truncate text-sm font-medium">{label}</span>}
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const gatedManagementItems = managementItems.filter((item) => {
    if (item.url === "/team") return can("team.view");
    if (item.url === "/settings") return can("settings.view");
    return true;
  });

  const aiLabel = t("nav.aiAssistant");

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
          {showLabels && <img src="/corevix-logo.svg" alt="Corevix" className="h-7 w-auto max-w-[160px] object-contain" />}
          {!showLabels && (
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef4ff] shadow-[inset_0_0_0_1px_rgba(29,98,249,0.14)]">
              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-5 w-5 object-contain" />
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-2">
        {renderGroup("nav.main", mainItems)}
        {renderSalesGroup()}
        {renderGroup("nav.communication", communicationItems)}
        {renderGroup("nav.operations", operationsItems)}
        {renderGroup("nav.management", gatedManagementItems)}
      </SidebarContent>
      <SidebarFooter className="border-t border-[#e6eaf0] p-2 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[mobile=true]:items-stretch">
          <SidebarMenuItem className="group-data-[collapsible=icon]:w-full">
            <SidebarMenuButton asChild isActive={isActive("/ai-assistant")} tooltip={isMobile ? undefined : aiLabel} className={menuButtonClass}>
              <Link to="/ai-assistant" className={linkClass} aria-label={aiLabel} title={collapsed && !isMobile ? aiLabel : undefined}>
                <Bot className="h-[18px] w-[18px] shrink-0 text-indigo-600" />
                {showLabels && <span className="truncate text-sm font-medium">{aiLabel}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
