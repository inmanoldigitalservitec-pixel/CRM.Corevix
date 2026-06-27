import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign In — Corevix CRM" }] }),
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const { t } = useT();

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="/corevix-logo.svg" alt="Corevix" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Corevix CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.brandTagline")}</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite") || params.get("token") || "";
    const invitedEmail = params.get("email") || "";
    if (invite && !invitationToken) setInvitationToken(invite);
    if (invitedEmail && !email) setEmail(invitedEmail);
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
      toast.success(t("auth.accountCreatedVerifyEmail"));
    } catch (err: any) {
      toast.error(err.message || t("auth.signUpFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">{t("auth.createAccount")}</CardTitle>
        <CardDescription>{t("auth.startTrial")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("auth.fullName")}</Label>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.companyName")}</Label>
            <Input
              placeholder="My Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Invitation Token (optional)</Label>
            <Input
              placeholder="Paste token from your admin"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
            />
          </div>
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
              placeholder={t("auth.passwordMinChars")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
