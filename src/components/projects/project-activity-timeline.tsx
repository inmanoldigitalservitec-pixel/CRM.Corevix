import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";

export type ProjectActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  entityType: string;
  entityLabel: string;
  actorLabel: string;
  icon: LucideIcon;
  toneClassName: string;
};

function formatAbsoluteDate(value: string) {
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

function formatRelativeDate(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(days, "day");
}

export function projectActivityIconFor(item: { action: string; entityType: string }): {
  icon: LucideIcon;
  toneClassName: string;
} {
  if (item.action.includes("deleted")) {
    return { icon: Trash2, toneClassName: "bg-rose-50 text-rose-700 ring-rose-100" };
  }
  if (item.action.includes("updated")) {
    return { icon: PencilLine, toneClassName: "bg-amber-50 text-amber-700 ring-amber-100" };
  }
  if (item.action.includes("created")) {
    return { icon: Plus, toneClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  }
  if (item.action.includes("completed")) {
    return { icon: CheckCircle2, toneClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  }

  switch (item.entityType) {
    case "projects":
      return { icon: FolderOpen, toneClassName: "bg-sky-50 text-sky-700 ring-sky-100" };
    case "tasks":
      return { icon: Clock3, toneClassName: "bg-violet-50 text-violet-700 ring-violet-100" };
    case "project_notes":
      return { icon: FileText, toneClassName: "bg-slate-100 text-slate-700 ring-slate-200" };
    default:
      return { icon: Activity, toneClassName: "bg-slate-100 text-slate-700 ring-slate-200" };
  }
}

export function ProjectActivityTimeline({ items }: { items: ProjectActivityItem[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <article
            key={item.id}
            className={
              index === items.length - 1
                ? "px-4 py-4 sm:px-5"
                : "border-b border-slate-200/70 px-4 py-4 sm:px-5"
            }
          >
            <div className="flex gap-3.5">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${item.toneClassName}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.actorLabel}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {item.entityLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-700">{item.title}</p>
                  </div>
                  <time
                    dateTime={item.createdAt}
                    title={formatAbsoluteDate(item.createdAt)}
                    className="shrink-0 text-[11px] font-medium text-slate-500"
                  >
                    {formatRelativeDate(item.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                  {item.description}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {formatAbsoluteDate(item.createdAt)}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
