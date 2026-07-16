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
import { cn } from "@/lib/utils";

export type ProjectTimeEntryFormValues = {
  entry_date: string;
  duration_hours: string;
  task_id: string;
  is_billable: boolean;
  description: string;
};

export type ProjectTimeEntryDraft = ProjectTimeEntryFormValues & {
  id?: string;
};

type TaskOption = {
  id: string;
  title: string;
};

export function defaultTimeEntryFormValues(): ProjectTimeEntryFormValues {
  return {
    entry_date: new Date().toISOString().slice(0, 10),
    duration_hours: "",
    task_id: "none",
    is_billable: true,
    description: "",
  };
}

export function ProjectTimeEntryForm({
  initialValues,
  saving,
  submitLabel,
  tasks,
  variant = "card",
  onCancel,
  onSubmit,
}: {
  initialValues: ProjectTimeEntryDraft;
  saving: boolean;
  submitLabel: string;
  tasks: TaskOption[];
  variant?: "card" | "plain";
  onCancel?: () => void;
  onSubmit: (values: ProjectTimeEntryFormValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState<ProjectTimeEntryFormValues>({
    entry_date: initialValues.entry_date || new Date().toISOString().slice(0, 10),
    duration_hours: initialValues.duration_hours || "",
    task_id: initialValues.task_id || "none",
    is_billable: initialValues.is_billable ?? true,
    description: initialValues.description || "",
  });

  useEffect(() => {
    setValues({
      entry_date: initialValues.entry_date || new Date().toISOString().slice(0, 10),
      duration_hours: initialValues.duration_hours || "",
      task_id: initialValues.task_id || "none",
      is_billable: initialValues.is_billable ?? true,
      description: initialValues.description || "",
    });
  }, [initialValues]);

  return (
    <form
      className={cn(
        "space-y-4",
        variant === "card" && "rounded-[24px] border border-slate-200/80 bg-white p-4 sm:p-5",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(values);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={values.entry_date}
            onChange={(event) =>
              setValues((current) => ({ ...current, entry_date: event.target.value }))
            }
            className="h-11 rounded-2xl border-slate-200"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Duración (horas)</Label>
          <Input
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            value={values.duration_hours}
            onChange={(event) =>
              setValues((current) => ({ ...current, duration_hours: event.target.value }))
            }
            placeholder="Ej. 1.5"
            className="h-11 rounded-2xl border-slate-200"
            disabled={saving}
          />
          <p className="text-[11px] text-slate-500">
            Usa decimales de hora, por ejemplo 0.5, 1.25 o 2.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Tarea</Label>
          <Select
            value={values.task_id}
            onValueChange={(value) => setValues((current) => ({ ...current, task_id: value }))}
            disabled={saving}
          >
            <SelectTrigger className="h-11 rounded-2xl border-slate-200">
              <SelectValue placeholder="Sin tarea" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin tarea</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Facturación</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={values.is_billable ? "default" : "outline"}
              className="h-11 flex-1 rounded-2xl"
              onClick={() => setValues((current) => ({ ...current, is_billable: true }))}
              disabled={saving}
            >
              Facturable
            </Button>
            <Button
              type="button"
              variant={!values.is_billable ? "default" : "outline"}
              className="h-11 flex-1 rounded-2xl"
              onClick={() => setValues((current) => ({ ...current, is_billable: false }))}
              disabled={saving}
            >
              Interna
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Qué se trabajó, contexto o resultado de la sesión."
            className="min-h-[104px] rounded-2xl border-slate-200 bg-white text-sm leading-6 shadow-none"
            disabled={saving}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-2",
          variant === "plain" &&
            "sticky bottom-0 -mx-5 mt-6 border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        )}
      >
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full px-4"
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={saving || !values.entry_date || !Number(values.duration_hours)}
          className="rounded-full px-4"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
