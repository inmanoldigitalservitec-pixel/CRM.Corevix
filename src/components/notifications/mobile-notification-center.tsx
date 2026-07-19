import { Bell, CheckCheck, ChevronRight, Clock3, X } from "lucide-react";

import type { CrmNotification } from "@/components/notifications/use-notifications";

type MobileNotificationCenterProps = {
  loading?: boolean;
  notifications: CrmNotification[];
  open: boolean;
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void | Promise<void>;
  onOpenNotification: (notification: CrmNotification) => void | Promise<void>;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function notificationTypeLabel(type: string | null) {
  if (!type) return "CRM";
  return type.replace(/_/g, " ");
}

export function MobileNotificationCenter({
  loading = false,
  notifications,
  open,
  unreadCount,
  onClose,
  onMarkAllRead,
  onOpenNotification,
}: MobileNotificationCenterProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-white text-slate-950 sm:hidden">
      <header className="border-b border-slate-200 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Centro
            </p>
            <h2 className="mt-1 truncate text-[26px] font-semibold tracking-normal">
              Notificaciones
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Cerrar notificaciones"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700">
            <Bell className="h-4 w-4 text-slate-500" />
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al dia"}
          </span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void onMarkAllRead()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar leidas
            </button>
          ) : null}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="grid gap-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-slate-200 px-5 py-5"
              >
                <span className="h-10 w-10 rounded-full bg-slate-100" />
                <span className="grid gap-2">
                  <span className="h-4 w-3/4 rounded-full bg-slate-100" />
                  <span className="h-3 w-full rounded-full bg-slate-100" />
                  <span className="h-3 w-1/2 rounded-full bg-slate-100" />
                </span>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="grid min-h-full place-items-center px-8 py-16 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
                <Bell className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-[20px] font-semibold tracking-normal">Sin novedades</h3>
              <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
                Cuando el CRM tenga algo importante para ti, aparecera aqui.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={async () => {
                  await onOpenNotification(notification);
                  onClose();
                }}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 px-5 py-4 text-left ${
                  notification.read ? "bg-white" : "bg-slate-50"
                }`}
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 self-start rounded-full ${
                    notification.read ? "bg-slate-200" : "bg-slate-900"
                  }`}
                />
                <span className="min-w-0">
                  <span
                    className={`block truncate text-[15px] tracking-normal ${
                      notification.read
                        ? "font-semibold text-slate-700"
                        : "font-bold text-slate-950"
                    }`}
                  >
                    {notification.title}
                  </span>
                  {notification.message ? (
                    <span className="mt-1 line-clamp-2 block text-[13px] font-medium leading-5 text-slate-500">
                      {notification.message}
                    </span>
                  ) : null}
                  <span className="mt-2 flex min-w-0 items-center gap-2 text-[12px] font-semibold text-slate-400">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate capitalize">
                      {notificationTypeLabel(notification.type)}
                    </span>
                    <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                    <span className="shrink-0">
                      {formatNotificationDate(notification.created_at)}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
