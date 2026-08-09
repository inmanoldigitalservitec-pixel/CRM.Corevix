import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import type React from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Image,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  Package,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useT } from "@/i18n";

type MobileSectionItem = {
  titleKey?: string;
  title?: string;
  url?: string;
  icon: React.ElementType;
  iconClassName?: string;
  permission?: string;
};

type MobileSectionGroup = {
  label?: string;
  icon?: React.ElementType;
  items: MobileSectionItem[];
  direct?: boolean;
  collapsible?: boolean;
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

const salesItems: MobileSectionItem[] = [
  { titleKey: "nav.clients", url: "/clients", icon: Building2, iconClassName: "text-emerald-600" },
  { titleKey: "nav.leads", url: "/leads", icon: Users, iconClassName: "text-violet-600" },
  {
    titleKey: "nav.proposals",
    url: "/proposals",
    icon: FileText,
    iconClassName: "text-purple-600",
  },
  { title: "Cotizaciones", url: "/estimates", icon: FileCheck2, iconClassName: "text-sky-600" },
  { titleKey: "nav.invoices", url: "/invoices", icon: Receipt, iconClassName: "text-orange-600" },
  { titleKey: "nav.products", url: "/products", icon: Package, iconClassName: "text-slate-700" },
];

const financeItems: MobileSectionItem[] = [
  { title: "Pagos", url: "/payments", icon: CreditCard, iconClassName: "text-emerald-600" },
  {
    title: "Notas de crédito",
    url: "/credit-notes",
    icon: ReceiptText,
    iconClassName: "text-rose-600",
  },
  {
    title: "Suscripciones",
    url: "/subscriptions",
    icon: RotateCcw,
    iconClassName: "text-indigo-600",
  },
];

const communicationItems: MobileSectionItem[] = [
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

const operationsItems: MobileSectionItem[] = [
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

const utilitiesItems: MobileSectionItem[] = [
  {
    title: "Biblioteca multimedia",
    url: "/media-library",
    icon: Image,
    iconClassName: "text-sky-600",
  },
  { title: "Exportar PDFs", url: "/pdf-export", icon: Download, iconClassName: "text-slate-700" },
  { title: "Exportar CSV", url: "/csv-export", icon: FileText, iconClassName: "text-emerald-600" },
  { titleKey: "nav.calendar", url: "/calendar", icon: Calendar, iconClassName: "text-slate-600" },
  { titleKey: "nav.vault", url: "/vault", icon: LockKeyhole, iconClassName: "text-blue-700" },
  {
    title: "Registro de actividad",
    url: "/activity-log",
    icon: Activity,
    iconClassName: "text-blue-700",
  },
];

const reportsItems: MobileSectionItem[] = [
  { title: "Ventas", url: "/reports", icon: BarChart3, iconClassName: "text-blue-700" },
  { title: "Gastos", url: "/expenses", icon: BadgeDollarSign, iconClassName: "text-red-600" },
];

const setupItems: MobileSectionItem[] = [
  {
    title: "Equipo",
    url: "/team",
    icon: UserCog,
    iconClassName: "text-fuchsia-600",
    permission: "team.view",
  },
  {
    titleKey: "nav.settings",
    url: "/settings",
    icon: Settings,
    iconClassName: "text-slate-700",
    permission: "settings.view",
  },
];

const groups: MobileSectionGroup[] = [
  { label: "Ventas", icon: Zap, items: salesItems },
  { label: "Finanzas", icon: BadgeDollarSign, items: financeItems },
  { label: "Comunicaciones", icon: MessageCircle, items: communicationItems },
  { label: "Operaciones", icon: CheckSquare, items: operationsItems },
  { label: "Herramientas", icon: CircleDot, items: utilitiesItems, collapsible: true },
  { label: "Reportes", icon: BarChart3, items: reportsItems, collapsible: true },
  { label: "Configuración", icon: Settings, items: setupItems, collapsible: true },
];

const menuButtonClass =
  "flex min-h-[82px] w-full flex-col items-center justify-center gap-2 rounded-2xl border px-2.5 py-3 text-center text-slate-900 transition-colors";
const activeClass = "ring-1 ring-slate-950/70 text-slate-950";

function itemColorClass(iconClassName?: string) {
  if (iconClassName?.includes("emerald"))
    return "border-emerald-200 bg-white hover:border-emerald-300";
  if (iconClassName?.includes("violet"))
    return "border-violet-200 bg-white hover:border-violet-300";
  if (iconClassName?.includes("purple"))
    return "border-purple-200 bg-white hover:border-purple-300";
  if (iconClassName?.includes("sky")) return "border-sky-200 bg-white hover:border-sky-300";
  if (iconClassName?.includes("orange"))
    return "border-orange-200 bg-white hover:border-orange-300";
  if (iconClassName?.includes("rose")) return "border-rose-200 bg-white hover:border-rose-300";
  if (iconClassName?.includes("indigo"))
    return "border-indigo-200 bg-white hover:border-indigo-300";
  if (iconClassName?.includes("red")) return "border-red-200 bg-white hover:border-red-300";
  if (iconClassName?.includes("green")) return "border-green-200 bg-white hover:border-green-300";
  if (iconClassName?.includes("cyan")) return "border-cyan-200 bg-white hover:border-cyan-300";
  if (iconClassName?.includes("amber")) return "border-amber-200 bg-white hover:border-amber-300";
  if (iconClassName?.includes("blue")) return "border-blue-200 bg-white hover:border-blue-300";
  if (iconClassName?.includes("fuchsia"))
    return "border-fuchsia-200 bg-white hover:border-fuchsia-300";
  if (iconClassName?.includes("pink")) return "border-pink-200 bg-white hover:border-pink-300";
  return "border-slate-200 bg-white hover:border-slate-300";
}

function isActivePath(currentPath: string, path?: string) {
  return !!path && (currentPath === path || currentPath.startsWith(`${path}/`));
}

export function MobileSectionsMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const { can } = usePermissions();
  const { t } = useT();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const itemLabel = (item: MobileSectionItem) => item.title || t(item.titleKey as any);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission as any)),
    }))
    .filter((group) => group.items.length > 0);

  const groupHasActiveItem = (group: MobileSectionGroup) =>
    group.items.some((item) => isActivePath(currentPath, item.url));

  const isGroupOpen = (group: MobileSectionGroup) => {
    if (!group.collapsible || !group.label) return true;
    return openGroups[group.label] ?? groupHasActiveItem(group);
  };

  const renderItem = (item: MobileSectionItem) => {
    const label = itemLabel(item);
    const Icon = item.icon;
    const active = isActivePath(currentPath, item.url);
    const className = `${menuButtonClass} ${itemColorClass(item.iconClassName)} ${
      active ? activeClass : ""
    }`;

    const content = (
      <>
        <Icon className={`h-[18px] w-[18px] shrink-0 ${item.iconClassName || ""}`} />
        <span className="line-clamp-2 min-w-0 text-[12px] font-semibold leading-tight">
          {label}
        </span>
      </>
    );

    if (!item.url) {
      return (
        <button key={label} type="button" className={`${className} cursor-default opacity-70`}>
          {content}
        </button>
      );
    }

    return (
      <Link key={label} to={item.url} className={className} onClick={() => onOpenChange(false)}>
        {content}
      </Link>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="fixed inset-0 left-0 top-0 z-[70] h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden border-0 bg-white p-0 shadow-none sm:rounded-none [&>button]:hidden">
        <div className="flex h-full min-h-0 flex-col bg-white text-slate-950">
          <header className="absolute right-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-10">
            <DialogTitle className="sr-only">Menú</DialogTitle>
            <DialogDescription className="sr-only">
              Navegación principal del CRM para abrir módulos, reportes y configuración.
            </DialogDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar secciones"
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
            {visibleGroups.map((group, index) => {
              if (group.direct) {
                return (
                  <section key={`direct-${index}`} className="py-1.5">
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map((item) => renderItem(item))}
                    </div>
                  </section>
                );
              }

              const GroupIcon = group.icon || CircleDot;
              const expanded = isGroupOpen(group);
              return (
                <section key={group.label} className="py-2.5">
                  {group.collapsible && group.label ? (
                    <button
                      type="button"
                      className="mb-2 flex h-10 w-full items-center gap-2 border-b border-slate-200 text-left text-slate-900"
                      onClick={() =>
                        setOpenGroups((current) => ({
                          ...current,
                          [group.label as string]: !expanded,
                        }))
                      }
                      aria-expanded={expanded}
                    >
                      <GroupIcon className="h-4 w-4 shrink-0 text-slate-900" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="mb-2 flex items-center gap-2 text-slate-900">
                      <GroupIcon className="h-4 w-4 shrink-0 text-slate-900" />
                      <span className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        {group.label}
                      </span>
                    </div>
                  )}
                  {expanded ? (
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map((item) => renderItem(item))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
