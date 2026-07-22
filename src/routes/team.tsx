import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  Mail,
  MoreHorizontal,
  Send,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useTeamUsers,
  type AppRole,
  type TeamUserRow,
  type TeamUserStatusFilter,
} from "@/hooks/use-team-users";
import { useUserActivity } from "@/hooks/use-user-activity";
import { useInviteUser, useToggleUserStatus, useUpdateUserRole } from "@/hooks/use-team-actions";
import { statusKey, useT } from "@/i18n";

import { EmptyState } from "@/components/crm/empty-state";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/team")({
  component: TeamUsersPage,
  head: () => ({
    meta: [
      { title: "Team & Users — Corevix CRM" },
      { name: "description", content: "Manage your company team members, access, and roles." },
    ],
  }),
});

type InvitationRow = {
  id: string;
  email: string;
  role: AppRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  expires_at: string;
  created_at: string;
};

const ROLE_OPTIONS: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "sales_agent",
  "collaborator",
  "viewer",
];

function initials(name: string) {
  const parts = String(name || "")
    .split(/\s+/)
    .filter(Boolean);
  return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function roleTone(role: AppRole) {
  if (role === "super_admin") return "bg-violet-50 text-violet-700 border-violet-200";
  if (role === "admin") return "bg-blue-50 text-blue-700 border-blue-200";
  if (role === "manager") return "bg-amber-50 text-amber-700 border-amber-200";
  if (role === "sales_agent") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (role === "collaborator") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusTone(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

function invitationTone(status: InvitationRow["status"]) {
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "accepted") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "revoked") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function fmtDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtRelative(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

function daysUntil(
  input: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return t("status.expired");
  if (days === 0) return t("team.today");
  if (days === 1) return t("team.oneDay");
  return t("team.days", { count: days });
}

function buildInvitationLink(inv: InvitationRow) {
  const redirectTo = `${window.location.origin}/dashboard`;
  return `${window.location.origin}/login?invite=${encodeURIComponent(inv.token)}&email=${encodeURIComponent(inv.email)}&redirectTo=${encodeURIComponent(redirectTo)}`;
}

async function copyText(text: string, message = "Enlace copiado") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("No se pudo copiar automáticamente. Cópialo manualmente.");
  }
}

function roleLabel(role: AppRole, t: (key: string) => string) {
  const key = `team.role.${role}`;
  const label = t(key);
  return label === key ? role : label;
}

function displayStatus(value: string, t: (key: string) => string) {
  const key = statusKey(value);
  const label = t(key);
  return label === key ? value : label;
}

function TeamKpi({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : tone === "info"
            ? "text-blue-600"
            : "text-slate-950";

  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <p className="truncate text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-normal leading-none ${toneClass}`}>{value}</p>
      <p className="mt-1 truncate text-xs font-normal text-slate-500">{helper}</p>
    </div>
  );
}

function PermissionPreview({ role }: { role: AppRole }) {
  const { t } = useT();
  const seesAssignedOnly = role === "sales_agent" || role === "collaborator";
  const items = [
    { label: t("team.permission.viewAllRecords"), on: !seesAssignedOnly && role !== "viewer" },
    { label: t("team.permission.viewAssignedRecords"), on: seesAssignedOnly },
    { label: t("team.permission.createRecords"), on: role !== "viewer" },
    { label: t("team.permission.editRecords"), on: role !== "viewer" },
    {
      label: t("team.permission.deleteRecords"),
      on: role === "super_admin" || role === "admin" || role === "manager",
    },
    {
      label: t("team.permission.assignUsers"),
      on: role === "super_admin" || role === "admin" || role === "manager",
    },
    { label: t("team.permission.manageUsers"), on: role === "super_admin" || role === "admin" },
    { label: t("team.permission.manageSettings"), on: role === "super_admin" || role === "admin" },
    { label: t("team.permission.exportData"), on: role !== "viewer" },
  ];

  return (
    <div className="divide-y divide-border rounded-xl border">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{it.label}</p>
            <p className="text-xs text-muted-foreground">{t("team.permission.derived")}</p>
          </div>
          {it.on ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
          )}
        </div>
      ))}
    </div>
  );
}

function TeamUsersPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TeamUserStatusFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string | "all">("all");

  const {
    data: users,
    loading,
    error,
    refetch,
  } = useTeamUsers({
    search,
    role: roleFilter,
    status: statusFilter,
    department: departmentFilter,
    enabled: can("team.view"),
  });

  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.department && set.add(u.department));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const [selected, setSelected] = useState<TeamUserRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: activity, loading: activityLoading } = useUserActivity(
    selected?.profile_id || null,
    30,
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("sales_agent");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    link: string;
    emailSent: boolean;
    deliveryChannel?: "gmail" | "resend" | "manual";
  } | null>(null);
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const { invite, resendInvite, revokeInvite } = useInviteUser();
  const { updateRole } = useUpdateUserRole();
  const { toggleStatus } = useToggleUserStatus();

  const loadInvites = async () => {
    if (!can("team.manage")) {
      setInvites([]);
      return;
    }
    setInvitesLoading(true);
    const { data, error } = await (supabase as any)
      .from("invitations")
      .select("id,email,role,status,token,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setInvitesLoading(false);
    if (error) {
      toast.error(error.message || "No se pudieron cargar las invitaciones");
      return;
    }
    setInvites((data || []) as InvitationRow[]);
  };

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can("team.manage")]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = total - active;
    const adminsManagers = users.filter(
      (u) => u.role === "super_admin" || u.role === "admin" || u.role === "manager",
    ).length;
    const pendingInv = invites.filter((i) => i.status === "pending").length;
    return { total, active, inactive, adminsManagers, pendingInv };
  }, [users, invites]);

  const pendingInvites = useMemo(
    () => invites.filter((inv) => inv.status === "pending"),
    [invites],
  );

  const activeTeamFilters = [
    roleFilter !== "all",
    statusFilter !== "all",
    departmentFilter !== "all",
  ].filter(Boolean).length;

  const clearTeamFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setDepartmentFilter("all");
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteFullName("");
    setInviteDepartment("");
    setInviteRole("sales_agent");
    setInviteResult(null);
  };

  const doInvite = async () => {
    if (!can("team.manage")) return toast.error("No tienes permiso para invitar usuarios");
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return toast.error("Email inválido");
    setInviteSending(true);
    try {
      const res = await invite({
        email,
        role: inviteRole,
        full_name: inviteFullName.trim() || undefined,
        department: inviteDepartment.trim() || undefined,
        redirectTo: `${window.location.origin}/dashboard`,
      });
      setInviteResult({
        email,
        link: res.invitation_link,
        emailSent: res.email_sent,
        deliveryChannel: res.delivery_channel,
      });
      if (res.email_sent && res.delivery_channel === "gmail")
        toast.success("Invitación enviada por Gmail");
      else if (res.email_sent) toast.success("Invitación enviada por email");
      else toast.success("Invitación creada. Copia el enlace para compartirlo.");
      if (res.gmail_error && res.delivery_channel !== "gmail")
        toast.message(`Gmail no disponible: ${res.gmail_error}`);
      if (res.resend_error) toast.message(`Email no enviado: ${res.resend_error}`);
      setInviteEmail("");
      setInviteFullName("");
      setInviteDepartment("");
      setInviteRole("sales_agent");
      await loadInvites();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la invitación");
    } finally {
      setInviteSending(false);
    }
  };

  const doResendInvite = async (inv: InvitationRow) => {
    setBusyInviteId(inv.id);
    try {
      const res = await resendInvite(inv.id, `${window.location.origin}/dashboard`);
      if (res.email_sent && res.delivery_channel === "gmail")
        toast.success("Invitación reenviada por Gmail");
      else if (res.email_sent) toast.success("Invitación reenviada por email");
      else
        toast.message(
          res.resend_error
            ? `Email no enviado: ${res.resend_error}`
            : "Copia el enlace para compartirlo manualmente.",
        );
      if (res.gmail_error && res.delivery_channel !== "gmail")
        toast.message(`Gmail no disponible: ${res.gmail_error}`);
      if (!res.email_sent) await copyText(res.invitation_link, "Enlace copiado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo reenviar la invitación");
    } finally {
      setBusyInviteId(null);
    }
  };

  const doRevokeInvite = async (inv: InvitationRow) => {
    setBusyInviteId(inv.id);
    try {
      await revokeInvite(inv.id);
      toast.success("Invitación revocada");
      await loadInvites();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo revocar la invitación");
    } finally {
      setBusyInviteId(null);
    }
  };

  const updateSelectedRole = async (newRole: AppRole) => {
    if (!selected) return;
    if (!can("team.manage")) return toast.error("No tienes permiso para cambiar roles");
    try {
      await updateRole(selected.user_id, newRole);
      toast.success("Rol actualizado");
      setSelected((prev) => (prev ? { ...prev, role: newRole } : prev));
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el rol");
    }
  };

  const setSelectedActive = async (active: boolean) => {
    if (!selected) return;
    if (!can("team.manage")) return toast.error("No tienes permiso para administrar acceso");
    try {
      await toggleStatus(selected.user_id, active);
      toast.success(active ? "Usuario activado" : "Usuario desactivado");
      setSelected((prev) => (prev ? { ...prev, is_active: active } : prev));
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el estado");
    }
  };

  if (!user) return <Navigate to="/login" />;
  if (loading)
    return (
      <div className="p-6">
        <LoadingMetrics count={4} />
      </div>
    );
  if (!can("team.view")) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle")} />

      <section className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        <TeamKpi
          label={t("team.stats.total")}
          value={stats.total}
          helper={t("team.stats.totalHelper")}
          tone="info"
        />
        <TeamKpi
          label={t("team.stats.active")}
          value={stats.active}
          helper={t("team.stats.activeHelper")}
          tone="success"
        />
        <TeamKpi
          label={t("team.stats.pendingInvitations")}
          value={stats.pendingInv}
          helper={t("team.stats.pendingInvitationsHelper")}
          tone={stats.pendingInv > 0 ? "warning" : "success"}
        />
        <TeamKpi
          label={t("team.stats.adminsManagers")}
          value={stats.adminsManagers}
          helper={t("team.stats.adminsManagersHelper")}
          tone="neutral"
        />
        <TeamKpi
          label={t("team.stats.inactive")}
          value={stats.inactive}
          helper={t("team.stats.inactiveHelper")}
          tone={stats.inactive > 0 ? "danger" : "success"}
        />
      </section>

      {can("team.manage") && pendingInvites.length > 0 && (
        <section className="overflow-hidden border-y border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-normal text-slate-950">{t("team.pendingInvitations")}</p>
              <p className="text-xs font-normal text-slate-500">
                {t("team.pendingInvitationsSubtitle")}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingInvites.map((inv) => {
              const pending = inv.status === "pending";
              return (
                <div key={inv.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-100 bg-white">
                      {pending ? (
                        <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-normal text-slate-950">{inv.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${roleTone(inv.role)}`}
                        >
                          {roleLabel(inv.role, t)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${invitationTone(inv.status)}`}
                        >
                          {displayStatus(inv.status, t)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs font-normal text-slate-500">
                        {t("team.expires")}: {daysUntil(inv.expires_at, t)} · {t("team.created")}{" "}
                        {fmtRelative(inv.created_at)} {t("team.ago")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:w-[260px]">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pending}
                      onClick={() => void copyText(buildInvitationLink(inv))}
                      className="h-9 rounded-full border-slate-200 bg-white shadow-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pending || busyInviteId === inv.id}
                      onClick={() => void doResendInvite(inv)}
                      className="h-9 rounded-full border-slate-200 bg-white text-sm font-normal shadow-none"
                    >
                      {t("team.resend")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pending || busyInviteId === inv.id}
                      onClick={() => void doRevokeInvite(inv)}
                      className="h-9 rounded-full border-slate-200 bg-white text-sm font-normal shadow-none"
                    >
                      {t("team.revoke")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden border-y border-slate-100 bg-white max-md:border-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-normal text-slate-950">Miembros</p>
              <p className="text-xs font-normal text-slate-500">
                {users.length} visibles en el equipo
                {activeTeamFilters ? ` · ${activeTeamFilters} filtros activos` : ""}
              </p>
            </div>
            <div className="hidden flex-wrap items-center gap-2 sm:flex">
              {can("team.manage") ? (
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="h-9 rounded-full bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("team.inviteUser")}
                </Button>
              ) : null}
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar miembros..."
                className="h-9 w-64 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <details className="group mt-3 sm:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center justify-between border-b border-slate-200 bg-white text-sm font-normal">
              <span>Filtros</span>
              <span className="text-xs text-slate-500">
                {activeTeamFilters ? `${activeTeamFilters} activos` : "Todos"}
              </span>
            </summary>
            <div className="mt-3 grid gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar miembros..."
                className="h-10 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t("team.role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("team.roleAll")}</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TeamUserStatusFilter)}
              >
                <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Estado: todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as any)}>
                <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t("team.department")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("team.departmentAll")}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTeamFilters > 0 && (
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-slate-200 bg-white font-normal shadow-none"
                  onClick={clearTeamFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </details>

          <div className="mt-3 hidden flex-wrap items-center gap-3 sm:flex">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="h-9 w-[180px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t("team.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("team.roleAll")}</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabel(r, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TeamUserStatusFilter)}
            >
              <SelectTrigger className="h-9 w-[180px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estado: todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as any)}>
              <SelectTrigger className="h-9 w-[220px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={t("team.department")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("team.departmentAll")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTeamFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full font-normal shadow-none"
                onClick={clearTeamFilters}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserCog className="h-6 w-6" />}
              title="No se encontraron usuarios"
              description="Prueba cambiando los filtros o invita a alguien del equipo."
              actionLabel={can("team.manage") ? "Invitar usuario" : undefined}
              onAction={() => setInviteOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {users.map((u) => (
                <button
                  key={`${u.profile_id}-${u.user_id}-mobile`}
                  type="button"
                  className="w-full bg-white p-4 text-left hover:bg-slate-50/40"
                  onClick={() => {
                    setSelected(u);
                    setDetailsOpen(true);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-100 bg-white font-normal text-slate-900">
                      {initials(u.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-normal text-slate-950">{u.full_name}</p>
                          <p className="truncate text-xs font-normal text-slate-500">
                            {u.email || "—"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 rounded-full border ${statusTone(u.is_active)}`}
                        >
                          {u.is_active ? t("status.active") : t("status.inactive")}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${roleTone(u.role)}`}
                        >
                          {roleLabel(u.role, t)}
                        </Badge>
                        {u.department && (
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {u.department}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100">
                        <div className="px-2 py-2">
                          <p className="text-[10px] font-normal uppercase tracking-wide text-slate-500">
                            Leads
                          </p>
                          <p className="font-normal text-slate-950">{u.leads_assigned}</p>
                        </div>
                        <div className="px-2 py-2">
                          <p className="text-[10px] font-normal uppercase tracking-wide text-slate-500">
                            Tareas
                          </p>
                          <p className="font-normal text-slate-950">{u.tasks_assigned}</p>
                        </div>
                        <div className="px-2 py-2">
                          <p className="text-[10px] font-normal uppercase tracking-wide text-slate-500">
                            Deals
                          </p>
                          <p className="font-normal text-slate-950">{u.deals_assigned}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-normal text-slate-500">
                        Última actividad: {fmtRelative(u.last_activity_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="pl-5">Usuario</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>{t("team.role")}</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead>Última actividad</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead className="pr-5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={`${u.profile_id}-${u.user_id}`}
                      className="cursor-pointer hover:bg-slate-50/40"
                      onClick={() => {
                        setSelected(u);
                        setDetailsOpen(true);
                      }}
                    >
                      <TableCell className="pl-5">
                        <div className="flex min-w-[260px] items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-100 bg-white font-normal text-slate-900">
                            {initials(u.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-normal text-slate-950">{u.full_name}</div>
                            <div className="truncate text-xs font-normal text-slate-500">
                              {u.email || "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-normal text-slate-500">
                        {u.department || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${roleTone(u.role)}`}
                        >
                          {roleLabel(u.role, t)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${statusTone(u.is_active)}`}
                        >
                          {u.is_active ? t("status.active") : t("status.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[180px] flex-wrap gap-1">
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {t("profile.workMonitor.leads")} {u.leads_assigned}
                          </span>
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {t("profile.workMonitor.tasks")} {u.tasks_assigned}
                          </span>
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {t("profile.workMonitor.deals")} {u.deals_assigned}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-normal text-slate-950">
                          {fmtRelative(u.last_activity_at)}
                        </div>
                        <div className="text-xs font-normal text-slate-500">
                          {fmtDate(u.last_activity_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-normal text-slate-950">{fmtDate(u.joined_at)}</div>
                      </TableCell>
                      <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full shadow-none"
                          onClick={() => {
                            setSelected(u);
                            setDetailsOpen(true);
                          }}
                          aria-label="Abrir detalles"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <CrmCreationDialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) resetInviteForm();
        }}
        title={inviteResult ? t("team.invitationReady") : t("team.inviteTeammate")}
        description={
          inviteResult
            ? inviteResult.emailSent
              ? t("team.inviteSentTo", { email: inviteResult.email })
              : t("team.copyInviteFor", { email: inviteResult.email })
            : "Completa los datos básicos y el rol de acceso para enviar la invitación."
        }
        size="md"
        footer={
          inviteResult ? (
            <div className={crmFormStyles.footer}>
              <Button
                variant="outline"
                className={crmFormStyles.cancelButton}
                onClick={() => resetInviteForm()}
              >
                {t("team.inviteAnother")}
              </Button>
              <Button className={crmFormStyles.primaryButton} onClick={() => setInviteOpen(false)}>
                {t("team.done")}
              </Button>
            </div>
          ) : (
            <div className={crmFormStyles.footer}>
              <Button
                variant="outline"
                className={crmFormStyles.cancelButton}
                onClick={() => setInviteOpen(false)}
                disabled={inviteSending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className={crmFormStyles.primaryButton}
                onClick={() => void doInvite()}
                disabled={inviteSending || !inviteEmail.trim()}
              >
                {inviteSending ? "Enviando…" : "Enviar invitación"}
              </Button>
            </div>
          )
        }
      >
        {inviteResult ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-emerald-950">
              <p className="text-sm font-normal">
                {inviteResult.emailSent
                  ? inviteResult.deliveryChannel === "gmail"
                    ? "Invitación enviada por Gmail"
                    : "Email enviado correctamente"
                  : "Invitación creada"}
              </p>
              <p className="mt-1 text-sm font-normal text-emerald-800/80">
                {inviteResult.emailSent
                  ? t("team.inviteSentTo", { email: inviteResult.email })
                  : t("team.copyInviteFor", { email: inviteResult.email })}
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className={crmFormStyles.label}>Enlace de invitación</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-slate-200 font-normal shadow-none"
                  onClick={() => void copyText(inviteResult.link)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <Input className={crmFormStyles.input} value={inviteResult.link} readOnly />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Email</Label>
              <Input
                className={crmFormStyles.input}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={crmFormStyles.label}>
                  Nombre completo <span className="normal-case text-slate-400">opcional</span>
                </Label>
                <Input
                  className={crmFormStyles.input}
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder={t("team.namePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={crmFormStyles.label}>
                  Departamento <span className="normal-case text-slate-400">opcional</span>
                </Label>
                <Input
                  className={crmFormStyles.input}
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  placeholder={t("team.departmentPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Rol</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs font-normal text-slate-500">
                El usuario heredará los permisos de este rol al aceptar la invitación.
              </p>
            </div>
          </div>
        )}
      </CrmCreationDialog>

      <Sheet open={detailsOpen} onOpenChange={(o) => !o && setDetailsOpen(false)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3 pr-8">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 text-base font-black text-slate-950">
                {initials(selected?.full_name || "Usuario")}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-xl font-black leading-tight">
                  {selected?.full_name || "Usuario"}
                </SheetTitle>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {selected?.email || "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected?.role && (
                    <Badge
                      variant="secondary"
                      className={`rounded-full border ${roleTone(selected.role)}`}
                    >
                      {roleLabel(selected.role, t)}
                    </Badge>
                  )}
                  {selected && (
                    <Badge
                      variant="secondary"
                      className={`rounded-full border ${statusTone(selected.is_active)}`}
                    >
                      {selected.is_active ? t("status.active") : t("status.inactive")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="p-4 sm:p-5">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Resumen</TabsTrigger>
                <TabsTrigger value="activity">Actividad</TabsTrigger>
                <TabsTrigger value="permissions">Permisos</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4 space-y-5">
                <div className="grid grid-cols-3 divide-x divide-border rounded-xl border">
                  <div className="px-3 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Leads
                    </p>
                    <p className="mt-1 text-xl font-black">{selected?.leads_assigned ?? 0}</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Tareas
                    </p>
                    <p className="mt-1 text-xl font-black">{selected?.tasks_assigned ?? 0}</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Deals
                    </p>
                    <p className="mt-1 text-xl font-black">{selected?.deals_assigned ?? 0}</p>
                  </div>
                </div>

                <div className="divide-y divide-border rounded-xl border">
                  {[
                    ["Departamento", selected?.department || "—"],
                    ["Ingreso", fmtDate(selected?.joined_at)],
                    ["Última actividad", fmtDate(selected?.last_activity_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-3 py-3">
                      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                      <p className="min-w-0 truncate text-right text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-extrabold">Acceso</p>
                    <p className="text-xs text-muted-foreground">
                      Controla si este usuario puede entrar al CRM.
                    </p>
                  </div>
                  <Button
                    variant={selected?.is_active ? "destructive" : "default"}
                    className="w-full"
                    onClick={() => void setSelectedActive(!selected?.is_active)}
                    disabled={!can("team.manage") || !selected}
                  >
                    {selected?.is_active ? "Desactivar acceso" : "Activar acceso"}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="activity" className="mt-4 space-y-3">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Cargando actividad…</div>
                ) : activity.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-6 w-6" />}
                    title="Sin actividad todavía"
                    description="Este usuario no tiene actividad reciente registrada."
                  />
                ) : (
                  <div className="divide-y divide-border rounded-xl border">
                    {activity.map((a) => (
                      <div key={a.id} className="px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-sm font-semibold">{a.action}</p>
                          <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(a.created_at)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.entity_type}
                          {a.entity_id ? ` · ${a.entity_id}` : ""}
                        </p>
                        {a.detail && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                            {a.detail}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="permissions" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div>
                    <Label>Rol</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      El rol define los permisos base. Los ajustes avanzados viven en Configuración
                      → Seguridad.
                    </p>
                  </div>
                  <Select
                    value={selected?.role || "viewer"}
                    onValueChange={(v) => void updateSelectedRole(v as AppRole)}
                    disabled={!can("team.manage")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(r, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selected?.role && <PermissionPreview role={selected.role} />}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
