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
import { TopBar } from "@/components/layout/top-bar";
import { DemoTourProvider } from "@/components/demo/demo-tour";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { I18nProvider, useT } from "@/i18n";
import { CrmAiFloatingChat } from "@/components/ai/CrmAiFloatingChat";
import { InlineProjectTaskCreator } from "@/components/projects/InlineProjectTaskCreator";
import { WhatsAppClient360Bridge } from "@/components/whatsapp/WhatsAppClient360Bridge";
import { WhatsAppInternalWorkPanel } from "@/components/whatsapp/WhatsAppInternalWorkPanel";
import { WhatsAppPanelPhase2Safe } from "@/components/whatsapp/WhatsAppPanelPhase2Safe";
import appCss from "../styles.css?url";

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
      { rel: "stylesheet", href: appCss },
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
  const { user, loading } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = currentPath === "/login";
  const isPublicProposalRoute = currentPath.startsWith("/proposal/public/");
  const isPublicInvoiceRoute = currentPath.startsWith("/invoice/public/");
  const isPublicRoute = isLoginPage || isPublicProposalRoute || isPublicInvoiceRoute;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isPublicRoute) {
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DemoTourProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        {currentPath === "/projects" ? <InlineProjectTaskCreator /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppInternalWorkPanel /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppPanelPhase2Safe /> : null}
        {currentPath === "/whatsapp-web" ? <WhatsAppClient360Bridge mode="whatsapp" /> : null}
        {currentPath === "/clients" ? <WhatsAppClient360Bridge mode="clients" /> : null}
        <CrmAiFloatingChat />
      </SidebarProvider>
    </DemoTourProvider>
  );
}
