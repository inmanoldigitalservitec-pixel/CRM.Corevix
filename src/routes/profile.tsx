import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  KeyRound,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MonitorCog,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProfileWorkMonitor } from "@/components/profile/profile-work-monitor";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProfileForm = {
  full_name: string;
  phone: string;
  department: string;
  avatar_url: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type ProfilePreferences = {
  language: "system" | "en" | "es";
  timezone: string;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  default_dashboard: "dashboard" | "tasks" | "projects" | "leads" | "pipeline" | "calendar";
};

const DEFAULT_PREFERENCES: ProfilePreferences = {
  language: "system",
  timezone: "America/Santo_Domingo",
  theme: "system",
  density: "comfortable",
  default_dashboard: "dashboard",
};

const timezones = [
  "America/Santo_Domingo",
  "America/New_York",
  "America/Puerto_Rico",
  "America/Bogota",
  "America/Mexico_City",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

const VALUE_LABELS: Record<string, string> = {
  system: "Sistema",
  en: "Inglés",
  es: "Español",
  light: "Claro",
  dark: "Oscuro",
  comfortable: "Cómoda",
  compact: "Compacta",
  dashboard: "Panel",
  tasks: "Tareas",
  projects: "Proyectos",
  leads: "Prospectos",
  pipeline: "Pipeline",
  calendar: "Calendario",
  email: "Email",
};

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Mi perfil - Corevix CRM" },
      { name: "description", content: "Administra tu perfil y los datos de tu cuenta en Corevix CRM." },
    ],
  }),
});

function initials(name?: string | null, email?: string | null) {
  const source = String(name || email || "Usuario").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return date.toLocaleString();
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelFromValue(value: string) {
  return VALUE_LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value || "-"}</p>
      </div>
    </div>
  );
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProfilePage() {
  const { user, profile, roles, loading } = useAuth();
  const db = supabase as any;
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    department: "",
    avatar_url: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [preferences, setPreferences] = useState<ProfilePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      phone: profile?.phone || "",
      department: profile?.department || "",
      avatar_url: profile?.avatar_url || "",
    });
  }, [profile, user]);

  useEffect(() => {
    let cancelled = false;
    const loadPreferences = async () => {
      if (!profile?.id) return;
      setPreferencesLoading(true);
      const { data, error } = await db
        .from("profile_preferences")
        .select("language,timezone,theme,density,default_dashboard")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      setPreferencesLoading(false);
      if (error) {
        toast.error(error.message || "No se pudieron cargar las preferencias del perfil.");
        return;
      }
      setPreferences(
        data
          ? {
              language: data.language || DEFAULT_PREFERENCES.language,
              timezone: data.timezone || DEFAULT_PREFERENCES.timezone,
              theme: data.theme || DEFAULT_PREFERENCES.theme,
              density: data.density || DEFAULT_PREFERENCES.density,
              default_dashboard: data.default_dashboard || DEFAULT_PREFERENCES.default_dashboard,
            }
          : DEFAULT_PREFERENCES,
      );
    };
    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [db, profile?.id]);

  const displayName = form.full_name || profile?.full_name || user?.email || "Usuario Corevix";
  const email = user?.email || "Sin email";
  const primaryRole = roles[0] ? roleLabel(roles[0]) : "Sin rol asignado";
  const joinedAt = formatDate(user?.created_at || null);
  const lastSignIn = formatDate(user?.last_sign_in_at || null);
  const accountStatus = profile?.is_active === false ? "Inactivo" : "Activo";
  const authProvider = user?.app_metadata?.provider ? String(user.app_metadata.provider) : "email";
  const roleBadges = useMemo(() => roles.map((role) => roleLabel(role)), [roles]);

  const saveProfile = async () => {
    if (!profile?.id) {
      toast.error("No se encontró un perfil para este usuario.");
      return;
    }
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .update({
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo actualizar el perfil.");
      return;
    }
    toast.success("Perfil actualizado.");
    setEditOpen(false);
  };

  const savePreferences = async () => {
    if (!profile?.id) {
      toast.error("No se encontró un perfil para este usuario.");
      return;
    }
    setPreferencesSaving(true);
    const { error } = await db.from("profile_preferences").upsert(
      {
        profile_id: profile.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
    setPreferencesSaving(false);
    if (error) {
      toast.error(error.message || "No se pudieron guardar las preferencias.");
      return;
    }
    toast.success("Preferencias guardadas.");
  };

  const updatePassword = async () => {
    if (!email || email === "Sin email") {
      toast.error("Esta cuenta no tiene un email de acceso disponible.");
      return;
    }
    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      toast.error("Completa todos los campos de contraseña.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    setSecuritySaving(true);
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordForm.current_password,
    });
    if (reauthError) {
      setSecuritySaving(false);
      toast.error("La contraseña actual no es válida.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordForm.new_password,
    });
    setSecuritySaving(false);
    if (updateError) {
      toast.error(updateError.message || "No se pudo actualizar la contraseña.");
      return;
    }

    setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    toast.success("Contraseña actualizada.");
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Mi perfil" subtitle="Cargando tu perfil..." />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Mi perfil"
        subtitle="Administra tu identidad, trabajo, seguridad y preferencias."
      >
        <Button size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Editar perfil
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900" />
          <CardContent className="-mt-12 space-y-5 p-6">
            <div className="flex items-end justify-between gap-4">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt={displayName}
                  className="h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-3xl border-4 border-white bg-slate-950 text-2xl font-black text-white shadow-sm">
                  {initials(displayName, email)}
                </div>
              )}
              <Badge
                className="mb-2"
                variant={accountStatus === "Activo" ? "default" : "destructive"}
              >
                {accountStatus}
              </Badge>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{displayName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{primaryRole}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {roleBadges.length ? (
                roleBadges.map((role) => (
                  <Badge key={role} variant="secondary" className="rounded-full">
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">Sin roles</Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={email} />
              <InfoRow icon={Phone} label="Teléfono" value={form.phone || "Sin definir"} />
              <InfoRow
                icon={Building2}
                label="Departamento"
                value={form.department || "Sin definir"}
              />
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cuenta
                  </p>
                  <p className="text-lg font-black text-slate-950">{accountStatus}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Acceso
                  </p>
                  <p className="text-lg font-black text-slate-950">{roles.length || 0} roles</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ingreso
                  </p>
                  <p className="text-sm font-black text-slate-950">{joinedAt}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 md:w-auto md:inline-grid">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="access">Acceso</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
              <TabsTrigger value="preferences">Preferencias</TabsTrigger>
              <TabsTrigger value="activity">Actividad</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Detalles del perfil</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow icon={UserCircle} label="Nombre completo" value={displayName} />
                  <InfoRow icon={Mail} label="Email de acceso" value={email} />
                  <InfoRow icon={Phone} label="Teléfono" value={form.phone || "Sin definir"} />
                  <InfoRow
                    icon={Building2}
                    label="Departamento"
                    value={form.department || "Sin definir"}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Rol y acceso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoRow icon={ShieldCheck} label="Rol principal" value={primaryRole} />
                    <InfoRow icon={CheckCircle2} label="Estado de cuenta" value={accountStatus} />
                    <InfoRow icon={CalendarDays} label="Ingreso" value={joinedAt} />
                    <InfoRow icon={Activity} label="Último acceso" value={lastSignIn} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Roles asignados</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roleBadges.length ? (
                        roleBadges.map((role) => <Badge key={role}>{role}</Badge>)
                      ) : (
                        <Badge variant="outline">Sin roles asignados</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Seguridad e inicio de sesión</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Administra el acceso de la cuenta y los controles sensibles de inicio de sesión.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoRow icon={Mail} label="Email de acceso" value={email} />
                    <InfoRow
                      icon={LockKeyhole}
                      label="Proveedor de autenticación"
                      value={labelFromValue(authProvider)}
                    />
                    <InfoRow icon={Activity} label="Último acceso" value={lastSignIn} />
                    <InfoRow icon={CheckCircle2} label="Estado de cuenta" value={accountStatus} />
                  </div>
                  <Separator />
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-2xl border bg-white p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-950">Cambiar contraseña</p>
                          <p className="text-xs text-muted-foreground">
                            Necesitas la contraseña actual antes de aplicar la nueva.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor="current-password">Contraseña actual</Label>
                          <Input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            value={passwordForm.current_password}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                current_password: event.target.value,
                              }))
                            }
                            disabled={securitySaving}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-password">Nueva contraseña</Label>
                          <Input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.new_password}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                new_password: event.target.value,
                              }))
                            }
                            disabled={securitySaving}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.confirm_password}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirm_password: event.target.value,
                              }))
                            }
                            disabled={securitySaving}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          Usa al menos 8 caracteres. La sesión puede refrescarse después del cambio.
                        </p>
                        <Button onClick={updatePassword} disabled={securitySaving}>
                          {securitySaving ? "Actualizando..." : "Actualizar contraseña"}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-dashed bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-700">
                          <Smartphone className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-950">MFA / 2FA</p>
                          <p className="text-xs text-muted-foreground">
                            Mejora de seguridad planificada
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Este espacio queda reservado para autenticación multifactor por TOTP o teléfono.
                      </p>
                      <Button className="mt-4 w-full" variant="outline" disabled>
                        MFA próximamente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Preferencias personales</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Guarda los ajustes básicos que definen tu experiencia dentro del CRM.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldSelect
                      id="profile-language"
                      label="Idioma"
                      value={preferences.language}
                      disabled={preferencesLoading || preferencesSaving}
                      onChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          language: value as ProfilePreferences["language"],
                        }))
                      }
                      options={[
                        { value: "system", label: "Predeterminado del sistema" },
                        { value: "en", label: "Inglés" },
                        { value: "es", label: "Español" },
                      ]}
                    />
                    <FieldSelect
                      id="profile-timezone"
                      label="Zona horaria"
                      value={preferences.timezone}
                      disabled={preferencesLoading || preferencesSaving}
                      onChange={(value) => setPreferences((prev) => ({ ...prev, timezone: value }))}
                      options={timezones.map((timezone) => ({ value: timezone, label: timezone }))}
                    />
                    <FieldSelect
                      id="profile-theme"
                      label="Tema"
                      value={preferences.theme}
                      disabled={preferencesLoading || preferencesSaving}
                      onChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          theme: value as ProfilePreferences["theme"],
                        }))
                      }
                      options={[
                        { value: "system", label: "Sistema" },
                        { value: "light", label: "Claro" },
                        { value: "dark", label: "Oscuro" },
                      ]}
                    />
                    <FieldSelect
                      id="profile-density"
                      label="Densidad de interfaz"
                      value={preferences.density}
                      disabled={preferencesLoading || preferencesSaving}
                      onChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          density: value as ProfilePreferences["density"],
                        }))
                      }
                      options={[
                        { value: "comfortable", label: "Cómoda" },
                        { value: "compact", label: "Compacta" },
                      ]}
                    />
                    <FieldSelect
                      id="profile-default-dashboard"
                      label="Página inicial"
                      value={preferences.default_dashboard}
                      disabled={preferencesLoading || preferencesSaving}
                      onChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          default_dashboard: value as ProfilePreferences["default_dashboard"],
                        }))
                      }
                      options={[
                        { value: "dashboard", label: "Panel" },
                        { value: "tasks", label: "Tareas" },
                        { value: "projects", label: "Proyectos" },
                        { value: "leads", label: "Prospectos" },
                        { value: "pipeline", label: "Pipeline" },
                        { value: "calendar", label: "Calendario" },
                      ]}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <InfoRow
                      icon={Languages}
                      label="Idioma"
                      value={labelFromValue(preferences.language)}
                    />
                    <InfoRow
                      icon={MonitorCog}
                      label="Tema"
                      value={labelFromValue(preferences.theme)}
                    />
                    <InfoRow
                      icon={SlidersHorizontal}
                      label="Densidad"
                      value={labelFromValue(preferences.density)}
                    />
                    <InfoRow
                      icon={LayoutDashboard}
                      label="Página inicial"
                      value={labelFromValue(preferences.default_dashboard)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={savePreferences}
                      disabled={preferencesLoading || preferencesSaving}
                    >
                      {preferencesSaving ? "Guardando..." : "Guardar preferencias"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ProfileWorkMonitor profileId={profile?.id || null} userId={user?.id || null} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-full-name">Nombre completo</Label>
              <Input
                id="profile-full-name"
                value={form.full_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, full_name: event.target.value }))
                }
                placeholder="Tu nombre completo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">Teléfono</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Número de teléfono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-department">Departamento</Label>
              <Input
                id="profile-department"
                value={form.department}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, department: event.target.value }))
                }
                placeholder="Ventas, soporte, operaciones..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-avatar">URL del avatar</Label>
              <Input
                id="profile-avatar"
                value={form.avatar_url}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, avatar_url: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Guardando..." : "Guardar perfil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
