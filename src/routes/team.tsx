import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Mail,
  MoreHorizontal,
  Shield,
  UserCheck,
  UserCog,
  UserX,
  Users,
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
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
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
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

function PermissionPreview({ role }: { role: AppRole }) {
  const items = [
    { label: "View all records", on: role !== "sales_agent" && role !== "viewer" },
    { label: "View assigned records", on: role === "sales_agent" },
    { label: "Create records", on: role !== "viewer" },
    { label: "Edit records", on: role !== "viewer" },
    {
      label: "Delete records",
      on: role === "super_admin" || role === "admin" || role === "manager",
    },
    { label: "Assign users", on: role === "super_admin" || role === "admin" || role === "manager" },
    { label: "Manage users", on: role === "super_admin" || role === "admin" },
    { label: "Manage settings", on: role === "super_admin" || role === "admin" },
    { label: "Export data", on: role !== "viewer" },
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
            <p className="text-xs text-muted-foreground">Derived from the user role</p>
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
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
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
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { invite } = useInviteUser();
  const { updateRole } = useUpdateUserRole();
  const { toggleStatus } = useToggleUserStatus();

  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

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
    if (error) return;
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

  const openDrawer = (row: TeamUserRow) => {
    setSelected(row);
    setDetailsOpen(true);
  };

  const doInvite = async () => {
    if (!can("team.manage")) {
      toast.error("No tienes permiso para invitar usuarios");
      return;
    }
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setInviteSending(true);
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      const res = await invite({
        email,
        role: inviteRole,
        full_name: inviteFullName.trim() || undefined,
        department: inviteDepartment.trim() || undefined,
        redirectTo,
      });
      if (res.email_sent) {
        toast.success("Invitación enviada por email");
      } else {
        toast.success("Invitación creada");
        toast.message(
          res.resend_error
            ? `Email no enviado: ${res.resend_error}`
            : "Proveedor de email no configurado. Copia el link manualmente.",
        );
      }
      setInviteLink(res.invitation_link);
      toast.message("Puedes copiar el enlace de invitación.");

      setInviteEmail("");
      setInviteFullName("");
      setInviteDepartment("");
      setInviteRole("viewer");
      await loadInvites();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la invitación");
    } finally {
      setInviteSending(false);
    }
  };

  const updateSelectedRole = async (newRole: AppRole) => {
    if (!selected) return;
    if (!can("team.manage")) {
      toast.error("No tienes permiso para cambiar roles");
      return;
    }
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
    if (!can("team.manage")) {
      toast.error("No tienes permiso para administrar acceso");
      return;
    }
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
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Team & Users"
        subtitle="Manage your team members, their access, and permissions."
      >
        {can("team.manage") && (
          <Button onClick={() => setInviteOpen(true)} size="sm">
            Invite User
          </Button>
        )}
      </PageHeader>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DataCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Total Users
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All team members</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </DataCard>
        <DataCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Active Users
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stats.active}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently active</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </DataCard>
        <DataCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Pending Invitations
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stats.pendingInv}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting acceptance</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Mail className="h-5 w-5" />
            </div>
          </div>
        </DataCard>
        <DataCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Admins & Managers
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stats.adminsManagers}</p>
              <p className="text-xs text-muted-foreground mt-1">Elevated access</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </DataCard>
        <DataCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Inactive Users
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground mt-1">Deactivated users</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </DataCard>
      </section>

      <DataCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b">
          <Input
            placeholder="Search by name, email, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-80"
          />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Role: All</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TeamUserStatusFilter)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as any)}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Department: All</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserCog className="h-6 w-6" />}
              title="No users found"
              description="Try changing filters or invite a teammate."
              actionLabel={can("team.manage") ? "Invite user" : undefined}
              onAction={() => setInviteOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.profile_id}
                    className="cursor-pointer"
                    onClick={() => openDrawer(u)}
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-slate-900 font-extrabold">
                          {initials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold truncate">{u.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
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
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`rounded-full border ${statusTone(u.is_active)}`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 min-w-[180px]">
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground font-semibold">
                          Leads {u.leads_assigned}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground font-semibold">
                          Tasks {u.tasks_assigned}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground font-semibold">
                          Deals {u.deals_assigned}
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
                        onClick={() => openDrawer(u)}
                        aria-label="Open details"
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
          if (!o) {
            setInviteEmail("");
            setInviteFullName("");
            setInviteDepartment("");
            setInviteRole("viewer");
            setInviteLink(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  placeholder="Sales"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteLink && (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Invitation link</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink);
                        toast.success("Enlace copiado");
                      } catch {
                        toast.error("No se pudo copiar automáticamente. Cópialo manualmente.");
                      }
                    }}
                  >
                    Copy link
                  </Button>
                </div>
                <Input value={inviteLink} readOnly />
                <p className="text-xs text-muted-foreground">
                  Comparte este enlace con el usuario. Se prellenará el email y el token en el Sign
                  Up.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={inviteSending}
              >
                Cancel
              </Button>
              <Button onClick={() => void doInvite()} disabled={inviteSending}>
                {inviteSending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={detailsOpen}
        onOpenChange={(o) => {
          if (!o) setDetailsOpen(false);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-5 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg truncate">
                  {selected?.full_name || "User"}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {selected?.email || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected?.role && (
                    <Badge
                      variant="secondary"
                      className={`rounded-full border ${roleTone(selected.role)}`}
                    >
                      {selected.role}
                    </Badge>
                  )}
                  {selected && (
                    <Badge
                      variant="secondary"
                      className={`rounded-full border ${statusTone(selected.is_active)}`}
                    >
                      {selected.is_active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="p-5">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Department</p>
                    <p className="text-sm font-semibold">{selected?.department || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Joined</p>
                    <p className="text-sm font-semibold">{fmtDate(selected?.joined_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Last activity</p>
                    <p className="text-sm font-semibold">{fmtDate(selected?.last_activity_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Reports to</p>
                    <p className="text-sm font-semibold">—</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                    <p className="text-sm font-semibold">—</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Timezone</p>
                    <p className="text-sm font-semibold">—</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toast.message("Resend invitation: coming soon")}
                    disabled={!can("team.manage")}
                  >
                    Resend invitation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.message("Reset password: requires backend function")}
                    disabled={!can("team.manage")}
                  >
                    Reset password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void setSelectedActive(true)}
                    disabled={!can("team.manage") || !!selected?.is_active}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void setSelectedActive(false)}
                    disabled={!can("team.manage") || !selected?.is_active}
                  >
                    Deactivate
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4 space-y-3">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading activity…</div>
                ) : activity.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-6 w-6" />}
                    title="No activity yet"
                    description="This user has no recent activity logs."
                  />
                ) : (
                  <div className="space-y-2">
                    {activity.map((a) => (
                      <div key={a.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{a.action}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.entity_type}
                              {a.entity_id ? ` · ${a.entity_id}` : ""}
                            </p>
                            {a.detail && (
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                {a.detail}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(a.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 space-y-4">
                <div className="rounded-md border bg-blue-50 text-blue-800 p-3 text-sm">
                  Role is the source of truth. Fine-grained permissions are managed in Settings →
                  Security.
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
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
                          {r}
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

      {can("team.manage") && (
        <DataCard className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b">
            <div>
              <p className="text-sm font-extrabold tracking-tight">Invitations</p>
              <p className="text-xs text-muted-foreground">Recent invitations for your company.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadInvites()}
              disabled={invitesLoading}
            >
              Refresh
            </Button>
          </div>
          {invites.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Mail className="h-6 w-6" />}
                title="No invitations"
                description="Invite a user to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-5 font-semibold">{inv.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full border ${roleTone(inv.role)}`}
                        >
                          {inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="rounded-full border bg-slate-100 text-slate-700 border-slate-200"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(inv.expires_at)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={inv.status !== "pending"}
                          onClick={async () => {
                            const { error: err } = await (supabase as any)
                              .from("invitations")
                              .update({ status: "revoked" })
                              .eq("id", inv.id);
                            if (err) toast.error(err.message || "No se pudo revocar");
                            else {
                              toast.success("Invitación revocada");
                              await loadInvites();
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DataCard>
      )}
    </div>
  );
}
