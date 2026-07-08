import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ProjectMilestoneFormValues = {
  title: string;
  description: string;
  target_date: string;
  status: string;
  progress_pct: string;
};

export type ProjectMilestoneDraft = ProjectMilestoneFormValues & {
  id?: string;
};

const MILESTONE_STATUS_OPTIONS = [
  { value: "planned", label: "Planificado" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
  { value: "blocked", label: "Bloqueado" },
  { value: "cancelled", label: "Cancelado" },
];

export function defaultMilestoneFormValues(): ProjectMilestoneFormValues {
  return {
    title: "",
    description: "",
    target_date: "",
    status: "planned",
    progress_pct: "0",
  };
}

export function ProjectMilestoneForm({
  initialValues,
  projectWindowLabel,
  saving,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialValues: ProjectMilestoneDraft;
  projectWindowLabel?: string | null;
  saving: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: ProjectMilestoneFormValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState<ProjectMilestoneFormValues>({
    title: initialValues.title || "",
    description: initialValues.description || "",
    target_date: initialValues.target_date || "",
    status: initialValues.status || "planned",
    progress_pct: initialValues.progress_pct || "0",
  });

  useEffect(() => {
    setValues({
      title: initialValues.title || "",
      description: initialValues.description || "",
      target_date: initialValues.target_date || "",
      status: initialValues.status || "planned",
      progress_pct: initialValues.progress_pct || "0",
    });
  }, [initialValues]);

  return (
    <form
      className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(values);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Título del hito</Label>
          <Input
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            placeholder="Ej. Entrega inicial al cliente"
            className="h-11 rounded-2xl border-slate-200"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha objetivo</Label>
          <Input
            type="date"
            value={values.target_date}
            onChange={(event) => setValues((current) => ({ ...current, target_date: event.target.value }))}
            className="h-11 rounded-2xl border-slate-200"
            disabled={saving}
          />
          {projectWindowLabel ? <p className="text-[11px] text-slate-500">{projectWindowLabel}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select
            value={values.status}
            onValueChange={(value) => setValues((current) => ({ ...current, status: value }))}
            disabled={saving}
          >
            <SelectTrigger className="h-11 rounded-2xl border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MILESTONE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Progreso (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={values.progress_pct}
            onChange={(event) => setValues((current) => ({ ...current, progress_pct: event.target.value }))}
            className="h-11 rounded-2xl border-slate-200"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="Contexto, entregables esperados o checkpoints del hito."
            className="min-h-[104px] rounded-2xl border-slate-200 bg-white text-sm leading-6 shadow-none"
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="rounded-full px-4">
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || !values.title.trim()} className="rounded-full px-4">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
