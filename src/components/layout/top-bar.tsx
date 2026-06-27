import { useCallback, useEffect, useState } from "react";
import { Bell, Search, User, LogOut, PlayCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { useDemoTour } from "@/components/demo/demo-tour";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
}

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useT();
  const { open: openDemo } = useDemoTour();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimeTable({
    table: "notifications",
    filter: user?.id ? `user_id=eq.${user.id}` : null,
    enabled: Boolean(user?.id),
    onChange: () => {
      void loadNotifications();
    },
  });

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4">
      <SidebarTrigger className="-ml-1" />

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("topbar.searchPlaceholder")}
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs gap-2"
          onClick={openDemo}
          aria-label="Demo tour"
          title="Demo"
        >
          <PlayCircle className="h-4 w-4" />
          Demo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2.5 text-xs"
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          aria-label={t("topbar.language")}
          title={t("topbar.language")}
        >
          {lang === "en" ? "ES" : "EN"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
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
                  onClick={() => markAsRead(n.id)}
                >
                  <span className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                    {n.title}
                  </span>
                  {n.message && <span className="text-xs text-muted-foreground">{n.message}</span>}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
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
