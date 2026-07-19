import { Bell, Languages, LogOut, PlayCircle, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n";
import { useDemoTour } from "@/components/demo/demo-tour";
import { GlobalSearch } from "@/components/layout/global-search";
import { useNotifications } from "@/components/notifications/use-notifications";

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useT();
  const { open: openDemo } = useDemoTour();
  const { notifications, unreadCount, markAllRead, openNotification } = useNotifications();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center border-b bg-card px-4 md:flex">
      <div className="flex min-w-12 items-center">
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
      </div>

      <div className="absolute left-1/2 top-1/2 w-[min(36rem,calc(100vw-30rem))] min-w-[22rem] -translate-x-1/2 -translate-y-1/2">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1">
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-semibold text-sm">{t("topbar.notifications")}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    {t("topbar.markAllRead")}
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {t("topbar.noNotifications")}
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-0.5 py-2.5"
                    onClick={() => void openNotification(n)}
                  >
                    <span className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                      {n.title}
                    </span>
                    {n.message && (
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{profile?.full_name || t("common.user")}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openDemo}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Tour guiado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang(lang === "en" ? "es" : "en")}>
              <Languages className="mr-2 h-4 w-4" />
              {t("topbar.language")}: {lang === "en" ? "English" : "Español"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("topbar.profileSettings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("topbar.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
