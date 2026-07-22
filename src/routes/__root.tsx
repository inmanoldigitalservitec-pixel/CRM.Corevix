import {
  Outlet,
  Link,
  Navigate,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { TeamChatMini } from "@/components/team-chat/team-chat-mini";
import { GlobalDetailHost } from "@/components/layout/global-detail-host";
import { TopBar } from "@/components/layout/top-bar";
import { GlobalSearch } from "@/components/layout/global-search";
import { DemoTourProvider } from "@/components/demo/demo-tour";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { I18nProvider, useT } from "@/i18n";
import { GlobalTaskCreateHost } from "@/components/tasks/global-task-create-host";
import { WhatsAppClient360Bridge } from "@/components/whatsapp/WhatsAppClient360Bridge";
import { WhatsAppInternalWorkPanel } from "@/components/whatsapp/WhatsAppInternalWorkPanel";
import { WhatsAppPanelPhase2Safe } from "@/components/whatsapp/WhatsAppPanelPhase2Safe";
import { WhatsAppResponsiveCompact } from "@/components/whatsapp/WhatsAppResponsiveCompact";
import {
  FirstRunSetupLoadingScreen,
  FirstRunSetupScreen,
} from "@/components/onboarding/first-run-setup-screen";
import { useFirstRunSetup } from "@/hooks/use-first-run-setup";
import appCss from "../styles.css?url";
import projectWorkspaceResponsiveCss from "../project-workspace-responsive.css?url";

function NotFoundComponent() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("error.pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.pageNotFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("error.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Corevix CRM — Cloud Business Management" },
      {
        name: "description",
        content:
          "Modern cloud-based CRM platform for managing leads, clients, sales pipelines, projects, and business operations.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/imagotipo_corevix.svg" },
      { rel: "shortcut icon", type: "image/svg+xml", href: "/imagotipo_corevix.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: projectWorkspaceResponsiveCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </I18nProvider>
  );
}

function AppShell() {
  const { user, loading, accountStatus, signOut } = useAuth();
  const firstRunSetup = useFirstRunSetup();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = currentPath === "/login";
  const isPublicProposalRoute = currentPath.startsWith("/proposal/public/");
  const isPublicInvoiceRoute = currentPath.startsWith("/invoice/public/");
  const isPublicRoute = isLoginPage || isPublicProposalRoute || isPublicInvoiceRoute;
  const isAiRoute = currentPath === "/ai-assistant";
  const isProposalBuilderRoute = currentPath.startsWith("/proposal-builder/");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isPublicRoute || isProposalBuilderRoute) {
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (accountStatus === "signed_out") {
    return <Navigate to="/login" replace />;
  }

  if (accountStatus !== "ready") {
    return <AccountStateScreen status={accountStatus} onSignOut={signOut} />;
  }

  if (firstRunSetup.loading) {
    return <FirstRunSetupLoadingScreen />;
  }

  if (firstRunSetup.shouldShowSetup) {
    return (
      <FirstRunSetupScreen
        defaultValues={firstRunSetup.defaultForm}
        saving={firstRunSetup.saving}
        onSave={firstRunSetup.saveSetup}
        onDismiss={firstRunSetup.dismissSetup}
      />
    );
  }

  return (
    <DemoTourProvider>
      <SidebarProvider
        defaultOpen
        style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}
      >
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebarMountGate />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar />
            <main
              className={
                isAiRoute
                  ? "min-h-0 flex-1 overflow-hidden"
                  : "min-h-0 flex-1 overflow-auto max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
              }
            >
              <Outlet />
            </main>
          </div>
        </div>
        {currentPath === "/whatsapp-web" ? <WhatsAppInternalWorkPanel /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppPanelPhase2Safe /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppResponsiveCompact /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppClient360Bridge mode="whatsapp" /> : null}
        {currentPath === "/internal-chat" ? null : <TeamChatMini />}
        <GlobalSearch launcherOnly />
        <MobileBottomNav />
        <GlobalTaskCreateHost />
        <GlobalDetailHost />
      </SidebarProvider>
    </DemoTourProvider>
  );
}

function AccountStateScreen({
  status,
  onSignOut,
}: {
  status: Exclude<ReturnType<typeof useAuth>["accountStatus"], "ready" | "signed_out">;
  onSignOut: () => Promise<void>;
}) {
  const copy = {
    loading: {
      title: "Entrando al CRM...",
      description: "Estamos preparando tu sesión y tu espacio de trabajo.",
      action: null,
    },
    email_pending: {
      title: "Confirma tu email",
      description:
        "Tu cuenta fue creada, pero todavía falta confirmar el correo antes de entrar al CRM.",
      action: "Cerrar sesión",
    },
    missing_profile: {
      title: "Completa tu perfil",
      description:
        "Tu acceso existe, pero todavía no encontramos el perfil interno necesario para operar en el CRM.",
      action: "Cerrar sesión",
    },
    missing_company: {
      title: "Falta conectar tu empresa",
      description:
        "Tu perfil no tiene una empresa asignada. Pide a un administrador que revise tu invitación o acceso.",
      action: "Cerrar sesión",
    },
    inactive: {
      title: "Tu cuenta está inactiva",
      description:
        "Tu usuario existe, pero el acceso al CRM está desactivado. Un administrador puede reactivarlo desde Equipo.",
      action: "Cerrar sesión",
    },
  }[status];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-xl font-black text-blue-700">
          C
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{copy.description}</p>
        {status === "loading" ? (
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-b-blue-600" />
        ) : null}
        {copy.action ? (
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {copy.action}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AppSidebarMountGate() {
  return (
    <div className="hidden md:contents">
      <AppSidebar />
    </div>
  );
}
