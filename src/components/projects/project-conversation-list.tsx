import { Mail, MessageCircleMore } from "lucide-react";

export type ProjectConversationItem = {
  id: string;
  channel: "email" | "whatsapp";
  title: string;
  subtitle: string | null;
  preview: string | null;
  status: string | null;
  unreadCount: number;
  lastActivityAt: string | null;
  matchReason: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function channelCopy(channel: ProjectConversationItem["channel"]) {
  return channel === "email" ? "Email" : "WhatsApp";
}

export function ProjectConversationList({
  items,
  selectedId,
  onSelect,
}: {
  items: ProjectConversationItem[];
  selectedId: string | null;
  onSelect: (item: ProjectConversationItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <h4 className="text-sm font-semibold text-slate-900">Conversaciones relacionadas</h4>
        <p className="mt-1 text-xs text-slate-500">
          Emails y mensajes externos vinculados al cliente, prospecto u oportunidad del proyecto.
        </p>
      </div>

      <div className="divide-y divide-slate-200/80">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`w-full px-4 py-4 text-left transition sm:px-5 ${
                isSelected ? "bg-slate-50" : "hover:bg-slate-50/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    item.channel === "email"
                      ? "bg-sky-50 text-sky-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {item.channel === "email" ? (
                    <Mail className="h-4.5 w-4.5" />
                  ) : (
                    <MessageCircleMore className="h-4.5 w-4.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {channelCopy(item.channel)}
                    </span>
                    {item.unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        {item.unreadCount} sin leer
                      </span>
                    ) : null}
                  </div>

                  {item.subtitle ? (
                    <p className="mt-1 truncate text-xs text-slate-500">{item.subtitle}</p>
                  ) : null}

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                    {item.preview || "Sin preview disponible."}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{item.matchReason}</span>
                    <span>·</span>
                    <span>{item.status || "sin estado"}</span>
                    <span>·</span>
                    <span>{formatDateTime(item.lastActivityAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
