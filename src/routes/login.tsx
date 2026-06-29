import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useT } from "@/i18n";

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="/corevix-logo.svg" alt="Corevix" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Corevix CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {inviteToken ? "Completa tu cuenta para unirte al equipo." : t("auth.brandTagline")}
          </p>
        </div>

        <Tabs defaultValue={inviteToken ? "signup" : "signin"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{inviteToken ? "Aceptar invitación" : t("auth.signUp")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <SignInForm onSubmit={signIn} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onSubmit={signUp} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
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
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">{t("auth.welcomeBack")}</CardTitle>
        <CardDescription>{t("auth.signInToAccount")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.password")}</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </CardContent>
    </Card>
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite") || params.get("token") || "";
    const invitedEmail = params.get("email") || "";
    if (invite) {
      setIsInviteFlow(true);
      setInvitationToken(invite);
    }
    if (invitedEmail) setEmail(invitedEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(email, password, fullName, companyName, invitationToken.trim() || undefined);
      toast.success(isInviteFlow ? "Cuenta creada. Revisa tu email para confirmar el acceso." : t("auth.accountCreatedVerifyEmail"));
    } catch (err: any) {
      toast.error(err.message || t("auth.signUpFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">
          {isInviteFlow ? "Aceptar invitación" : t("auth.createAccount")}
        </CardTitle>
        <CardDescription>
          {isInviteFlow ? "Crea tu contraseña para unirte al workspace de Corevix CRM." : t("auth.startTrial")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isInviteFlow && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="font-extrabold">Invitación detectada</p>
              <p className="mt-1 text-xs font-medium text-blue-800/80">
                El email y el token ya vienen protegidos en el enlace. Solo completa tus datos.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t("auth.fullName")}</Label>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {!isInviteFlow && (
            <div className="space-y-1.5">
              <Label>{t("auth.companyName")}</Label>
              <Input
                placeholder="My Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}

          {!isInviteFlow && (
            <div className="space-y-1.5">
              <Label>Invitation Token (optional)</Label>
              <Input
                placeholder="Paste token from your admin"
                value={invitationToken}
                onChange={(e) => setInvitationToken(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isInviteFlow}
              className={isInviteFlow ? "bg-muted/50" : undefined}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.password")}</Label>
            <Input
              type="password"
              placeholder={t("auth.passwordMinChars")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("auth.creatingAccount") : isInviteFlow ? "Crear cuenta y unirme" : t("auth.createAccount")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
