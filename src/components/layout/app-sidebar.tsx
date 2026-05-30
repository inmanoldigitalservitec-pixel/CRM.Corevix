import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  MessageCircle,
  Mail,
  CheckSquare,
  FolderOpen,
  FileText,
  Receipt,
  Calendar,
  Package,
  Zap,
  BarChart3,
  UserCog,
  Settings,
  Bot,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useT } from "@/i18n";
import { usePermissions } from "@/hooks/use-permissions";

const mainItems = [
  { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, iconClassName: "text-blue-600" },
  { titleKey: "nav.leads", url: "/leads", icon: Users, iconClassName: "text-violet-600" },
  { titleKey: "nav.clients", url: "/clients", icon: Building2, iconClassName: "text-emerald-600" },
  { titleKey: "nav.pipeline", url: "/pipeline", icon: GitBranch, iconClassName: "text-amber-600" },
];

const communicationItems = [
  { titleKey: "nav.whatsappInbox", url: "/whatsapp", icon: MessageCircle, iconClassName: "text-green-600" },
  { titleKey: "nav.emailInbox", url: "/email", icon: Mail, iconClassName: "text-sky-600" },
];

const operationsItems = [
  { titleKey: "nav.tasks", url: "/tasks", icon: CheckSquare, iconClassName: "text-rose-600" },
  { titleKey: "nav.projects", url: "/projects", icon: FolderOpen, iconClassName: "text-indigo-600" },
  { titleKey: "nav.products", url: "/products", icon: Package, iconClassName: "text-slate-700" },
  { titleKey: "nav.proposals", url: "/proposals", icon: FileText, iconClassName: "text-purple-600" },
  { titleKey: "nav.invoices", url: "/invoices", icon: Receipt, iconClassName: "text-orange-600" },
  { titleKey: "nav.calendar", url: "/calendar", icon: Calendar, iconClassName: "text-slate-600" },
];

const managementItems = [
  { titleKey: "nav.automations", url: "/automations", icon: Zap, iconClassName: "text-yellow-600" },
  { titleKey: "nav.reports", url: "/reports", icon: BarChart3, iconClassName: "text-blue-700" },
  { titleKey: "nav.team", url: "/team", icon: UserCog, iconClassName: "text-fuchsia-600" },
  { titleKey: "nav.settings", url: "/settings", icon: Settings, iconClassName: "text-slate-700" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useT();
  const { can } = usePermissions();
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const renderGroup = (labelKey: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-slate-500 text-[10px] uppercase tracking-wider font-extrabold">
        {t(labelKey)}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.titleKey}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className="h-9 text-slate-900 hover:text-slate-900 data-[active=true]:text-slate-900"
              >
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className={"h-4 w-4 shrink-0 " + (item.iconClassName || "")} />
                  {!collapsed && <span className="text-sm">{t(item.titleKey as any)}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const gatedManagementItems = managementItems.filter((item) => {
    if (item.url === "/team") return can("team.view");
    if (item.url === "/settings") return can("settings.view");
    return true;
  });

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#e6eaf0]"
      style={
        {
          // Make the sidebar light (white) while keeping the rest of the app theme intact.
          "--sidebar": "#ffffff",
          "--sidebar-foreground": "#111827",
          "--sidebar-accent": "#eaf1ff",
          "--sidebar-accent-foreground": "#111827",
          "--sidebar-border": "#e6eaf0",
          "--sidebar-ring": "#1d62f9",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          {!collapsed && (
            <img
              src="/corevix-logo.svg"
              alt="Corevix"
              className="h-7 w-auto max-w-[160px] object-contain"
            />
          )}
          {collapsed && <img src="/corevix-logo.svg" alt="Corevix" className="h-7 w-7 object-contain" />}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {renderGroup("nav.main", mainItems)}
        {renderGroup("nav.communication", communicationItems)}
        {renderGroup("nav.operations", operationsItems)}
        {renderGroup("nav.management", gatedManagementItems as any)}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 text-slate-900 hover:text-slate-900">
              <Link to="/ai-assistant" className="flex items-center gap-3">
                <Bot className="h-4 w-4 shrink-0 text-indigo-600" />
                {!collapsed && <span className="text-sm">{t("nav.aiAssistant")}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
