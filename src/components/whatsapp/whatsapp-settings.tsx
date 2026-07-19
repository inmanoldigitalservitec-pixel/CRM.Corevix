import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface WhatsAppSettingsProps {
  className?: string;
}

type CompanyWhatsappSettingsRow = {
  id: string;
  company_id: string;
  provider: string;
  meta_app_id?: string | null;
  phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  business_phone: string | null;
  webhook_url: string | null;
  bot_api_url: string | null;
  verify_token: string | null;
  is_connected: boolean;
  connection_status: string;
  last_verified_at: string | null;
  last_error: string | null;
  last_event_at: string | null;
  meta_graph_version: string | null;
  subscribed_fields: unknown;
  created_at: string;
  updated_at: string;
};

const DEFAULTS = {
  provider: "meta",
  meta_app_id: "",
  phone_number_id: "",
  whatsapp_business_account_id: "",
  business_phone: "",
  webhook_url: "https://chat.corevix.agency/webhooks/whatsapp",
  bot_api_url: "https://chat.corevix.agency",
  verify_token: "",
  is_connected: false,
  connection_status: "not_configured",
  last_verified_at: null as string | null,
  last_error: null as string | null,
  last_event_at: null as string | null,
  meta_graph_version: "v22.0",
  subscribed_fields: ["messages"] as string[],
};

const SUBSCRIBED_FIELD_OPTIONS = [
  "messages",
  "message_deliveries",
  "message_reads",
  "messaging_postbacks",
] as const;

export function WhatsAppSettings({ className }: WhatsAppSettingsProps) {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...DEFAULTS });
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [secretsMeta, setSecretsMeta] = useState<{
    accessTokenConfigured: boolean;
    accessTokenLast4: string | null;
    appSecretConfigured: boolean;
    appSecretLast4: string | null;
  } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    qualityRating: string | null;
  } | null>(null);

  const connected = Boolean(form.is_connected) || form.connection_status === "connected";
  const webhookUrl = form.webhook_url || DEFAULTS.webhook_url;

  const subscribedFields = useMemo(() => {
    const raw = form.subscribed_fields;
    if (Array.isArray(raw)) return raw.map((x) => String(x));
    return [];
  }, [form.subscribed_fields]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const db = supabase as any;
      const { data, error } = await db
        .from("company_whatsapp_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(error.message || "No se pudo cargar la configuración de WhatsApp");
        setForm({ ...DEFAULTS });
        setRowId(null);
        setLoading(false);
        return;
      }
      const row = (data as CompanyWhatsappSettingsRow | null) ?? null;
      if (!row) {
        setForm({ ...DEFAULTS });
        setRowId(null);
        setLoading(false);
        return;
      }

      setRowId(row.id);
      setForm({
        provider: row.provider ?? DEFAULTS.provider,
        meta_app_id: row.meta_app_id ?? "",
        phone_number_id: row.phone_number_id ?? "",
        whatsapp_business_account_id: row.whatsapp_business_account_id ?? "",
        business_phone: row.business_phone ?? "",
        webhook_url: row.webhook_url ?? DEFAULTS.webhook_url,
        bot_api_url: row.bot_api_url ?? DEFAULTS.bot_api_url,
        verify_token: row.verify_token ?? "",
        is_connected: Boolean(row.is_connected),
        connection_status: row.connection_status ?? DEFAULTS.connection_status,
        last_verified_at: row.last_verified_at,
        last_error: row.last_error,
        last_event_at: row.last_event_at,
        meta_graph_version: row.meta_graph_version ?? DEFAULTS.meta_graph_version,
        subscribed_fields: Array.isArray(row.subscribed_fields)
          ? (row.subscribed_fields as any[]).map((x) => String(x))
          : DEFAULTS.subscribed_fields,
      });
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSecretsMeta() {
      if (!companyId) return;
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-credentials-metadata", {
          body: {},
        });
        if (cancelled) return;
        if (error) throw error;
        if (!(data as any)?.ok && !(data as any)?.success) return;
        setSecretsMeta({
          accessTokenConfigured: Boolean((data as any)?.accessTokenConfigured),
          accessTokenLast4: (data as any)?.accessTokenLast4 ?? null,
          appSecretConfigured: Boolean((data as any)?.appSecretConfigured),
          appSecretLast4: (data as any)?.appSecretLast4 ?? null,
        });
      } catch {
        // ignore: metadata is optional, and we don't want to block settings UI
      }
    }
    void loadSecretsMeta();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const saveConfig = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const accessTokenClean = accessToken.trim();
      const appSecretClean = appSecret.trim();

      const { data, error } = await supabase.functions.invoke("whatsapp-save-credentials", {
        body: {
          metaAppId: form.meta_app_id.trim() || undefined,
          phoneNumberId: form.phone_number_id.trim() || undefined,
          wabaId: form.whatsapp_business_account_id.trim() || undefined,
          businessPhone: form.business_phone.trim() || undefined,
          webhookUrl: form.webhook_url.trim() || undefined,
          botApiUrl: form.bot_api_url.trim() || undefined,
          verifyToken: form.verify_token.trim() || undefined,
          metaGraphVersion:
            (form.meta_graph_version || DEFAULTS.meta_graph_version).trim() || undefined,
          subscribedFields: subscribedFields.length ? subscribedFields : DEFAULTS.subscribed_fields,
          ...(accessTokenClean ? { accessToken: accessTokenClean } : {}),
          ...(appSecretClean ? { appSecret: appSecretClean } : {}),
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok && !(data as any)?.success) {
        throw new Error((data as any)?.error || "No se pudo guardar la configuración");
      }

      // Nunca mantenemos secretos en UI después de guardar
      setAccessToken("");
      setAppSecret("");

      const returnedSettings = (data as any)?.settings ?? null;
      if (returnedSettings) {
        setForm((p) => ({
          ...p,
          provider: returnedSettings.provider ?? p.provider,
          meta_app_id: returnedSettings.metaAppId ?? p.meta_app_id,
          phone_number_id: returnedSettings.phoneNumberId ?? p.phone_number_id,
          whatsapp_business_account_id: returnedSettings.wabaId ?? p.whatsapp_business_account_id,
          business_phone: returnedSettings.businessPhone ?? p.business_phone,
          webhook_url: returnedSettings.webhookUrl ?? p.webhook_url,
          bot_api_url: returnedSettings.botApiUrl ?? p.bot_api_url,
          verify_token: returnedSettings.verifyToken ?? p.verify_token,
          meta_graph_version: returnedSettings.metaGraphVersion ?? p.meta_graph_version,
          subscribed_fields: Array.isArray(returnedSettings.subscribedFields)
            ? returnedSettings.subscribedFields
            : p.subscribed_fields,
        }));
      }

      const returnedSecrets = (data as any)?.secrets ?? null;
      if (returnedSecrets) {
        setSecretsMeta({
          accessTokenConfigured: Boolean(returnedSecrets.accessTokenConfigured),
          accessTokenLast4: returnedSecrets.accessTokenLast4 ?? null,
          appSecretConfigured: Boolean(returnedSecrets.appSecretConfigured),
          appSecretLast4: returnedSecrets.appSecretLast4 ?? null,
        });
      }

      toast.success("Configuración de WhatsApp guardada");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar la configuración de WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!companyId) return;
    setTestingConnection(true);
    setTestError(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-test-connection", {
        body: {},
      });
      if (error) throw error;

      if (!(data as any)?.ok && !(data as any)?.success) {
        throw new Error((data as any)?.error || "No se pudo probar la conexión");
      }

      const nowIso = new Date().toISOString();
      setForm((p) => ({
        ...p,
        is_connected: true,
        connection_status: "connected",
        last_verified_at: nowIso,
        last_error: null,
        business_phone: (data as any)?.displayPhoneNumber ?? p.business_phone,
      }));

      setTestResult({
        displayPhoneNumber: (data as any)?.displayPhoneNumber ?? null,
        verifiedName: (data as any)?.verifiedName ?? null,
        qualityRating: (data as any)?.qualityRating ?? null,
      });

      toast.success((data as any)?.message || "Conexión verificada correctamente");
    } catch (e: any) {
      const message = e?.message || "No se pudo probar la conexión";
      const nowIso = new Date().toISOString();
      setForm((p) => ({
        ...p,
        is_connected: false,
        connection_status: "error",
        last_verified_at: nowIso,
        last_error: message,
      }));
      setTestError(message);
      setTestResult(null);
      toast.error(message);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs defaultValue="connection">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border border-slate-200 bg-white p-1 shadow-none">
          <TabsTrigger value="connection">Conexión API</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
        </TabsList>

        {/* API Connection Tab */}
        <TabsContent value="connection" className="mt-4 space-y-4">
          {/* Status card */}
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Estado de conexión</CardTitle>
                  <CardDescription>Integración de Meta WhatsApp Cloud API</CardDescription>
                </div>
                {connected ? (
                  <Badge className="gap-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <XCircle className="h-3 w-3" /> No conectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            {connected && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="border border-slate-200 bg-white p-3">
                    <span className="text-muted-foreground">Número</span>
                    <p className="font-semibold mt-0.5">
                      {testResult?.displayPhoneNumber || form.business_phone || "—"}
                    </p>
                  </div>
                  <div className="border border-slate-200 bg-white p-3">
                    <span className="text-muted-foreground">Nombre visible</span>
                    <p className="font-semibold mt-0.5">
                      {testResult?.verifiedName || "WhatsApp Cloud API"}
                    </p>
                  </div>
                  <div className="border border-slate-200 bg-white p-3">
                    <span className="text-muted-foreground">Calidad</span>
                    <p className="font-semibold mt-0.5 text-blue-700">
                      {testResult?.qualityRating || "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* API credentials */}
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Credenciales API
              </CardTitle>
              <CardDescription>
                Las credenciales se guardan como secretos cifrados. Los valores no se exponen en el
                frontend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Meta App ID</Label>
                  <Input
                    placeholder="Enter your Meta App ID"
                    className="mt-1"
                    value={form.meta_app_id}
                    onChange={(e) => setForm((p) => ({ ...p, meta_app_id: e.target.value }))}
                    disabled={loading || saving}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Este valor se guarda en configuración (no es secreto).
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Phone Number ID</Label>
                  <Input
                    placeholder="Enter your Phone Number ID"
                    className="mt-1"
                    value={form.phone_number_id}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number_id: e.target.value }))}
                    disabled={loading || saving}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">WhatsApp Business Account ID</Label>
                <Input
                  placeholder="Enter your WABA ID"
                  className="mt-1"
                  value={form.whatsapp_business_account_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, whatsapp_business_account_id: e.target.value }))
                  }
                  disabled={loading || saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Teléfono del negocio</Label>
                  <Input
                    placeholder="+1 809..."
                    className="mt-1"
                    value={form.business_phone}
                    onChange={(e) => setForm((p) => ({ ...p, business_phone: e.target.value }))}
                    disabled={loading || saving}
                  />
                </div>
                <div>
                  <Label className="text-xs">Bot API URL</Label>
                  <Input
                    placeholder="https://chat.corevix.agency"
                    className="mt-1"
                    value={form.bot_api_url}
                    onChange={(e) => setForm((p) => ({ ...p, bot_api_url: e.target.value }))}
                    disabled={loading || saving}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Token permanente de acceso</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showToken ? "text" : "password"}
                      placeholder={
                        secretsMeta?.accessTokenConfigured ? "Reemplazar token…" : "Pegar token…"
                      }
                      className="pr-10"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      disabled={loading || saving}
                    />
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowToken(!showToken)}
                      type="button"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {secretsMeta?.accessTokenConfigured
                    ? `Token configurado ${secretsMeta.accessTokenLast4 ? `••••${secretsMeta.accessTokenLast4}` : ""} · Pega uno nuevo para reemplazarlo`
                    : "El token se guarda como secreto. No se puede volver a ver desde el frontend."}
                </p>
              </div>

              <div>
                <Label className="text-xs">App Secret (opcional)</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showSecret ? "text" : "password"}
                      placeholder={
                        secretsMeta?.appSecretConfigured
                          ? "Reemplazar App Secret…"
                          : "Pegar App Secret…"
                      }
                      className="pr-10"
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      disabled={loading || saving}
                    />
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecret(!showSecret)}
                      type="button"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {secretsMeta?.appSecretConfigured
                    ? `App Secret configurado ${secretsMeta.appSecretLast4 ? `••••${secretsMeta.appSecretLast4}` : ""} · Pega uno nuevo para reemplazarlo`
                    : "Se guarda como secreto. No se puede volver a ver desde el frontend."}
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={saveConfig} disabled={loading || saving || !companyId}>
                  {saving ? "Guardando..." : "Guardar configuración"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={testConnection}
                  disabled={
                    loading ||
                    saving ||
                    testingConnection ||
                    !companyId ||
                    !form.phone_number_id.trim()
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {testingConnection ? "Probando conexión…" : "Probar conexión"}
                </Button>
              </div>
              {(testError || form.last_error) && (
                <div className="text-xs text-destructive">{testError || form.last_error}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="mt-4 space-y-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuración de Webhook</CardTitle>
              <CardDescription>
                Configure this webhook URL in your Meta App dashboard to receive messages and status
                updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Webhook Callback URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs bg-white" />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Copy this URL and paste it in your Meta App → WhatsApp → Configuration → Callback
                  URL
                </p>
              </div>

              <div>
                <Label className="text-xs">Verify Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Enter a custom verify token"
                    value={form.verify_token}
                    onChange={(e) => setForm((p) => ({ ...p, verify_token: e.target.value }))}
                    disabled={loading || saving}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  This token must match the one in your Meta App webhook configuration
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-xs mb-2 block">Subscribed Fields</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSCRIBED_FIELD_OPTIONS.map((field) => (
                    <div
                      key={field}
                      className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2"
                    >
                      <Switch
                        checked={subscribedFields.includes(field)}
                        onCheckedChange={(checked) => {
                          setForm((p) => {
                            const prev = new Set(subscribedFields);
                            if (checked) prev.add(field);
                            else prev.delete(field);
                            return { ...p, subscribed_fields: Array.from(prev) };
                          });
                        }}
                        disabled={loading || saving}
                      />
                      <span className="text-xs font-mono">{field}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <Button onClick={saveConfig} disabled={loading || saving || !companyId}>
                  {saving ? "Guardando..." : "Guardar configuración"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  {form.last_verified_at
                    ? `Última verificación: ${new Date(form.last_verified_at).toLocaleString()}`
                    : "Sin verificación aún"}
                  {form.last_error ? ` · Error: ${form.last_error}` : ""}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup guide */}
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardContent className="pt-4">
              <h4 className="text-sm font-semibold mb-2">Guía rápida</h4>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>
                  Go to <span className="font-medium text-foreground">Meta for Developers</span> →
                  Your App → WhatsApp → Configuration
                </li>
                <li>
                  Paste the <span className="font-medium text-foreground">Callback URL</span> above
                </li>
                <li>
                  Enter the same <span className="font-medium text-foreground">Verify Token</span>{" "}
                  you set here
                </li>
                <li>
                  Subscribe to the <span className="font-medium text-foreground">messages</span>{" "}
                  webhook field
                </li>
                <li>
                  Click <span className="font-medium text-foreground">Verify and save</span>
                </li>
              </ol>
              <Button variant="link" className="text-xs p-0 h-auto mt-2 gap-1">
                <ExternalLink className="h-3 w-3" /> View full documentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Plantillas de mensaje
                  </CardTitle>
                  <CardDescription>Administra las plantillas aprobadas de WhatsApp</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" disabled>
                    <RefreshCw className="h-3 w-3" /> Sync from Meta
                  </Button>
                  <Button size="sm" className="gap-1 text-xs" disabled>
                    <Plus className="h-3 w-3" /> New Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-slate-200 bg-white px-3 py-3 text-sm text-muted-foreground">
                La sincronización de templates con Meta se configurará en la siguiente fase.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment Rules Tab */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reglas de asignación</CardTitle>
              <CardDescription>
                Configure how new incoming conversations are assigned to team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-slate-200 bg-white px-3 py-3 text-sm text-muted-foreground">
                Las automatizaciones por estado / reglas de asignación se configurarán en una fase
                posterior.
              </div>
              <div>
                <Label className="text-xs">Assignment Strategy</Label>
                <Select defaultValue="round-robin" disabled>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round-robin">Round Robin — distribute evenly</SelectItem>
                    <SelectItem value="least-busy">
                      Least Busy — assign to agent with fewest open chats
                    </SelectItem>
                    <SelectItem value="manual">Manual — leave unassigned for pickup</SelectItem>
                    <SelectItem value="specific">
                      Specific Agent — always assign to one person
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Auto-reply when unassigned</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Switch defaultChecked disabled />
                  <span className="text-xs text-muted-foreground">
                    Send an automatic reply when no agent is available
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Auto-reply message</Label>
                <Input
                  className="mt-1"
                  defaultValue="Thank you for reaching out! A team member will respond shortly."
                  disabled
                />
              </div>

              <Separator />

              <div>
                <Label className="text-xs">Business Hours</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Start Time</Label>
                    <Input type="time" defaultValue="08:00" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">End Time</Label>
                    <Input type="time" defaultValue="18:00" className="mt-1" disabled />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Outside hours auto-reply</Label>
                <Input
                  className="mt-1"
                  defaultValue="We're currently outside business hours (Mon-Fri 8am-6pm). We'll get back to you first thing!"
                  disabled
                />
              </div>

              <Button disabled>Save Rules</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
