import { AlertTriangle, CalendarClock, Edit3, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProjectMilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  progress_pct: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function milestoneStatusMeta(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completado", className: "bg-emerald-50 text-emerald-700" };
    case "in_progress":
      return { label: "En progreso", className: "bg-blue-50 text-blue-700" };
    case "blocked":
      return { label: "Bloqueado", className: "bg-rose-50 text-rose-700" };
    case "cancelled":
      return { label: "Cancelado", className: "bg-slate-100 text-slate-600" };
    default:
      return { label: "Planificado", className: "bg-amber-50 text-amber-700" };
  }
}

function milestoneTiming(milestone: ProjectMilestoneRow) {
  if (!milestone.target_date || milestone.status === "completed" || milestone.status === "cancelled") {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${milestone.target_date}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      label: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? "" : "s"}`,
      className: "bg-rose-50 text-rose-700",
      icon: AlertTriangle,
    };
  }

  if (diffDays <= 7) {
    return {
      label: diffDays === 0 ? "Vence hoy" : `Próximo en ${diffDays} día${diffDays === 1 ? "" : "s"}`,
      className: "bg-amber-50 text-amber-700",
      icon: CalendarClock,
    };
  }

  return null;
}

export function ProjectMilestoneList({
  milestones,
  canEdit,
  onEdit,
  onDelete,
}: {
  milestones: ProjectMilestoneRow[];
  canEdit: boolean;
  onEdit: (milestone: ProjectMilestoneRow) => void;
  onDelete: (milestone: ProjectMilestoneRow) => Promise<void> | void;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
      {milestones.map((milestone, index) => {
        const statusMeta = milestoneStatusMeta(milestone.status);
        const timing = milestoneTiming(milestone);
        const TimingIcon = timing?.icon;

        return (
          <article
            key={milestone.id}
            className={index === milestones.length - 1 ? "px-4 py-4 sm:px-5" : "border-b border-slate-200/70 px-4 py-4 sm:px-5"}
          >
            <div className="flex gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{milestone.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      {timing ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${timing.className}`}>
                          {TimingIcon ? <TimingIcon className="h-3 w-3" /> : null}
                          {timing.label}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {formatDate(milestone.target_date)} · {milestone.progress_pct}% completado
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-full px-3 text-xs text-slate-600"
                        onClick={() => onEdit(milestone)}
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-600"
                        onClick={() => void onDelete(milestone)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                  {milestone.description || "Sin descripción adicional."}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
