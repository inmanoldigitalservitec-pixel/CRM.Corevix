import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";

export interface CrmNotification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

type NotificationDetailGroup =
  | "clients"
  | "leads"
  | "tasks"
  | "projects"
  | "tickets"
  | "invoices"
  | "proposals"
  | "estimates"
  | "calendar"
  | "email"
  | "conversations";

const DETAIL_LINKS: Array<{
  path: string;
  group: NotificationDetailGroup;
  param: string;
}> = [
  { path: "/clients", group: "clients", param: "clientId" },
  { path: "/leads", group: "leads", param: "leadId" },
  { path: "/tasks", group: "tasks", param: "taskId" },
  { path: "/projects", group: "projects", param: "projectId" },
  { path: "/tickets", group: "tickets", param: "ticketId" },
  { path: "/invoices", group: "invoices", param: "invoiceId" },
  { path: "/proposals", group: "proposals", param: "proposalId" },
  { path: "/estimates", group: "estimates", param: "estimateId" },
  { path: "/calendar", group: "calendar", param: "eventId" },
  { path: "/email", group: "email", param: "conversationId" },
  { path: "/whatsapp", group: "conversations", param: "conversationId" },
];

function openNotificationDetail(link: string | null) {
  if (!link || typeof window === "undefined") return false;

  const url = new URL(link, window.location.origin);
  const detailLink = DETAIL_LINKS.find((item) => item.path === url.pathname);
  const id = detailLink ? url.searchParams.get(detailLink.param) : null;
  if (!detailLink || !id) return false;

  window.dispatchEvent(
    new CustomEvent("corevix:open-global-detail", {
      detail: {
        group: detailLink.group,
        href: `${url.pathname}${url.search}`,
        id,
      },
    }),
  );
  return true;
}

export function useNotifications(limit = 10) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) setNotifications(data);
    setLoading(false);
  }, [limit, user]);

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

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const openNotification = useCallback(
    async (notification: CrmNotification) => {
      await markAsRead(notification.id);
      if (openNotificationDetail(notification.link)) return;
      if (notification.link) navigate({ to: notification.link as any });
    },
    [markAsRead, navigate],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  return {
    loading,
    markAllRead,
    markAsRead,
    notifications,
    openNotification,
    refresh: loadNotifications,
    unreadCount,
  };
}
