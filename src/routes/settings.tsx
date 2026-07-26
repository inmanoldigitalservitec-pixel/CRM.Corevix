import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WhatsAppSettings } from "@/components/whatsapp/whatsapp-settings";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/use-permissions";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  CURRENCY_OPTIONS,
  DEFAULT_COMPANY_CURRENCY_SETTINGS,
  normalizeCurrency,
  type CurrencyCode,
} from "@/lib/currency";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Corevix CRM" }] }),
});

type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "collaborator" | "viewer";
type ModuleKey =
  | "leads"
  | "clients"
  | "deals"
  | "tasks"
  | "projects"
  | "proposals"
  | "invoices"
  | "whatsapp"
  | "email"
  | "automations"
  | "settings"
  | "team"
  | "reports";

type PermissionRow = {
  id?: string;
  company_id: string;
  role: AppRole;
  module: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_assign: boolean;
};

type DriveSettingsRow = {
  id: string;
  company_id: string;
  client_id: string | null;
  client_secret_encrypted: string | null;
  redirect_uri: string | null;
  scopes: string | null;
  root_folder_id: string | null;
  root_folder_url: string | null;
  is_enabled: boolean;
  updated_at: string | null;
};

type DriveConnectionRow = {
  id: string;
  company_id: string;
  user_id: string;
  google_email: string | null;
  connected_at: string | null;
  updated_at: string | null;
};

type GmailSettingsRow = {
  id: string;
  company_id: string;
  client_id: string | null;
  client_secret_encrypted: string | null;
  redirect_uri: string | null;
  scopes: string | null;
  is_enabled: boolean;
  updated_at: string | null;
};

type GeminiSettingsRow = {
  id: string;
  company_id: string;
  api_key_encrypted: string | null;
  model: string | null;
  system_prompt: string | null;
  is_enabled: boolean;
  updated_at: string | null;
};

type CurrencySettingsRow = {
  company_id: string;
  base_currency: CurrencyCode | string | null;
  usd_to_dop_rate: number | string | null;
  rate_source: string | null;
  rate_updated_at: string | null;
  updated_at: string | null;
};

type TaxType = "sales" | "withholding" | "other";

type CompanyTaxRow = {
  id: string;
  company_id: string;
  name: string;
  rate: number | string;
  tax_type: TaxType | string;
  is_active: boolean;
  is_default: boolean;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TaxFormState = {
  id: string | null;
  name: string;
  rate: string;
  tax_type: TaxType;
  is_active: boolean;
  is_default: boolean;
  description: string;
};

const DEFAULT_CURRENCY_SETTINGS = {
  base_currency: DEFAULT_COMPANY_CURRENCY_SETTINGS.baseCurrency as CurrencyCode,
  usd_to_dop_rate: String(DEFAULT_COMPANY_CURRENCY_SETTINGS.usdToDopRate),
  rate_source: DEFAULT_COMPANY_CURRENCY_SETTINGS.rateSource,
  rate_updated_at: "",
};

const DEFAULT_TAX_FORM: TaxFormState = {
  id: null,
  name: "",
  rate: "18",
  tax_type: "sales",
  is_active: true,
  is_default: false,
  description: "",
};

async function getEdgeFunctionErrorMessage(error: unknown, data: unknown, fallback: string) {
  let message = String(
    (data as any)?.error || (data as any)?.message || (error as any)?.message || fallback,
  );

  const context = (error as any)?.context;
  if (context && typeof context.json === "function") {
    try {
      const body =
        typeof context.clone === "function" ? await context.clone().json() : await context.json();
      message = String(body?.error || body?.message || message);
    } catch {
      // keep fallback
    }
  }

  return message;
}

function MetaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 24c4-14 9-21 14-21 5 0 8 7 12 14 4 7 7 14 12 14 5 0 10-7 14-21"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 24c2.5-7 5-11 8-11 3.5 0 6 4 10 11 4 7 7 11 10 11 3 0 5.5-4 8-11 2.5-7 5-11 8-11 3 0 5.5 4 8 11"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoSettingsAccess() {
  useEffect(() => {
    toast.error("No tienes permiso para acceder a Settings");
  }, []);
  return <Navigate to="/dashboard" />;
}

function formatSettingsDate(value?: string | null) {
  if (!value) return "Sin cambios registrados";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin cambios registrados";
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTaxTypeLabel(type?: string | null) {
  if (type === "withholding") return "Retención";
  if (type === "other") return "Otro";
  return "Venta";
}

function formatTaxRate(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "0%";
  return `${parsed.toLocaleString("es-DO", {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 4,
  })}%`;
}

function SettingsPage() {
  const { can } = usePermissions();
  const { profile, user, loading: authLoading } = useAuth();

  const db = supabase as any;
  const companyId = profile?.company_id || null;
  const profileId = profile?.id || null;
  const authUserId = profile?.user_id || user?.id || null;

  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    tax_id: "",
    logo_url: "",
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencyForm, setCurrencyForm] = useState(DEFAULT_CURRENCY_SETTINGS);
  const [taxes, setTaxes] = useState<CompanyTaxRow[]>([]);
  const [taxesLoading, setTaxesLoading] = useState(false);
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxFormOpen, setTaxFormOpen] = useState(false);
  const [taxForm, setTaxForm] = useState<TaxFormState>(DEFAULT_TAX_FORM);

  const roleOptions: AppRole[] = [
    "super_admin",
    "admin",
    "manager",
    "sales_agent",
    "collaborator",
    "viewer",
  ];
  const modules: Array<{ key: ModuleKey; label: string }> = [
    { key: "leads", label: "Leads" },
    { key: "clients", label: "Clients" },
    { key: "deals", label: "Deals" },
    { key: "tasks", label: "Tasks" },
    { key: "projects", label: "Projects" },
    { key: "proposals", label: "Proposals" },
    { key: "invoices", label: "Invoices" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "email", label: "Email" },
    { key: "automations", label: "Automations" },
    { key: "reports", label: "Reports" },
    { key: "team", label: "Team" },
    { key: "settings", label: "Settings" },
  ];

  const [permRole, setPermRole] = useState<AppRole>("manager");
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionRows, setPermissionRows] = useState<Record<ModuleKey, PermissionRow>>({} as any);

  const [gmailAccount, setGmailAccount] = useState<{
    id: string;
    email_address: string;
    last_synced_at: string | null;
  } | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSettingsLoading, setGmailSettingsLoading] = useState(false);
  const [gmailBanner, setGmailBanner] = useState<"connected" | "error" | null>(null);
  const [gmailSecretConfigured, setGmailSecretConfigured] = useState(false);
  const [gmailForm, setGmailForm] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "http://localhost:54321/functions/v1/gmail-oauth-callback",
    scopes:
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
    is_enabled: false,
  });
  const [gmailAdvancedOpen, setGmailAdvancedOpen] = useState(false);
  const [driveBanner, setDriveBanner] = useState<"connected" | "error" | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveConnectionLoading, setDriveConnectionLoading] = useState(false);
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveConnection, setDriveConnection] = useState<DriveConnectionRow | null>(null);
  const [driveSecretConfigured, setDriveSecretConfigured] = useState(false);
  const [driveForm, setDriveForm] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "https://crm.corevix.agency/google-drive-callback",
    scopes: "https://www.googleapis.com/auth/drive.file",
    root_folder_id: "",
    root_folder_url: "",
    is_enabled: false,
  });

  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiSecretConfigured, setGeminiSecretConfigured] = useState(false);
  const [geminiForm, setGeminiForm] = useState({
    api_key: "",
    model: "gemini-1.5-pro",
    system_prompt:
      "Eres el asistente del CRM Corevix. Responde de forma concisa y accionable. Si no tienes datos suficientes, pregunta por lo mínimo necesario. No inventes cifras.",
    is_enabled: false,
  });
  const [metaWhatsappConfigured, setMetaWhatsappConfigured] = useState(false);

  const loadMetaWhatsappStatus = async () => {
    if (!companyId) return;
    const { data, error } = await db
      .from("company_whatsapp_settings")
      .select("is_connected,connection_status,phone_number_id,whatsapp_business_account_id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error || !data) {
      setMetaWhatsappConfigured(false);
      return;
    }
    const row = data as {
      is_connected?: boolean | null;
      connection_status?: string | null;
      phone_number_id?: string | null;
      whatsapp_business_account_id?: string | null;
    };
    const configured =
      Boolean(row.is_connected) ||
      row.connection_status === "connected" ||
      Boolean(row.phone_number_id) ||
      Boolean(row.whatsapp_business_account_id);
    setMetaWhatsappConfigured(configured);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const gmail = params.get("gmail");
    if (gmail === "connected") setGmailBanner("connected");
    if (gmail === "error") setGmailBanner("error");
    const drive = params.get("drive");
    if (drive === "connected") {
      setDriveBanner("connected");
      window.setTimeout(() => {
        void loadDriveConnection();
      }, 500);
    }
    if (drive === "error") setDriveBanner("error");
  }, []);

  const loadGmailAccount = async () => {
    if (!profileId && !authUserId) return;
    setGmailLoading(true);
    // Some schemas store email_accounts.user_id as profiles.id; others store auth.users.id.
    const tryLoad = async (userId: string) =>
      db
        .from("email_accounts")
        .select("id, email_address, last_synced_at, is_active, provider")
        .eq("provider", "gmail")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    let data: any = null;
    let error: any = null;
    if (profileId) {
      ({ data, error } = await tryLoad(profileId));
    }
    if (!data && authUserId) {
      const r = await tryLoad(authUserId);
      data = r.data;
      error = r.error;
    }
    if (error && !data) {
      setGmailLoading(false);
      return;
    }
    setGmailAccount(
      data
        ? { id: data.id, email_address: data.email_address, last_synced_at: data.last_synced_at }
        : null,
    );
    setGmailLoading(false);
  };

  const loadGmailSettings = async () => {
    if (!companyId) return;
    setGmailSettingsLoading(true);
    const { data, error } = await db
      .from("gmail_settings")
      .select(
        "id,company_id,client_id,client_secret_encrypted,redirect_uri,scopes,is_enabled,updated_at",
      )
      .eq("company_id", companyId)
      .maybeSingle();
    setGmailSettingsLoading(false);
    if (error) return;
    const row = (data as GmailSettingsRow | null) || null;
    if (!row) return;
    setGmailForm({
      client_id: row.client_id || "",
      client_secret: "",
      redirect_uri: row.redirect_uri || "http://localhost:54321/functions/v1/gmail-oauth-callback",
      scopes:
        row.scopes ||
        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
      is_enabled: !!row.is_enabled,
    });
    setGmailSecretConfigured(!!row.client_secret_encrypted);
  };

  useEffect(() => {
    void loadGmailSettings();
    void loadGmailAccount();
  }, [companyId, profileId, authUserId]);

  useEffect(() => {
    void loadMetaWhatsappStatus();
  }, [companyId]);

  const saveGmailSettings = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar Gmail.");
      return;
    }

    const payload: Record<string, any> = {
      company_id: companyId,
      client_id: gmailForm.client_id.trim() || null,
      redirect_uri: gmailForm.redirect_uri.trim() || null,
      scopes:
        gmailForm.scopes.trim() ||
        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
      is_enabled: !!gmailForm.is_enabled,
      updated_by: authUserId || null,
    };

    const newSecret = gmailForm.client_secret.trim();
    if (newSecret) payload.client_secret_encrypted = newSecret;

    const { error } = await db.from("gmail_settings").upsert(payload, { onConflict: "company_id" });
    if (error) {
      toast.error(error.message || "No se pudo guardar Gmail API.");
      return;
    }
    setGmailSecretConfigured(gmailSecretConfigured || !!newSecret);
    setGmailForm((prev) => ({ ...prev, client_secret: "" }));
    toast.success("Configuración de Gmail guardada.");
  };

  const loadDriveSettings = async () => {
    if (!companyId) return;
    setDriveLoading(true);
    const { data, error } = await db
      .from("drive_settings")
      .select(
        "id,company_id,client_id,client_secret_encrypted,redirect_uri,scopes,root_folder_id,root_folder_url,is_enabled,updated_at",
      )
      .eq("company_id", companyId)
      .maybeSingle();
    setDriveLoading(false);
    if (error) return;
    const row = (data as DriveSettingsRow | null) || null;
    if (!row) return;
    setDriveForm({
      client_id: row.client_id || "",
      client_secret: "",
      redirect_uri: row.redirect_uri || "http://localhost:54321/functions/v1/google-drive-callback",
      scopes: row.scopes || "https://www.googleapis.com/auth/drive.file",
      root_folder_id: row.root_folder_id || "",
      root_folder_url: row.root_folder_url || "",
      is_enabled: !!row.is_enabled,
    });
    setDriveSecretConfigured(!!row.client_secret_encrypted);
  };

  const loadDriveConnection = async () => {
    if (!companyId || !authUserId) return;
    setDriveConnectionLoading(true);
    const { data, error } = await db
      .from("drive_connections")
      .select("id,company_id,user_id,google_email,connected_at,updated_at")
      .eq("company_id", companyId)
      .eq("user_id", authUserId)
      .maybeSingle();
    setDriveConnectionLoading(false);
    if (error) {
      toast.error(error.message || "No se pudo verificar la conexión de Google Drive.");
      return;
    }
    const directConnection = (data as DriveConnectionRow | null) || null;
    if (directConnection?.id) {
      setDriveConnection(directConnection);
      return;
    }
    const verified = await verifyDriveConnection(false);
    if (!verified) setDriveConnection(null);
  };

  useEffect(() => {
    void loadDriveSettings();
    void loadDriveConnection();
  }, [companyId, authUserId]);

  const loadGeminiSettings = async () => {
    if (!companyId) return;
    setGeminiLoading(true);
    const { data, error } = await db
      .from("gemini_settings")
      .select("id,company_id,api_key_encrypted,model,system_prompt,is_enabled,updated_at")
      .eq("company_id", companyId)
      .maybeSingle();
    setGeminiLoading(false);
    if (error) return;
    const row = (data as GeminiSettingsRow | null) || null;
    if (!row) return;
    setGeminiForm({
      api_key: "",
      model: row.model || "gemini-1.5-pro",
      system_prompt:
        row.system_prompt ||
        "Eres el asistente del CRM Corevix. Responde de forma concisa y accionable. Si no tienes datos suficientes, pregunta por lo mínimo necesario. No inventes cifras.",
      is_enabled: !!row.is_enabled,
    });
    setGeminiSecretConfigured(!!row.api_key_encrypted);
  };

  useEffect(() => {
    void loadGeminiSettings();
  }, [companyId]);

  const saveGeminiSettings = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar AI / Gemini.");
      return;
    }

    const payload: Record<string, any> = {
      company_id: companyId,
      model: geminiForm.model.trim() || null,
      system_prompt: geminiForm.system_prompt.trim() || null,
      is_enabled: !!geminiForm.is_enabled,
      updated_by: authUserId || null,
    };

    const newKey = geminiForm.api_key.trim();
    if (newKey) payload.api_key_encrypted = newKey;

    const { error } = await db
      .from("gemini_settings")
      .upsert(payload, { onConflict: "company_id" });
    if (error) {
      toast.error(error.message || "No se pudo guardar Gemini.");
      return;
    }
    setGeminiSecretConfigured(geminiSecretConfigured || !!newKey);
    setGeminiForm((prev) => ({ ...prev, api_key: "" }));
    toast.success("Configuración de Gemini guardada.");
  };

  const loadCurrencySettings = async () => {
    if (!companyId) return;
    setCurrencyLoading(true);
    const { data, error } = await db
      .from("company_currency_settings")
      .select("company_id,base_currency,usd_to_dop_rate,rate_source,rate_updated_at,updated_at")
      .eq("company_id", companyId)
      .maybeSingle();
    setCurrencyLoading(false);
    if (error) return;
    const row = (data as CurrencySettingsRow | null) || null;
    if (!row) {
      setCurrencyForm(DEFAULT_CURRENCY_SETTINGS);
      return;
    }
    setCurrencyForm({
      base_currency: normalizeCurrency(row.base_currency),
      usd_to_dop_rate:
        row.usd_to_dop_rate === null || row.usd_to_dop_rate === undefined
          ? DEFAULT_CURRENCY_SETTINGS.usd_to_dop_rate
          : String(row.usd_to_dop_rate),
      rate_source: row.rate_source || "manual",
      rate_updated_at: row.rate_updated_at || row.updated_at || "",
    });
  };

  useEffect(() => {
    void loadCurrencySettings();
  }, [companyId]);

  const saveCurrencySettings = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar moneda.");
      return;
    }

    const parsedRate = Number(currencyForm.usd_to_dop_rate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("La tasa debe ser mayor que cero.");
      return;
    }

    setCurrencySaving(true);
    const rateUpdatedAt = new Date().toISOString();
    const { error } = await db.from("company_currency_settings").upsert(
      {
        company_id: companyId,
        base_currency: currencyForm.base_currency,
        usd_to_dop_rate: parsedRate,
        rate_source: "manual",
        rate_updated_at: rateUpdatedAt,
        updated_by: authUserId || null,
      },
      { onConflict: "company_id" },
    );
    setCurrencySaving(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar la configuración de moneda.");
      return;
    }
    setCurrencyForm((prev) => ({ ...prev, rate_updated_at: rateUpdatedAt }));
    toast.success("Configuración de moneda guardada.");
  };

  const loadCompanyTaxes = async () => {
    if (!companyId) return;
    setTaxesLoading(true);
    const { data, error } = await db
      .from("company_taxes")
      .select(
        "id,company_id,name,rate,tax_type,is_active,is_default,description,created_at,updated_at",
      )
      .eq("company_id", companyId)
      .order("tax_type", { ascending: true })
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });
    setTaxesLoading(false);
    if (error) {
      toast.error(error.message || "No se pudieron cargar los impuestos.");
      return;
    }
    setTaxes((data as CompanyTaxRow[]) || []);
  };

  useEffect(() => {
    void loadCompanyTaxes();
  }, [companyId]);

  const openNewTaxForm = () => {
    setTaxForm(DEFAULT_TAX_FORM);
    setTaxFormOpen(true);
  };

  const openEditTaxForm = (tax: CompanyTaxRow) => {
    setTaxForm({
      id: tax.id,
      name: tax.name || "",
      rate: String(tax.rate ?? 0),
      tax_type:
        tax.tax_type === "withholding" || tax.tax_type === "other" ? tax.tax_type : "sales",
      is_active: Boolean(tax.is_active),
      is_default: Boolean(tax.is_default),
      description: tax.description || "",
    });
    setTaxFormOpen(true);
  };

  const saveCompanyTax = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar impuestos.");
      return;
    }

    const name = taxForm.name.trim();
    const rate = Number(taxForm.rate);
    if (!name) {
      toast.error("El nombre del impuesto es obligatorio.");
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("El porcentaje debe estar entre 0 y 100.");
      return;
    }
    if (taxForm.is_default && !taxForm.is_active) {
      toast.error("Un impuesto predeterminado debe estar activo.");
      return;
    }

    setTaxSaving(true);
    const payload = {
      company_id: companyId,
      name,
      rate,
      tax_type: taxForm.tax_type,
      is_active: taxForm.is_active,
      is_default: taxForm.is_default,
      description: taxForm.description.trim() || null,
      updated_by: authUserId || null,
      ...(taxForm.id ? {} : { created_by: authUserId || null }),
    };

    if (taxForm.is_default) {
      const { error: defaultError } = await db
        .from("company_taxes")
        .update({ is_default: false, updated_by: authUserId || null })
        .eq("company_id", companyId)
        .eq("tax_type", taxForm.tax_type);
      if (defaultError) {
        setTaxSaving(false);
        toast.error(defaultError.message || "No se pudo actualizar el impuesto predeterminado.");
        return;
      }
    }

    const query = taxForm.id
      ? db.from("company_taxes").update(payload).eq("id", taxForm.id).eq("company_id", companyId)
      : db.from("company_taxes").insert(payload);
    const { error } = await query;
    setTaxSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar el impuesto.");
      return;
    }

    setTaxFormOpen(false);
    setTaxForm(DEFAULT_TAX_FORM);
    await loadCompanyTaxes();
    toast.success(taxForm.id ? "Impuesto actualizado." : "Impuesto creado.");
  };

  const toggleTaxActive = async (tax: CompanyTaxRow) => {
    if (!companyId || !can("settings.manage")) return;
    if (tax.is_default && tax.is_active) {
      toast.error("No puedes desactivar el impuesto predeterminado.");
      return;
    }
    const { error } = await db
      .from("company_taxes")
      .update({
        is_active: !tax.is_active,
        is_default: !tax.is_active ? tax.is_default : false,
        updated_by: authUserId || null,
      })
      .eq("id", tax.id)
      .eq("company_id", companyId);
    if (error) {
      toast.error(error.message || "No se pudo actualizar el estado del impuesto.");
      return;
    }
    await loadCompanyTaxes();
  };

  const markTaxAsDefault = async (tax: CompanyTaxRow) => {
    if (!companyId || !can("settings.manage")) return;
    if (!tax.is_active) {
      toast.error("Activa el impuesto antes de marcarlo como predeterminado.");
      return;
    }
    const { error: resetError } = await db
      .from("company_taxes")
      .update({ is_default: false, updated_by: authUserId || null })
      .eq("company_id", companyId)
      .eq("tax_type", tax.tax_type);
    if (resetError) {
      toast.error(resetError.message || "No se pudo actualizar el predeterminado.");
      return;
    }
    const { error } = await db
      .from("company_taxes")
      .update({ is_default: true, updated_by: authUserId || null })
      .eq("id", tax.id)
      .eq("company_id", companyId);
    if (error) {
      toast.error(error.message || "No se pudo marcar como predeterminado.");
      return;
    }
    await loadCompanyTaxes();
  };

  const hasTaxUsage = async (taxId: string) => {
    const checks = await Promise.all([
      db.from("invoice_items").select("id", { count: "exact", head: true }).eq("tax_id", taxId),
      db.from("proposal_items").select("id", { count: "exact", head: true }).eq("tax_id", taxId),
      db.from("estimates").select("id", { count: "exact", head: true }).eq("tax_id", taxId),
    ]);

    const firstError = checks.find((result) => result.error)?.error;
    if (firstError) throw firstError;
    return checks.some((result) => Number(result.count || 0) > 0);
  };

  const deleteOrDeactivateTax = async (tax: CompanyTaxRow) => {
    if (!companyId || !can("settings.manage")) return;
    if (tax.is_default) {
      toast.error("No puedes eliminar el impuesto predeterminado.");
      return;
    }
    const confirmed = window.confirm(
      `¿Quieres eliminar "${tax.name}"? Si ya está usado en documentos, se desactivará para conservar el historial.`,
    );
    if (!confirmed) return;

    try {
      const used = await hasTaxUsage(tax.id);
      if (used) {
        const { error } = await db
          .from("company_taxes")
          .update({ is_active: false, is_default: false, updated_by: authUserId || null })
          .eq("id", tax.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast.success("Impuesto usado en documentos: fue desactivado.");
      } else {
        const { error } = await db
          .from("company_taxes")
          .delete()
          .eq("id", tax.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast.success("Impuesto eliminado.");
      }
      await loadCompanyTaxes();
    } catch (error) {
      toast.error((error as any)?.message || "No se pudo eliminar el impuesto.");
    }
  };

  const connectGmail = async () => {
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para conectar Gmail.");
      return;
    }
    setGmailLoading(true);
    const redirectTo = `${window.location.origin}/settings`;
    const { data, error } = await supabase.functions.invoke("gmail-auth-url", {
      body: { redirectTo },
    });
    setGmailLoading(false);
    if (error) {
      toast.error(
        await getEdgeFunctionErrorMessage(error, data, "No se pudo iniciar la conexión de Gmail"),
      );
      return;
    }
    if ((data as any)?.error) {
      toast.error(String((data as any).error));
      return;
    }
    const url = (data as any)?.authUrl ? String((data as any).authUrl) : "";
    if (!url) {
      toast.error("No se recibió URL de autorización.");
      return;
    }
    toast.message("Redirigiendo a Google…");
    window.location.href = url;
  };

  const testGmailConnection = async () => {
    if (!gmailAccount) {
      toast.error("Conecta Gmail antes de probar.");
      return;
    }
    toast.success(`Gmail conectado: ${gmailAccount.email_address}`);
  };

  const syncGmail = async () => {
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para sincronizar Gmail.");
      return;
    }
    setGmailLoading(true);
    const { data, error } = await supabase.functions.invoke("sync-gmail", { body: { limit: 10 } });
    setGmailLoading(false);
    if (error || (data as any)?.error) {
      toast.error(await getEdgeFunctionErrorMessage(error, data, "No se pudo sincronizar Gmail"));
      return;
    }
    toast.success("Gmail sincronizado.");
    await loadGmailAccount();
  };

  const saveDriveSettings = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar Google Drive.");
      return;
    }

    const payload: Record<string, any> = {
      company_id: companyId,
      client_id: driveForm.client_id.trim() || null,
      redirect_uri: driveForm.redirect_uri.trim() || null,
      scopes: driveForm.scopes.trim() || "https://www.googleapis.com/auth/drive.file",
      root_folder_id: driveForm.root_folder_id.trim() || null,
      root_folder_url: driveForm.root_folder_url.trim() || null,
      is_enabled: !!driveForm.is_enabled,
      updated_by: authUserId || null,
    };

    const newSecret = driveForm.client_secret.trim();
    if (newSecret) payload.client_secret_encrypted = newSecret;

    const { error } = await db.from("drive_settings").upsert(payload, { onConflict: "company_id" });
    if (error) {
      toast.error(error.message || "No se pudo guardar Google Drive.");
      return;
    }
    setDriveSecretConfigured(driveSecretConfigured || !!newSecret);
    setDriveForm((prev) => ({ ...prev, client_secret: "" }));
    toast.success("Configuracion de Google Drive guardada.");
  };

  const connectDrive = async () => {
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para conectar Google Drive.");
      return;
    }
    const redirectTo = `${window.location.origin}/settings`;
    const { data, error } = await supabase.functions.invoke("google-drive-auth-url", {
      body: { redirectTo },
    });
    if (error) {
      toast.error(error.message || "No se pudo iniciar la conexion con Google Drive.");
      return;
    }
    if ((data as any)?.error) {
      toast.error(String((data as any).error));
      return;
    }
    const authUrl = (data as any)?.authUrl ? String((data as any).authUrl) : "";
    if (!authUrl) {
      toast.error("No se recibio URL de autorizacion.");
      return;
    }
    window.location.href = authUrl;
  };

  const verifyDriveConnection = async (showToast = true) => {
    try {
      setDriveTesting(true);
      const { data, error } = await supabase.functions.invoke("drive-test-connection", {
        body: {},
      });
      if (error) throw new Error(error.message || "No se pudo probar Google Drive.");
      if ((data as any)?.error) throw new Error(String((data as any).error));
      const payload = data as any;
      setDriveConnection({
        id: String(payload?.connection_id || "verified"),
        company_id: companyId || "",
        user_id: authUserId || "",
        google_email: payload?.google_email ? String(payload.google_email) : null,
        connected_at: null,
        updated_at: null,
      });
      if (showToast) toast.success("Google Drive respondió correctamente.");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo probar Google Drive.";
      if (showToast) toast.error(message);
      return false;
    } finally {
      setDriveTesting(false);
    }
  };

  const testDriveConnection = async () => {
    await verifyDriveConnection(true);
  };

  const disconnectDrive = async () => {
    if (!companyId || !authUserId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para desconectar Google Drive.");
      return;
    }
    const { error } = await db
      .from("drive_connections")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", authUserId);
    if (error) {
      toast.error(error.message || "No se pudo desconectar Google Drive.");
      return;
    }
    setDriveConnection(null);
    toast.success("Conexion de Google Drive eliminada.");
  };

  useEffect(() => {
    let cancelled = false;
    const loadCompany = async () => {
      if (!companyId) return;
      setCompanyLoading(true);
      const { data, error } = await db
        .from("companies")
        .select("company_name,tax_id,email,phone,address,city,country,website,logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        if (String((error as any)?.code || "") !== "PGRST116") {
          // ignore non-fatal company bootstrap errors silently to avoid noisy console output
        }
        setCompanyForm({
          company_name: "",
          website: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "",
          tax_id: "",
          logo_url: "",
        });
        setCompanyLoading(false);
        return;
      }
      setCompanyForm({
        company_name: data?.company_name || "",
        website: data?.website || "",
        email: data?.email || "",
        phone: data?.phone || "",
        address: data?.address || "",
        city: data?.city || "",
        country: data?.country || "",
        tax_id: data?.tax_id || "",
        logo_url: data?.logo_url || "",
      });
      setCompanyLoading(false);
    };
    void loadCompany();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    const loadPermissions = async () => {
      if (!companyId) return;
      setPermissionsLoading(true);
      const { data, error } = await db
        .from("permissions")
        .select(
          "id, company_id, role, module, can_view, can_create, can_edit, can_delete, can_assign",
        )
        .eq("company_id", companyId)
        .eq("role", permRole);
      if (cancelled) return;
      if (error) {
        setPermissionsLoading(false);
        return;
      }
      const map: Record<ModuleKey, PermissionRow> = {} as any;
      (data || []).forEach((row: PermissionRow) => {
        map[row.module] = row;
      });
      // Ensure all modules exist in UI state (even if DB row is missing)
      modules.forEach((m) => {
        if (!map[m.key]) {
          map[m.key] = {
            company_id: companyId,
            role: permRole,
            module: m.key,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
            can_assign: false,
          };
        }
      });
      setPermissionRows(map);
      setPermissionsLoading(false);
    };
    void loadPermissions();
    return () => {
      cancelled = true;
    };
  }, [companyId, permRole]);

  const saveCompany = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar la empresa");
      return;
    }
    const { error } = await db
      .from("companies")
      .update({
        company_name: companyForm.company_name.trim(),
        tax_id: companyForm.tax_id.trim() || null,
        email: companyForm.email.trim() || null,
        phone: companyForm.phone.trim() || null,
        address: companyForm.address.trim() || null,
        city: companyForm.city.trim() || null,
        country: companyForm.country.trim() || null,
        website: companyForm.website.trim() || null,
        logo_url: companyForm.logo_url.trim() || null,
      })
      .eq("id", companyId);
    if (error) toast.error(error.message || "No se pudo guardar");
    else toast.success("Empresa actualizada");
  };

  const togglePerm = (
    module: ModuleKey,
    key: keyof Omit<PermissionRow, "id" | "company_id" | "role" | "module">,
  ) => {
    setPermissionRows((prev: Record<ModuleKey, PermissionRow>) => ({
      ...prev,
      [module]: { ...prev[module], [key]: !prev[module][key] },
    }));
  };

  const savePermissions = async () => {
    if (!companyId) return;
    if (!can("settings.manage")) {
      toast.error("No tienes permiso para editar permisos");
      return;
    }
    const rows = Object.values(permissionRows) as PermissionRow[];
    const { error } = await db.from("permissions").upsert(
      rows.map((r: PermissionRow) => ({
        company_id: companyId,
        role: r.role,
        module: r.module,
        can_view: !!r.can_view,
        can_create: !!r.can_create,
        can_edit: !!r.can_edit,
        can_delete: !!r.can_delete,
        can_assign: !!r.can_assign,
      })),
      { onConflict: "company_id,role,module" },
    );
    if (error) toast.error(error.message || "No se pudieron guardar permisos");
    else toast.success("Permisos actualizados");
  };

  const permRowsForUi = useMemo(
    () => modules.map((m) => permissionRows[m.key]).filter(Boolean),
    [modules, permissionRows],
  );

  const canViewSettings = can("settings.view");

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Avoid redirecting before profile loads (prevents false "no permission" on first render).
  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (!canViewSettings) return <NoSettingsAccess />;

  return (
    <div data-corevix-settings className="min-h-dvh bg-white p-6 space-y-6">
      <style>{`
        [data-corevix-settings] [class*="shadow"] { box-shadow: none !important; }
        [data-corevix-settings] .rounded-2xl,
        [data-corevix-settings] .rounded-xl,
        [data-corevix-settings] .rounded-md {
          box-shadow: none !important;
        }
        [data-corevix-settings] input,
        [data-corevix-settings] textarea,
        [data-corevix-settings] button {
          box-shadow: none !important;
        }
        [data-corevix-settings] input:not([type="checkbox"]),
        [data-corevix-settings] textarea,
        [data-corevix-settings] button[role="combobox"] {
          border-color: rgb(226 232 240) !important;
          background-color: #fff !important;
        }
      `}</style>
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Configuración</h1>
        <p className="text-sm text-slate-500">Administra la configuración general del CRM.</p>
      </div>
      <Tabs defaultValue="company">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border border-slate-200 bg-white p-1 shadow-none">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="whatsapp">Meta</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="drive">Google Drive</TabsTrigger>
          <TabsTrigger value="currency">Moneda</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
          <TabsTrigger value="ai">AI / Gemini</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de la empresa</Label>
                  <Input
                    value={companyForm.company_name}
                    onChange={(e) =>
                      setCompanyForm((p) => ({ ...p, company_name: e.target.value }))
                    }
                    disabled={companyLoading}
                  />
                </div>
                <div>
                  <Label>Sitio web</Label>
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, website: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                  disabled={companyLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, city: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>

                <div>
                  <Label>País</Label>
                  <Input
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, country: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>
              </div>

              <div>
                <Label>RNC / Identificación fiscal</Label>
                <Input
                  value={companyForm.tax_id}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, tax_id: e.target.value }))}
                  disabled={companyLoading}
                />
              </div>

              <div>
                <Label>Logo</Label>
                <Input
                  value={companyForm.logo_url}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="URL o ruta del logo"
                  disabled={companyLoading}
                />
              </div>
              {can("settings.manage") && (
                <Button onClick={saveCompany} disabled={companyLoading}>
                  Guardar cambios
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo</Label>
                  <Input defaultValue="Admin User" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input defaultValue="admin@corevix.com" />
                </div>
              </div>
              <Separator />
              <div>
                <Label>Cambiar contraseña</Label>
                <Input type="password" placeholder="Nueva contraseña" />
              </div>
              <Button>Actualizar perfil</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <div className="space-y-4">
            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md border border-slate-200 bg-white p-1.5">
                      <MetaIcon className="h-4 w-7 text-[#0866ff]" />
                    </div>
                    <CardTitle className="text-base">Configuración de Meta</CardTitle>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Administra las integraciones de mensajería de Meta desde un solo lugar: WhatsApp,
                  Messenger e Instagram DM.
                </p>
              </CardHeader>
            </Card>

            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">WhatsApp Business API</CardTitle>
                <Badge variant={metaWhatsappConfigured ? "default" : "secondary"}>
                  {metaWhatsappConfigured ? "Activo" : "No configurado"}
                </Badge>
              </CardHeader>
              <CardContent>
                <WhatsAppSettings />
              </CardContent>
            </Card>

            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Facebook Messenger</CardTitle>
                <Badge variant="secondary">Pendiente</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Conecta una página de Facebook para recibir y responder mensajes de Messenger
                  desde el CRM.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>ID de página</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Token de acceso de página</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Token de verificación</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Webhook URL</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                </div>
                <div>
                  <Label>Estado de conexión</Label>
                  <Input value="Pendiente de conexión" disabled />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Instagram DM</CardTitle>
                <Badge variant="secondary">Pendiente</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Conecta una cuenta profesional de Instagram para gestionar mensajes directos desde
                  el CRM.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>ID de cuenta profesional de Instagram</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Página de Facebook conectada</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Token de acceso</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                  <div>
                    <Label>Webhook URL</Label>
                    <Input placeholder="Pendiente de conexión" disabled />
                  </div>
                </div>
                <div>
                  <Label>Estado de conexión</Label>
                  <Input value="Pendiente de conexión" disabled />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <div className="space-y-4">
            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base">Integración de Gmail</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Conecta Gmail para sincronizar conversaciones y enviar correos desde Corevix.
                    </p>
                  </div>
                  <Badge
                    variant={gmailAccount ? "default" : "secondary"}
                    className={
                      gmailAccount
                        ? "w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        : "w-fit"
                    }
                  >
                    {gmailAccount ? "Conectado" : "No conectado"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {gmailBanner === "connected" && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span>Gmail se conectó correctamente.</span>
                    <Button variant="ghost" size="sm" onClick={() => setGmailBanner(null)}>
                      Cerrar
                    </Button>
                  </div>
                )}

                {gmailBanner === "error" && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <span>No se pudo conectar Gmail. Intenta nuevamente.</span>
                    <Button variant="ghost" size="sm" onClick={() => setGmailBanner(null)}>
                      Cerrar
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-muted-foreground">Estado</div>
                    <div className="mt-1 text-sm font-semibold">
                      {gmailAccount ? "Gmail conectado" : "Pendiente de conexión"}
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white p-4 md:col-span-2">
                    <div className="text-xs font-medium text-muted-foreground">Cuenta</div>
                    <div className="mt-1 truncate text-sm font-semibold">
                      {gmailAccount?.email_address || "No hay cuenta conectada"}
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      Última sincronización
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {gmailAccount?.last_synced_at
                        ? new Date(gmailAccount.last_synced_at).toLocaleString()
                        : "Sin sincronizar"}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Paso 1 · Credenciales de Google</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pega el Client ID y Client Secret de Google Cloud. Corevix usará estas
                        credenciales para iniciar la conexión OAuth con Gmail.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="gmail-enabled"
                        type="checkbox"
                        checked={gmailForm.is_enabled}
                        onChange={(e) =>
                          setGmailForm((prev) => ({ ...prev, is_enabled: e.target.checked }))
                        }
                        disabled={gmailSettingsLoading}
                      />
                      <Label htmlFor="gmail-enabled" className="text-sm">
                        Usar Gmail en este CRM
                      </Label>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Client ID</Label>
                      <Input
                        value={gmailForm.client_id}
                        onChange={(e) =>
                          setGmailForm((prev) => ({ ...prev, client_id: e.target.value }))
                        }
                        disabled={gmailSettingsLoading}
                        placeholder="Pega el Client ID de Google Cloud"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Normalmente termina en apps.googleusercontent.com.
                      </p>
                    </div>

                    <div>
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={gmailForm.client_secret}
                        onChange={(e) =>
                          setGmailForm((prev) => ({ ...prev, client_secret: e.target.value }))
                        }
                        disabled={gmailSettingsLoading}
                        placeholder={gmailSecretConfigured ? "********" : "Pega el Client Secret"}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {gmailSecretConfigured
                          ? "Secret configurado. Escribe uno nuevo solo si quieres reemplazarlo."
                          : "Aún no hay secret configurado."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setGmailAdvancedOpen((v) => !v)}
                      className="px-0 text-muted-foreground hover:bg-transparent"
                    >
                      {gmailAdvancedOpen
                        ? "Ocultar configuración avanzada"
                        : "Ver configuración avanzada"}
                    </Button>

                    {gmailAdvancedOpen ? (
                      <div className="mt-3 grid grid-cols-1 gap-4 border border-slate-200 bg-white p-4 md:grid-cols-2">
                        <div>
                          <Label>Redirect URI</Label>
                          <Input
                            value={gmailForm.redirect_uri}
                            onChange={(e) =>
                              setGmailForm((prev) => ({ ...prev, redirect_uri: e.target.value }))
                            }
                            disabled={gmailSettingsLoading}
                            placeholder="https://[PROJECT_REF].supabase.co/functions/v1/gmail-oauth-callback"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Copia esta URL en Google Cloud como Authorized redirect URI.
                          </p>
                        </div>

                        <div>
                          <Label>Permisos / Scopes</Label>
                          <Input
                            value={gmailForm.scopes}
                            onChange={(e) =>
                              setGmailForm((prev) => ({ ...prev, scopes: e.target.value }))
                            }
                            disabled={gmailSettingsLoading}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Permisos usados para leer, modificar y enviar correos.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={saveGmailSettings}
                      disabled={gmailLoading || gmailSettingsLoading}
                    >
                      Guardar credenciales
                    </Button>
                    <Button variant="outline" onClick={connectGmail} disabled={gmailLoading}>
                      {gmailAccount ? "Reconectar cuenta" : "Conectar Gmail"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">Paso 2 · Cuenta Gmail</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Autoriza la cuenta que quieres usar para recibir y enviar correos dentro del
                      CRM.
                    </p>

                    <div className="mt-4 border border-slate-200 bg-white p-3">
                      <div className="text-xs font-medium text-muted-foreground">Cuenta actual</div>
                      <div className="mt-1 text-sm font-semibold">
                        {gmailAccount?.email_address || "No conectada"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {gmailAccount?.last_synced_at
                          ? `Última sync: ${new Date(gmailAccount.last_synced_at).toLocaleString()}`
                          : "Cuando conectes Gmail, aquí aparecerá el estado de la cuenta."}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={connectGmail} disabled={gmailLoading}>
                        {gmailAccount ? "Reconectar Gmail" : "Conectar Gmail"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled
                        title="Pendiente: desconexión segura de Gmail"
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold">Paso 3 · Verificar y sincronizar</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Primero verifica que la cuenta esté conectada. Luego sincroniza para traer
                      correos recientes.
                    </p>

                    <div className="mt-4 grid gap-2">
                      <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                        <span>Credenciales guardadas</span>
                        <Badge
                          variant={
                            gmailForm.client_id && gmailSecretConfigured ? "default" : "secondary"
                          }
                        >
                          {gmailForm.client_id && gmailSecretConfigured ? "Listo" : "Pendiente"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                        <span>Cuenta conectada</span>
                        <Badge variant={gmailAccount ? "default" : "secondary"}>
                          {gmailAccount ? "Listo" : "Pendiente"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                        <span>Integración activa</span>
                        <Badge variant={gmailForm.is_enabled ? "default" : "secondary"}>
                          {gmailForm.is_enabled ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={testGmailConnection}
                        disabled={gmailLoading}
                      >
                        Verificar conexión
                      </Button>
                      <Button onClick={syncGmail} disabled={gmailLoading || !gmailAccount}>
                        Sincronizar correos
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Microsoft Outlook</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        La integración con Outlook todavía no está disponible.
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Próximamente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-slate-200 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Firma de correo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Esta firma se agregará al final de los correos enviados desde Corevix.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder={"Ejemplo:\nSaludos,\nEquipo Corevix"} className="min-h-28" />
                <Button disabled>Guardar firma</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="drive" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Google Drive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configura las credenciales OAuth de Google Drive para usar archivos en Tasks y
                Projects.
              </p>
              {driveBanner === "connected" && (
                <div className="border border-slate-200 bg-white px-3 py-2 text-sm">
                  Google Drive conectado correctamente.
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setDriveBanner(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
              {driveBanner === "error" && (
                <div className="border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  No se pudo conectar Google Drive. Intenta nuevamente.
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setDriveBanner(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Client ID</Label>
                  <Input
                    value={driveForm.client_id}
                    onChange={(e) =>
                      setDriveForm((prev) => ({ ...prev, client_id: e.target.value }))
                    }
                    disabled={driveLoading}
                    placeholder="Google OAuth Client ID"
                  />
                </div>
                <div>
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={driveForm.client_secret}
                    onChange={(e) =>
                      setDriveForm((prev) => ({ ...prev, client_secret: e.target.value }))
                    }
                    disabled={driveLoading}
                    placeholder={driveSecretConfigured ? "********" : "Google OAuth Client Secret"}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {driveSecretConfigured
                      ? "Secret configurado. Escribe uno nuevo solo si deseas reemplazarlo."
                      : "Aun no hay secret configurado."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Redirect URI</Label>
                  <Input
                    value={driveForm.redirect_uri}
                    onChange={(e) =>
                      setDriveForm((prev) => ({ ...prev, redirect_uri: e.target.value }))
                    }
                    disabled={driveLoading}
                    placeholder="https://crm.corevix.agency/google-drive-callback"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Usa una URL de tu dominio, por ejemplo{" "}
                    <span className="font-mono">
                      https://crm.corevix.agency/google-drive-callback
                    </span>
                    . Esa página redirige al callback interno de Supabase.
                  </p>
                </div>
                <div>
                  <Label>Scopes</Label>
                  <Input
                    value={driveForm.scopes}
                    onChange={(e) => setDriveForm((prev) => ({ ...prev, scopes: e.target.value }))}
                    disabled={driveLoading}
                    placeholder="https://www.googleapis.com/auth/drive.file"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Root Folder ID</Label>
                  <Input
                    value={driveForm.root_folder_id}
                    onChange={(e) =>
                      setDriveForm((prev) => ({ ...prev, root_folder_id: e.target.value }))
                    }
                    disabled={driveLoading}
                    placeholder="Google Drive folder id"
                  />
                </div>
                <div>
                  <Label>Root Folder URL</Label>
                  <Input
                    value={driveForm.root_folder_url}
                    onChange={(e) =>
                      setDriveForm((prev) => ({ ...prev, root_folder_url: e.target.value }))
                    }
                    disabled={driveLoading}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="drive-enabled"
                  type="checkbox"
                  checked={driveForm.is_enabled}
                  onChange={(e) =>
                    setDriveForm((prev) => ({ ...prev, is_enabled: e.target.checked }))
                  }
                  disabled={driveLoading}
                />
                <Label htmlFor="drive-enabled">Activar integracion</Label>
              </div>

              <div className="border border-slate-200 px-3 py-2 text-sm">
                <div className="font-medium">Estado de conexion</div>
                <div className="text-muted-foreground">
                  {driveConnectionLoading
                    ? "Verificando conexion..."
                    : driveConnection?.id
                      ? "Conectado"
                      : "No conectado"}
                </div>
                {driveConnection?.google_email ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Cuenta autorizada: {driveConnection.google_email}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {can("settings.manage") ? (
                  <Button onClick={saveDriveSettings} disabled={driveLoading}>
                    Guardar configuracion
                  </Button>
                ) : null}
                <Button variant="outline" onClick={connectDrive}>
                  Conectar Google Drive
                </Button>
                <Button variant="outline" onClick={testDriveConnection} disabled={driveTesting}>
                  {driveTesting ? "Probando..." : "Probar conexion"}
                </Button>
                <Button
                  variant="outline"
                  onClick={disconnectDrive}
                  disabled={!driveConnection || driveConnectionLoading}
                >
                  Desconectar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Moneda del CRM</CardTitle>
              <p className="text-sm text-muted-foreground">
                Define la moneda principal de trabajo y la tasa manual que usaremos para convertir
                valores entre dólares y pesos.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Moneda base</Label>
                  <Select
                    value={currencyForm.base_currency}
                    onValueChange={(value) =>
                      setCurrencyForm((prev) => ({
                        ...prev,
                        base_currency: value === "DOP" ? "DOP" : "USD",
                      }))
                    }
                    disabled={currencyLoading || currencySaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la moneda base" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.symbol} · {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Esta será la moneda de referencia para reportes y KPIs globales.
                  </p>
                </div>

                <div>
                  <Label>Tasa USD a RD$</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.000001"
                    inputMode="decimal"
                    value={currencyForm.usd_to_dop_rate}
                    onChange={(event) =>
                      setCurrencyForm((prev) => ({
                        ...prev,
                        usd_to_dop_rate: event.target.value,
                      }))
                    }
                    disabled={currencyLoading || currencySaving}
                    placeholder="60"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ejemplo: si 1 US$ equivale a RD$60, escribe 60.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border border-slate-200 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Fuente</p>
                  <Badge variant="secondary" className="mt-2">
                    Manual
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Actualizada</p>
                  <p className="mt-2 font-medium text-slate-900">
                    {formatSettingsDate(currencyForm.rate_updated_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Equivalencia</p>
                  <p className="mt-2 font-medium text-slate-900">
                    1 US$ = RD${" "}
                    {Number(currencyForm.usd_to_dop_rate || 0).toLocaleString("es-DO", {
                      maximumFractionDigits: 6,
                    })}
                  </p>
                </div>
              </div>

              {can("settings.manage") && (
                <Button onClick={saveCurrencySettings} disabled={currencyLoading || currencySaving}>
                  Guardar configuración
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Impuestos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Centraliza los impuestos que se usan en facturas, propuestas y cotizaciones.
                </p>
              </div>
              {can("settings.manage") && (
                <Button onClick={openNewTaxForm} disabled={taxesLoading || taxSaving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo impuesto
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {taxFormOpen && (
                <div className="border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <Label>Nombre</Label>
                      <Input
                        value={taxForm.name}
                        onChange={(event) =>
                          setTaxForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        disabled={taxSaving}
                        placeholder="ITBIS 18%"
                      />
                    </div>
                    <div>
                      <Label>Porcentaje</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.0001"
                        inputMode="decimal"
                        value={taxForm.rate}
                        onChange={(event) =>
                          setTaxForm((prev) => ({ ...prev, rate: event.target.value }))
                        }
                        disabled={taxSaving}
                        placeholder="18"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={taxForm.tax_type}
                        onValueChange={(value) =>
                          setTaxForm((prev) => ({
                            ...prev,
                            tax_type:
                              value === "withholding" || value === "other" ? value : "sales",
                          }))
                        }
                        disabled={taxSaving}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de impuesto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Venta</SelectItem>
                          <SelectItem value="withholding">Retención</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Label>Descripción</Label>
                      <Input
                        value={taxForm.description}
                        onChange={(event) =>
                          setTaxForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        disabled={taxSaving}
                        placeholder="Uso interno opcional"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={taxForm.is_active}
                          onChange={(event) =>
                            setTaxForm((prev) => ({ ...prev, is_active: event.target.checked }))
                          }
                          disabled={taxSaving}
                        />
                        Activo
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={taxForm.is_default}
                          onChange={(event) =>
                            setTaxForm((prev) => ({ ...prev, is_default: event.target.checked }))
                          }
                          disabled={taxSaving}
                        />
                        Predeterminado
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setTaxFormOpen(false);
                          setTaxForm(DEFAULT_TAX_FORM);
                        }}
                        disabled={taxSaving}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={saveCompanyTax} disabled={taxSaving}>
                        {taxSaving ? "Guardando..." : "Guardar impuesto"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Impuesto</th>
                      <th className="px-4 py-3 font-medium">Porcentaje</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Uso</th>
                      <th className="px-4 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxesLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                          Cargando impuestos...
                        </td>
                      </tr>
                    ) : taxes.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                          No hay impuestos configurados.
                        </td>
                      </tr>
                    ) : (
                      taxes.map((tax) => (
                        <tr key={tax.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-950">{tax.name}</div>
                            {tax.description ? (
                              <div className="mt-1 text-xs text-slate-500">{tax.description}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {formatTaxRate(tax.rate)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatTaxTypeLabel(tax.tax_type)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={tax.is_active ? "default" : "secondary"}
                              className={
                                tax.is_active
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  : ""
                              }
                            >
                              {tax.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {tax.is_default ? (
                              <Badge variant="secondary">Predeterminado</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {can("settings.manage") ? (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTaxForm(tax)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                {tax.is_active && !tax.is_default ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markTaxAsDefault(tax)}
                                  >
                                    Usar por defecto
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleTaxActive(tax)}
                                  disabled={tax.is_default && tax.is_active}
                                >
                                  {tax.is_active ? "Desactivar" : "Activar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => deleteOrDeactivateTax(tax)}
                                  disabled={tax.is_default}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="block text-right text-slate-400">Solo lectura</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">AI / Gemini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configura Gemini para que el asistente del CRM responda desde el chat flotante. La
                API Key se guarda en Supabase (no en el frontend).
              </p>

              <div className="border border-slate-200 p-3 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={geminiForm.model}
                      onChange={(e) =>
                        setGeminiForm((prev) => ({ ...prev, model: e.target.value }))
                      }
                      disabled={geminiLoading}
                      placeholder="gemini-1.5-pro"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ej: gemini-1.5-pro, gemini-1.5-flash (según tu cuenta).
                    </p>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={geminiForm.api_key}
                      onChange={(e) =>
                        setGeminiForm((prev) => ({ ...prev, api_key: e.target.value }))
                      }
                      disabled={geminiLoading}
                      placeholder={
                        geminiSecretConfigured ? "********" : "Pega tu API Key de Gemini"
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {geminiSecretConfigured
                        ? "API Key configurada. Escribe una nueva solo si deseas reemplazarla."
                        : "Aún no hay API Key configurada."}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>System prompt</Label>
                  <Textarea
                    value={geminiForm.system_prompt}
                    onChange={(e) =>
                      setGeminiForm((prev) => ({ ...prev, system_prompt: e.target.value }))
                    }
                    disabled={geminiLoading}
                    className="min-h-[140px]"
                    placeholder="Instrucciones del asistente…"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="gemini-enabled"
                    type="checkbox"
                    checked={geminiForm.is_enabled}
                    onChange={(e) =>
                      setGeminiForm((prev) => ({ ...prev, is_enabled: e.target.checked }))
                    }
                    disabled={geminiLoading}
                  />
                  <Label htmlFor="gemini-enabled">Activar integración</Label>
                </div>

                {can("settings.manage") && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={saveGeminiSettings} disabled={geminiLoading}>
                      Guardar configuración
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <Card className="rounded-none border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage roles, permissions, and security features.
              </p>
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add an extra layer of security.
                </p>
                <Button variant="outline">Enable 2FA (Coming Soon)</Button>
              </div>
              <Separator />
              <div>
                <Label>Roles & Permissions</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  These permissions are stored in Supabase (`public.permissions`) and enforced by
                  RLS for sensitive actions.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-56">
                    <Select value={permRole} onValueChange={(v) => setPermRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {can("settings.manage") && (
                    <Button
                      variant="outline"
                      onClick={savePermissions}
                      disabled={permissionsLoading}
                    >
                      Save Permissions
                    </Button>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b border-slate-200 bg-white">
                      <tr>
                        <th className="text-left px-3 py-2">Module</th>
                        <th className="text-center px-3 py-2">View</th>
                        <th className="text-center px-3 py-2">Create</th>
                        <th className="text-center px-3 py-2">Edit</th>
                        <th className="text-center px-3 py-2">Delete</th>
                        <th className="text-center px-3 py-2">Assign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permRowsForUi.map((row) => (
                        <tr key={row.module} className="border-t">
                          <td className="px-3 py-2 font-medium">
                            {modules.find((m) => m.key === row.module)?.label || row.module}
                          </td>
                          {(
                            [
                              "can_view",
                              "can_create",
                              "can_edit",
                              "can_delete",
                              "can_assign",
                            ] as const
                          ).map((k) => (
                            <td key={k} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!row[k]}
                                disabled={!can("settings.manage") || permissionsLoading}
                                onChange={() => togglePerm(row.module, k)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
