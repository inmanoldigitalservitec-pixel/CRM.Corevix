import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign In — Corevix CRM" }] }),
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const { t } = useT();
  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("invite") || params.get("token") || "";
  }, []);
  const recoveryMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "reset" || window.location.hash.includes("type=recovery");
  }, []);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot" | "reset">(
    recoveryMode ? "reset" : inviteToken ? "signup" : "signin",
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && authMode !== "reset") {
    return <Navigate to="/dashboard" />;
  }

  const pageTitle = authMode === "forgot"
    ? "Recupera tu contraseña"
    : authMode === "reset"
      ? "Crea una nueva contraseña"
      : inviteToken
    ? "Acepta tu invitación"
    : authMode === "signin"
      ? ""
      : "Crea tu cuenta";
  const pageSubtitle = authMode === "forgot"
    ? "Te enviaremos un enlace seguro a tu correo."
    : authMode === "reset"
      ? "Elige una contraseña nueva para continuar."
      : inviteToken
    ? "Completa tus datos para entrar al workspace."
    : t("auth.brandTagline");
  const heroImage =
    "https://res.cloudinary.com/dxw0z6qgg/image/upload/v1784462780/huawei-nova-16-3840x2160-26688_xc99zp.jpg";
  const isSignUpMode = authMode === "signup";

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-950 text-slate-950 lg:min-h-screen">
      <div className="grid h-[100dvh] w-full bg-white lg:min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <aside className="hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
          <img src={heroImage} alt="" className="h-full min-h-screen w-full object-cover" />
        </aside>

        <main className="relative flex h-[100dvh] items-stretch justify-center overflow-hidden bg-white p-0 lg:min-h-screen lg:items-center lg:px-14 lg:py-7">
          <div
            className="absolute inset-0 bg-cover bg-center lg:hidden"
            style={{ backgroundImage: `url(${heroImage})` }}
          />

          <div className="relative z-10 flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none bg-transparent shadow-none ring-0 lg:h-auto lg:max-w-md lg:overflow-visible">
            <div
              className={`shrink-0 px-7 text-center text-white transition-[height,padding,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-9 lg:mb-7 lg:h-auto lg:p-0 lg:text-slate-950 ${
                isSignUpMode ? "h-[14dvh]" : "h-[42dvh]"
              }`}
            >
              <img src="/corevix-logo-white.svg" alt="Corevix" className="hidden" />
              <img
                src="/corevix-logo.svg"
                alt="Corevix"
                className="mx-auto hidden h-7 w-auto object-contain lg:block"
              />
              {pageTitle && (
                <h2
                  className={`mx-auto hidden max-w-[17rem] font-black leading-tight tracking-tight lg:block ${
                    isSignUpMode ? "mt-5 text-2xl" : "mt-6 text-3xl"
                  }`}
                >
                  {pageTitle}
                </h2>
              )}
              <p
                className={`mx-auto mt-2 hidden max-w-[18rem] text-sm font-medium leading-5 lg:block lg:text-muted-foreground ${
                  isSignUpMode ? "text-white/82" : "text-white/76"
                }`}
              >
                {pageSubtitle}
              </p>
            </div>

            <div
              className={`min-h-0 flex-1 bg-white px-6 shadow-2xl shadow-slate-950/20 transition-[padding,margin,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-9 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none ${
                isSignUpMode
                  ? "rounded-t-[1.75rem] pb-3 pt-4"
                  : "-mt-6 rounded-t-[2.25rem] pb-10 pt-8"
              }`}
            >
              <div className="flex h-full min-h-0 flex-col justify-between gap-2 lg:block lg:h-auto lg:space-y-5">
                <div
                  key={authMode}
                  className="animate-[loginFormIn_260ms_ease-out] space-y-2.5 lg:space-y-5"
                >
                  {authMode === "signin" ? (
                    <SignInForm onSubmit={signIn} onForgot={() => setAuthMode("forgot")} />
                  ) : authMode === "forgot" ? (
                    <ForgotPasswordForm onBack={() => setAuthMode("signin")} />
                  ) : authMode === "reset" ? (
                    <ResetPasswordForm />
                  ) : (
                    <SignUpForm onSubmit={signUp} />
                  )}

                  <div className="flex flex-col items-center text-center">
                    {(authMode === "signin" || authMode === "signup") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto rounded-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                      >
                        {authMode === "signin"
                          ? "¿Aún no tienes cuenta? Regístrate"
                          : "¿Ya tienes cuenta? Inicia sesión"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-1 text-center lg:hidden">
                  <img
                    src="/corevix-logo.svg"
                    alt="Corevix"
                    className="mx-auto h-4 w-auto object-contain opacity-80"
                  />
                  <p className="mx-auto mt-2 max-w-[18rem] text-[0.68rem] font-semibold leading-4 text-slate-500">
                    Acceso seguro. Tus datos se protegen bajo controles de privacidad y uso
                    responsable.
                  </p>
                  <p className="mt-1 text-[0.65rem] font-bold text-slate-400">
                    Privacidad · Seguridad · Derechos reservados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AuthInput({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
}) {
  return (
    <div className="space-y-1 lg:space-y-1.5">
      <Label className="text-[0.68rem] font-extrabold uppercase tracking-wider text-muted-foreground lg:text-xs">
        {label}
      </Label>
      <Input
        {...props}
        className={`h-10 rounded-full border-slate-200 bg-slate-50 px-5 text-base shadow-none focus-visible:ring-blue-500 lg:h-12 lg:text-sm ${className || ""}`}
      />
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1 lg:space-y-1.5">
      <Label className="text-[0.68rem] font-extrabold uppercase tracking-wider text-muted-foreground lg:text-xs">
        {label}
      </Label>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          className="h-10 rounded-full border-slate-200 bg-slate-50 px-5 pr-12 text-base shadow-none focus-visible:ring-blue-500 lg:h-12 lg:text-sm"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SignInForm({
  onSubmit,
  onForgot,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgot: () => void;
}) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password);
      toast.success(t("auth.signedInSuccess"));
    } catch (err: any) {
      toast.error(err.message || t("auth.signInFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-4">
      <AuthInput
        label={t("auth.email")}
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordInput
        label={t("auth.password")}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button
        type="submit"
        className="h-10 w-full rounded-full font-black lg:h-12"
        disabled={submitting}
      >
        {submitting ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <button
        type="button"
        className="w-full text-center text-xs font-semibold text-blue-700 hover:underline"
        onClick={onForgot}
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login?mode=reset`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "No se pudo solicitar el enlace.");
      return;
    }
    toast.success("Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Correo electrónico"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" className="h-10 w-full rounded-full font-black lg:h-12" disabled={submitting}>
        {submitting ? "Enviando..." : "Enviar enlace de recuperación"}
      </Button>
      <button type="button" className="w-full text-center text-xs font-semibold text-blue-700 hover:underline" onClick={onBack}>
        Volver a iniciar sesión
      </button>
    </form>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "No se pudo actualizar la contraseña.");
      return;
    }
    toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        label="Nueva contraseña"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
      />
      <PasswordInput
        label="Confirmar contraseña"
        placeholder="Repite tu contraseña"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        required
        minLength={8}
      />
      <Button type="submit" className="h-10 w-full rounded-full font-black lg:h-12" disabled={submitting}>
        {submitting ? "Guardando..." : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}

function SignUpForm({
  onSubmit,
}: {
  onSubmit: (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
    invitationToken?: string,
  ) => Promise<void>;
}) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "checking" | "valid" | "invalid" | "expired"
  >("idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite") || params.get("token") || "";
    const invitedEmail = params.get("email") || "";
    if (invite) {
      setIsInviteFlow(true);
      setInvitationToken(invite);
      setInviteStatus("checking");
      void (async () => {
        const { data, error } = await (supabase as any).rpc("get_invitation_acceptance_status", {
          _token: invite,
          _email: invitedEmail || null,
        });
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (error) {
          console.warn("[Auth] Invitation status check unavailable:", error);
          setInviteStatus("valid");
          return;
        }
        if (!row) {
          setInviteStatus("invalid");
          return;
        }
        if (row.status === "expired" || row.is_valid === false) {
          setInviteStatus(row.status === "expired" ? "expired" : "invalid");
          return;
        }
        setInviteStatus("valid");
      })();
    }
    if (invitedEmail) setEmail(invitedEmail);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInviteFlow && inviteStatus !== "valid") {
      toast.error("Esta invitación no está disponible.");
      return;
    }
    if (password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(email, password, fullName, companyName, invitationToken.trim() || undefined);
      toast.success(
        isInviteFlow
          ? "Cuenta creada. Revisa tu email para confirmar el acceso."
          : t("auth.accountCreatedVerifyEmail"),
      );
    } catch (err: any) {
      toast.error(err.message || t("auth.signUpFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-4">
      {isInviteFlow && (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            inviteStatus === "invalid" || inviteStatus === "expired"
              ? "border-red-100 bg-red-50 text-red-900"
              : "border-blue-100 bg-blue-50 text-blue-900"
          }`}
        >
          <p className="font-extrabold">
            {inviteStatus === "checking"
              ? "Validando invitación"
              : inviteStatus === "invalid"
                ? "Invitación inválida"
                : inviteStatus === "expired"
                  ? "Invitación expirada"
                  : "Invitación lista"}
          </p>
          <p className="mt-1 text-xs font-medium opacity-80">
            {inviteStatus === "invalid" || inviteStatus === "expired"
              ? "Pide a un administrador que te envíe una nueva invitación."
              : "Solo completa tus datos para activar el acceso."}
          </p>
        </div>
      )}

      <AuthInput
        label={t("auth.fullName")}
        placeholder="John Doe"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      {!isInviteFlow && (
        <AuthInput
          label={t("auth.companyName")}
          placeholder="My Company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      )}

      {!isInviteFlow && (
        <AuthInput
          label="Invitation Token (optional)"
          placeholder="Paste token from your admin"
          value={invitationToken}
          onChange={(e) => setInvitationToken(e.target.value)}
        />
      )}

      <AuthInput
        label={t("auth.email")}
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={isInviteFlow}
        className={isInviteFlow ? "bg-slate-100 text-slate-500" : undefined}
        required
      />
      <PasswordInput
        label={t("auth.password")}
        placeholder={t("auth.passwordMinChars")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      <Button
        type="submit"
        className="h-10 w-full rounded-full font-black lg:h-12"
        disabled={submitting || (isInviteFlow && inviteStatus !== "valid")}
      >
        {submitting
          ? t("auth.creatingAccount")
          : isInviteFlow
            ? "Crear cuenta y unirme"
            : t("auth.createAccount")}
      </Button>
    </form>
  );
}
