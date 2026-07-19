import { useEffect, useMemo, useState } from "react";
import { Camera, Check, Languages, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import type {
  FirstRunSetupForm,
  PreferredLanguage,
  PreferredTitle,
} from "@/hooks/use-first-run-setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "h-11 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-medium text-slate-900 shadow-none focus-visible:border-blue-500 focus-visible:ring-0";

const selectClass =
  "h-11 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500";

const titleOptions: Array<{ value: PreferredTitle; label: string }> = [
  { value: "none", label: "Solo mi nombre" },
  { value: "mr", label: "Mr." },
  { value: "ms", label: "Ms." },
  { value: "mx", label: "Mx." },
];

const languageOptions: Array<{ value: PreferredLanguage; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

const previewDefaults: FirstRunSetupForm = {
  full_name: "Inmanol Corniell",
  avatar_url: "",
  phone: "",
  department: "Dirección",
  preferred_title: "none",
  birth_date: "",
  language: "es",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return `${parts[0]?.[0] || "C"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FirstRunSetupLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 py-8 text-center text-slate-950">
      <div className="mx-auto flex min-h-[520px] max-w-md flex-col items-center justify-center">
        <div className="mb-8 grid h-16 w-16 place-items-center rounded-2xl border border-blue-100 bg-blue-50">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
        <img src="/corevix-logo.svg" alt="Corevix" className="mb-7 h-6 w-auto" />
        <h1 className="text-3xl font-black tracking-tight">Configurando tu CRM</h1>
        <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
          Preparando tu espacio de trabajo para que entres con todo en orden.
        </p>
      </div>
    </div>
  );
}

export function FirstRunSetupScreen({
  defaultValues,
  mode = "live",
  saving = false,
  onDismiss,
  onSave,
}: {
  defaultValues?: FirstRunSetupForm;
  mode?: "live" | "preview";
  saving?: boolean;
  onDismiss?: () => Promise<boolean> | boolean | void;
  onSave?: (form: FirstRunSetupForm, avatarFile?: File | null) => Promise<boolean> | boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [form, setForm] = useState<FirstRunSetupForm>(defaultValues || previewDefaults);

  useEffect(() => {
    setForm(defaultValues || previewDefaults);
  }, [defaultValues]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowForm(true), mode === "preview" ? 900 : 1200);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const displayName = form.full_name.trim() || "Usuario Corevix";
  const avatarSource = avatarPreview || form.avatar_url;
  const greetingName = useMemo(() => {
    const first = displayName.split(/\s+/)[0] || "Corevix";
    const prefix = titleOptions.find((option) => option.value === form.preferred_title)?.label;
    return form.preferred_title === "none" ? first : `${prefix} ${first}`;
  }, [displayName, form.preferred_title]);

  const handleAvatarFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La foto no puede pesar más de 3 MB.");
      return;
    }
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Escribe tu nombre para continuar.");
      return;
    }
    if (mode === "preview") {
      toast.success("Preview listo. En el flujo real esto guardará el perfil.");
      return;
    }
    const ok = await onSave?.(form, avatarFile);
    if (ok) toast.success("Perfil preparado. Bienvenido a Corevix.");
  };

  const handleDismiss = async () => {
    if (mode === "preview") {
      if (onDismiss) {
        await onDismiss();
        return;
      }
      setShowForm(false);
      window.setTimeout(() => setShowForm(true), 450);
      return;
    }
    await onDismiss?.();
  };

  if (!showForm) return <FirstRunSetupLoadingScreen />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white sm:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 p-7 sm:border-b-0 sm:border-r lg:p-9">
            <img src="/corevix-logo.svg" alt="Corevix" className="h-6 w-auto" />
            <div className="mt-10 lg:mt-14">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                Bienvenida
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Hola, {greetingName}.
              </h1>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                Antes de entrar, deja tu perfil listo. Solo pedimos lo esencial para que Corevix se
                sienta más tuyo desde el primer uso.
              </p>
            </div>
            <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 lg:mt-12">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-700">
                  <Check className="h-4 w-4" />
                </span>
                Perfil personal
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-700">
                  <Languages className="h-4 w-4" />
                </span>
                Idioma preferido
              </div>
            </div>
          </aside>

          <main className="p-6 lg:p-9">
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="flex items-center gap-5 border-b border-slate-200 pb-6">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-xl font-black text-slate-700">
                  {avatarSource ? (
                    <img src={avatarSource} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(displayName)
                  )}
                </div>
                <div className="min-w-0">
                  <Label
                    htmlFor="first-run-avatar"
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Camera className="h-4 w-4" />
                    Cargar foto
                  </Label>
                  <input
                    id="first-run-avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => handleAvatarFile(event.target.files?.[0])}
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    PNG, JPG o WebP. Máximo 3 MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre">
                  <Input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    placeholder="Tu nombre"
                    className={inputClass}
                  />
                </Field>

                <Field label="Cómo te llamamos">
                  <select
                    value={form.preferred_title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        preferred_title: event.target.value as PreferredTitle,
                      }))
                    }
                    className={selectClass}
                  >
                    {titleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Fecha de nacimiento">
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, birth_date: event.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Teléfono">
                  <Input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </Field>

                <Field label="Cargo o departamento">
                  <Input
                    value={form.department}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, department: event.target.value }))
                    }
                    placeholder="Ej: Ventas, Dirección..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Idioma preferido">
                  <select
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        language: event.target.value as PreferredLanguage,
                      }))
                    }
                    className={selectClass}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-5 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  disabled={saving}
                  onClick={() => void handleDismiss()}
                >
                  Completar luego
                </Button>
                <Button type="submit" className="rounded-full px-6 font-black" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <UserRound className="mr-2 h-4 w-4" />
                      Guardar y entrar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
