import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingTable } from "@/components/crm/loading-state";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { logActivityEvent } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  component: VaultPage,
  head: () => ({ meta: [{ title: "Vault — Corevix CRM" }] }),
});

const ALL = "all";
const NONE = "none";

const CATEGORY_OPTIONS = [
  { value: "login", label: "Login" },
  { value: "api_key", label: "API key" },
  { value: "server", label: "Servidor" },
  { value: "domain_dns", label: "Dominio / DNS" },
  { value: "bank_account", label: "Cuenta bancaria" },
  { value: "document", label: "Documento" },
  { value: "license", label: "Licencia" },
  { value: "recovery_code", label: "Código de recuperación" },
  { value: "secure_note", label: "Nota segura" },
  { value: "other", label: "Otro" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "needs_review", label: "Revisar" },
  { value: "expired", label: "Expirado" },
  { value: "archived", label: "Archivado" },
];

const SENSITIVITY_OPTIONS = [
  { value: "internal", label: "Interno" },
  { value: "restricted", label: "Restringido" },
  { value: "critical", label: "Crítico" },
];

type VaultItemRow = {
  id: string;
  company_id: string;
  title: string;
  category: string;
  status: string;
  sensitivity: string;
  client_id: string | null;
  project_id: string | null;
  owner_id: string | null;
  url: string | null;
  username: string | null;
  email: string | null;
  secret_value: string | null;
  notes: string | null;
  tags: string[] | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  company_name: string;
  contact_person: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  client_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

type VaultFormState = {
  title: string;
  category: string;
  status: string;
  sensitivity: string;
  client_id: string;
  project_id: string;
  owner_id: string;
  url: string;
  username: string;
  email: string;
  secret_value: string;
  expires_at: string;
  tags: string;
  notes: string;
};

const initialVaultForm: VaultFormState = {
  title: "",
  category: "login",
  status: "active",
  sensitivity: "restricted",
  client_id: NONE,
  project_id: NONE,
  owner_id: NONE,
  url: "",
  username: "",
  email: "",
  secret_value: "",
  expires_at: "",
  tags: "",
  notes: "",
};

function optionLabel(options: Array<{ value: string; label: string }>, value: string | null) {
  return options.find((item) => item.value === value)?.label || "—";
}

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed && trimmed !== NONE ? trimmed : null;
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function isExpiringSoon(value: string | null | undefined) {
  if (!value) return false;
  const today = new Date();
  const expiresAt = new Date(`${value}T00:00:00`);
  const days = (expiresAt.getTime() - today.getTime()) / 86_400_000;
  return days >= 0 && days <= 30;
}

function isExpired(value: string | null | undefined) {
  if (!value) return false;
  return new Date(`${value}T23:59:59`).getTime() < Date.now();
}

function statusClass(status: string) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "expired") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function sensitivityClass(sensitivity: string) {
  if (sensitivity === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (sensitivity === "restricted") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function VaultKpi({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "blue"
          ? "text-blue-600"
          : "text-slate-950";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", toneClass)}>{value}</p>
    </div>
  );
}

function VaultPage() {
  const { profile, roles } = useAuth();
  const canManageVault = roles.some((role) => ["super_admin", "admin", "manager"].includes(role));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [sensitivityFilter, setSensitivityFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState<VaultFormState>(initialVaultForm);

  const vaultCrud = useCrud<VaultItemRow>({
    table: "vault_items",
    orderBy: "updated_at",
    limit: 500,
    enabled: canManageVault,
  });
  const { data: clients = [] } = useCrud<ClientRow>({
    table: "clients",
    select: "id, company_name, contact_person",
    orderBy: "company_name",
    ascending: true,
    limit: 500,
    enabled: canManageVault,
  });
  const { data: projects = [] } = useCrud<ProjectRow>({
    table: "projects",
    select: "id, name, client_id",
    orderBy: "name",
    ascending: true,
    limit: 500,
    enabled: canManageVault,
  });
  const { data: profiles = [] } = useCrud<ProfileRow>({
    table: "profiles",
    select: "id, full_name, email, is_active",
    orderBy: "full_name",
    ascending: true,
    limit: 500,
    enabled: canManageVault,
  });

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const profileById = useMemo(
    () => new Map(profiles.map((staff) => [staff.id, staff])),
    [profiles],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vaultCrud.data.filter((item) => {
      if (categoryFilter !== ALL && item.category !== categoryFilter) return false;
      if (statusFilter !== ALL && item.status !== statusFilter) return false;
      if (sensitivityFilter !== ALL && item.sensitivity !== sensitivityFilter) return false;
      if (!term) return true;
      const clientName = item.client_id ? clientById.get(item.client_id)?.company_name : "";
      const projectName = item.project_id ? projectById.get(item.project_id)?.name : "";
      return [
        item.title,
        item.username,
        item.email,
        item.url,
        item.notes,
        clientName,
        projectName,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [
    vaultCrud.data,
    search,
    categoryFilter,
    statusFilter,
    sensitivityFilter,
    clientById,
    projectById,
  ]);

  const stats = useMemo(() => {
    const critical = vaultCrud.data.filter((item) => item.sensitivity === "critical").length;
    const review = vaultCrud.data.filter((item) => item.status === "needs_review").length;
    const expiring = vaultCrud.data.filter(
      (item) => isExpiringSoon(item.expires_at) || isExpired(item.expires_at),
    ).length;
    return { total: vaultCrud.data.length, critical, review, expiring };
  }, [vaultCrud.data]);

  const updateForm = (field: keyof VaultFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => setForm(initialVaultForm);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("El nombre del acceso es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const created = await vaultCrud.create({
        title: form.title.trim(),
        category: form.category,
        status: form.status,
        sensitivity: form.sensitivity,
        client_id: toNullable(form.client_id),
        project_id: toNullable(form.project_id),
        owner_id: toNullable(form.owner_id),
        url: toNullable(form.url),
        username: toNullable(form.username),
        email: toNullable(form.email),
        secret_value: toNullable(form.secret_value),
        expires_at: toNullable(form.expires_at),
        tags: splitTags(form.tags),
        notes: toNullable(form.notes),
        created_by: profile?.id || null,
        updated_by: profile?.id || null,
      });

      void logActivityEvent({
        companyId: profile?.company_id,
        userId: profile?.id,
        action: "vault_item_created",
        entityType: "vault_item",
        entityId: created?.id || null,
        detail: `Acceso seguro creado: ${form.title.trim()}`,
        metadata: { category: form.category, sensitivity: form.sensitivity },
      });

      toast.success("Acceso guardado en Vault.");
      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el acceso.");
    } finally {
      setSaving(false);
    }
  };

  const toggleReveal = (item: VaultItemRow) => {
    setRevealedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
        void logActivityEvent({
          companyId: profile?.company_id,
          userId: profile?.id,
          action: "vault_secret_revealed",
          entityType: "vault_item",
          entityId: item.id,
          detail: `Se reveló un secreto de Vault: ${item.title}`,
          metadata: { category: item.category },
          dedupeWindowSeconds: 30,
        });
      }
      return next;
    });
  };

  const copySecret = async (item: VaultItemRow) => {
    if (!item.secret_value) {
      toast.info("Este acceso no tiene secreto guardado.");
      return;
    }
    try {
      await navigator.clipboard.writeText(item.secret_value);
      toast.success("Secreto copiado.");
      void logActivityEvent({
        companyId: profile?.company_id,
        userId: profile?.id,
        action: "vault_secret_copied",
        entityType: "vault_item",
        entityId: item.id,
        detail: `Se copió un secreto de Vault: ${item.title}`,
        metadata: { category: item.category },
        dedupeWindowSeconds: 30,
      });
    } catch {
      toast.error("No se pudo copiar el secreto.");
    }
  };

  if (!canManageVault) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Vault"
          subtitle="Accesos y notas sensibles del CRM con visibilidad restringida."
        />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Esta sección está reservada para administración y gerencia.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Vault"
        subtitle="Guarda accesos, llaves, notas seguras y datos operativos sensibles en un solo lugar."
        actionLabel="Nuevo acceso"
        actionIcon={<Plus className="h-4 w-4" />}
        onAction={() => setDialogOpen(true)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VaultKpi label="Total guardados" value={stats.total} />
        <VaultKpi label="Críticos" value={stats.critical} tone="rose" />
        <VaultKpi label="Por revisar" value={stats.review} tone="amber" />
        <VaultKpi label="Vencen pronto" value={stats.expiring} tone="blue" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en Vault..."
                className="h-10 rounded-xl border-slate-200 bg-white pl-9"
              />
            </div>
            <SearchFilters
              searchValue={search}
              onSearchChange={setSearch}
              mobileCollapsible
              filters={[
                {
                  key: "category",
                  placeholder: "categorías",
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                  options: CATEGORY_OPTIONS,
                },
                {
                  key: "status",
                  placeholder: "estados",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: STATUS_OPTIONS,
                },
                {
                  key: "sensitivity",
                  placeholder: "niveles",
                  value: sensitivityFilter,
                  onChange: setSensitivityFilter,
                  options: SENSITIVITY_OPTIONS,
                },
              ]}
            />
          </div>
        </div>

        {vaultCrud.loading ? (
          <LoadingTable />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<LockKeyhole className="h-6 w-6" />}
            title="No hay accesos guardados"
            description="Crea el primer registro seguro para centralizar credenciales, llaves o notas importantes."
            actionLabel="Nuevo acceso"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Vinculado a</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Secreto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const revealed = revealedIds.has(item.id);
                  const client = item.client_id ? clientById.get(item.client_id) : null;
                  const project = item.project_id ? projectById.get(item.project_id) : null;
                  const owner = item.owner_id ? profileById.get(item.owner_id) : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex min-w-[220px] items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <KeyRound className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-950">{item.title}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {optionLabel(CATEGORY_OPTIONS, item.category)}
                              </Badge>
                              {(item.tags || []).slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-slate-100">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[180px] text-sm">
                          <div className="font-medium text-slate-800">
                            {client?.company_name || "Sin cliente"}
                          </div>
                          <div className="text-slate-500">{project?.name || "Sin proyecto"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[190px] space-y-1 text-sm text-slate-600">
                          <div>{item.username || item.email || "Sin usuario"}</div>
                          {item.url ? (
                            <a
                              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-[210px] items-center gap-1 truncate text-blue-600"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              {item.url}
                            </a>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[180px] items-center gap-2">
                          <span className="max-w-[120px] truncate font-mono text-sm text-slate-700">
                            {item.secret_value
                              ? revealed
                                ? item.secret_value
                                : "••••••••••••"
                              : "—"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => toggleReveal(item)}
                            disabled={!item.secret_value}
                            aria-label={revealed ? "Ocultar secreto" : "Revelar secreto"}
                          >
                            {revealed ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => void copySecret(item)}
                            disabled={!item.secret_value}
                            aria-label="Copiar secreto"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[150px] flex-col gap-1.5">
                          <Badge variant="outline" className={statusClass(item.status)}>
                            {optionLabel(STATUS_OPTIONS, item.status)}
                          </Badge>
                          <Badge variant="outline" className={sensitivityClass(item.sensitivity)}>
                            {optionLabel(SENSITIVITY_OPTIONS, item.sensitivity)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-sm text-slate-600",
                            isExpired(item.expires_at) && "font-semibold text-rose-600",
                            isExpiringSoon(item.expires_at) && "font-semibold text-amber-600",
                          )}
                        >
                          {formatDate(item.expires_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[140px] text-sm">
                          <div className="font-medium text-slate-800">
                            {owner?.full_name || "Sin responsable"}
                          </div>
                          <div className="truncate text-slate-500">{owner?.email || ""}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title="Nuevo acceso seguro"
        description="Guarda solo información necesaria y asigna un responsable para mantenerla actualizada."
        size="lg"
        footer={
          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={crmFormStyles.primaryButton}
              onClick={() => void handleCreate()}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar acceso"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className={crmFormStyles.label}>Nombre del acceso</label>
            <Input
              className={crmFormStyles.input}
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              placeholder="Ej: Acceso hosting principal"
            />
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Categoría</label>
            <Select value={form.category} onValueChange={(value) => updateForm("category", value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Nivel</label>
            <Select
              value={form.sensitivity}
              onValueChange={(value) => updateForm("sensitivity", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Cliente</label>
            <Select
              value={form.client_id}
              onValueChange={(value) => updateForm("client_id", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Proyecto</label>
            <Select
              value={form.project_id}
              onValueChange={(value) => updateForm("project_id", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin proyecto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Responsable</label>
            <Select value={form.owner_id} onValueChange={(value) => updateForm("owner_id", value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin responsable</SelectItem>
                {profiles.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email || "Usuario"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Estado</label>
            <Select value={form.status} onValueChange={(value) => updateForm("status", value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>URL</label>
            <Input
              className={crmFormStyles.input}
              value={form.url}
              onChange={(event) => updateForm("url", event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Usuario</label>
            <Input
              className={crmFormStyles.input}
              value={form.username}
              onChange={(event) => updateForm("username", event.target.value)}
              placeholder="Usuario o cuenta"
            />
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Correo</label>
            <Input
              className={crmFormStyles.input}
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className={crmFormStyles.label}>Vence</label>
            <Input
              className={crmFormStyles.input}
              type="date"
              value={form.expires_at}
              onChange={(event) => updateForm("expires_at", event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className={crmFormStyles.label}>Secreto</label>
            <Input
              className={crmFormStyles.input}
              type="password"
              value={form.secret_value}
              onChange={(event) => updateForm("secret_value", event.target.value)}
              placeholder="Contraseña, token, API key o código seguro"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className={crmFormStyles.label}>Etiquetas</label>
            <Input
              className={crmFormStyles.input}
              value={form.tags}
              onChange={(event) => updateForm("tags", event.target.value)}
              placeholder="producción, hosting, cliente vip"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className={crmFormStyles.label}>Notas</label>
            <Textarea
              className={crmFormStyles.textarea}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="Contexto de uso, instrucciones o detalles importantes."
            />
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Usa Vault para información realmente necesaria. Mantén responsables y vencimientos
              claros para evitar accesos olvidados.
            </p>
          </div>
        </div>
      </CrmCreationDialog>
    </div>
  );
}
