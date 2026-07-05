import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Send,
  Shield,
  UserCheck,
  UserCog,
  UserX,
  Users,
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

import { DataCard } from "@/components/crm/data-card";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "manager", "sales_agent", "viewer"];

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

function PermissionPreview({ role }: { role: AppRole }) {
  const { t } = useT();
  const items = [
    { label: t("team.permission.viewAllRecords"), on: role !== "sales_agent" && role !== "viewer" },
    { label: t("team.permission.viewAssignedRecords"), on: role === "sales_agent" },
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
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div>
            <p className="text-sm font-semibold">{it.label}</p>
            <p className="text-xs text-muted-foreground">{t("team.permission.derived")}</p>
          </div>
          <input type="checkbox" checked={it.on} readOnly />
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
      setInviteResult({ email, link: res.invitation_link, emailSent: res.email_sent });
      if (res.email_sent) toast.success("Invitación enviada por email");
      else toast.success("Invitación creada. Copia el enlace para compartirlo.");
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
      if (res.email_sent) toast.success("Invitación reenviada por email");
      else
        toast.message(
          res.resend_error
            ? `Email no enviado: ${res.resend_error}`
            : "Copia el enlace para compartirlo manualmente.",
        );
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
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle")}>
        {can("team.manage") && (
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <Send className="mr-2 h-4 w-4" />
            {t("team.inviteUser")}
          </Button>
        )}
      </PageHeader>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          [
            t("team.stats.total"),
            stats.total,
            t("team.stats.totalHelper"),
            Users,
            "bg-blue-50 text-blue-700",
          ],
          [
            t("team.stats.active"),
            stats.active,
            t("team.stats.activeHelper"),
            UserCheck,
            "bg-emerald-50 text-emerald-700",
          ],
          [
            t("team.stats.pendingInvitations"),
            stats.pendingInv,
            t("team.stats.pendingInvitationsHelper"),
            Mail,
            "bg-amber-50 text-amber-700",
          ],
          [
            t("team.stats.adminsManagers"),
            stats.adminsManagers,
            t("team.stats.adminsManagersHelper"),
            Shield,
            "bg-violet-50 text-violet-700",
          ],
          [
            t("team.stats.inactive"),
            stats.inactive,
            t("team.stats.inactiveHelper"),
            UserX,
            "bg-rose-50 text-rose-700",
          ],
        ].map(([label, value, helper, Icon, tone]: any) => (
          <DataCard key={label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </DataCard>
        ))}
      </section>

      {can("team.manage") && (
        <DataCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <p className="text-sm font-extrabold tracking-tight">
                {t("team.pendingInvitations")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("team.pendingInvitationsSubtitle")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadInvites()}
                disabled={invitesLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("profile.workMonitor.refresh")}
              </Button>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                {t("team.invite")}
              </Button>
            </div>
          </div>

          {invites.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Mail className="h-6 w-6" />}
                title="Sin invitaciones"
                description="Invita a alguien del equipo y su estado aparecerá aquí."
              />
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {invites.map((inv) => {
                const pending = inv.status === "pending";
                return (
                  <div key={inv.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950">
                          {inv.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                      </div>
                      {pending ? (
                        <CheckCircle2 className="h-5 w-5 text-amber-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      {t("team.expires")}: {daysUntil(inv.expires_at, t)} · {t("team.created")}{" "}
                      {fmtRelative(inv.created_at)} {t("team.ago")}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!pending}
                        onClick={() => void copyText(buildInvitationLink(inv))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!pending || busyInviteId === inv.id}
                        onClick={() => void doResendInvite(inv)}
                      >
                        {t("team.resend")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!pending || busyInviteId === inv.id}
                        onClick={() => void doRevokeInvite(inv)}
                      >
                        {t("team.revoke")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>
      )}

      <DataCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <Input
            placeholder="Buscar por nombre, email o departamento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-80"
          />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
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
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado: todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as any)}>
            <SelectTrigger className="h-9 w-full sm:w-[220px]">
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
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("profile.workMonitor.refresh")}
            </Button>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
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
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(u);
                      setDetailsOpen(true);
                    }}
                  >
                    <TableCell className="pl-5">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 font-extrabold text-slate-900">
                          {initials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-extrabold">{u.full_name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {u.email || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.department || "—"}</TableCell>
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
                        <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("profile.workMonitor.leads")} {u.leads_assigned}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("profile.workMonitor.tasks")} {u.tasks_assigned}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("profile.workMonitor.deals")} {u.deals_assigned}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{fmtRelative(u.last_activity_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(u.last_activity_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{fmtDate(u.joined_at)}</div>
                    </TableCell>
                    <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
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
        )}
      </DataCard>

      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) resetInviteForm();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {inviteResult ? t("team.invitationReady") : t("team.inviteTeammate")}
            </DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
                <p className="font-black">
                  {inviteResult.emailSent ? "Email enviado correctamente" : "Invitación creada"}
                </p>
                <p className="mt-1 text-sm text-emerald-800/80">
                  {inviteResult.emailSent
                    ? t("team.inviteSentTo", { email: inviteResult.email })
                    : t("team.copyInviteFor", { email: inviteResult.email })}
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Enlace de invitación</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText(inviteResult.link)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                </div>
                <Input value={inviteResult.link} readOnly />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => resetInviteForm()}>
                  {t("team.inviteAnother")}
                </Button>
                <Button onClick={() => setInviteOpen(false)}>{t("team.done")}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Nombre completo <span className="text-muted-foreground">opcional</span>
                  </Label>
                  <Input
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder={t("team.namePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Departamento <span className="text-muted-foreground">opcional</span>
                  </Label>
                  <Input
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder={t("team.departmentPlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
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
                <p className="text-xs text-muted-foreground">
                  El usuario heredará los permisos de este rol al aceptar la invitación.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteSending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void doInvite()}
                  disabled={inviteSending || !inviteEmail.trim()}
                >
                  {inviteSending ? "Enviando…" : "Enviar invitación"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={detailsOpen} onOpenChange={(o) => !o && setDetailsOpen(false)}>
        <SheetContent className="w-full p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 pb-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">
                {selected?.full_name || "Usuario"}
              </SheetTitle>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {selected?.email || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
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
          </SheetHeader>
          <div className="p-5">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="activity">Actividad</TabsTrigger>
                <TabsTrigger value="permissions">Permisos</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Departamento</p>
                    <p className="text-sm font-semibold">{selected?.department || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Ingreso</p>
                    <p className="text-sm font-semibold">{fmtDate(selected?.joined_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Última actividad</p>
                    <p className="text-sm font-semibold">{fmtDate(selected?.last_activity_at)}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void setSelectedActive(true)}
                    disabled={!can("team.manage") || !!selected?.is_active}
                  >
                    Activar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void setSelectedActive(false)}
                    disabled={!can("team.manage") || !selected?.is_active}
                  >
                    Desactivar
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
                  <div className="space-y-2">
                    {activity.map((a) => (
                      <div key={a.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{a.action}</p>
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
                          <div className="whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(a.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="permissions" className="mt-4 space-y-4">
                <div className="rounded-md border bg-blue-50 p-3 text-sm text-blue-800">
                  El rol es la fuente principal de permisos. Los permisos detallados se administran
                  en Configuración → Seguridad.
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
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
