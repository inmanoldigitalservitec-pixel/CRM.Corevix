import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "My Profile - Corevix CRM" },
      { name: "description", content: "Manage your Corevix CRM profile and account details." },
    ],
  }),
});

function initials(name?: string | null, email?: string | null) {
  const source = String(name || email || "User").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-white px-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value || "-"}</p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, profile, roles, loading } = useAuth();
  const db = supabase as any;
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    department: "",
    avatar_url: "",
  });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      phone: profile?.phone || "",
      department: profile?.department || "",
      avatar_url: profile?.avatar_url || "",
    });
  }, [profile, user]);

  const displayName = form.full_name || profile?.full_name || user?.email || "Corevix User";
  const email = user?.email || "No email";
  const primaryRole = roles[0] ? roleLabel(roles[0]) : "No role assigned";
  const joinedAt = formatDate(user?.created_at || null);
  const lastSignIn = formatDate(user?.last_sign_in_at || null);
  const accountStatus = profile?.is_active === false ? "Inactive" : "Active";

  const roleBadges = useMemo(() => roles.map((role) => roleLabel(role)), [roles]);

  const saveProfile = async () => {
    if (!profile?.id) {
      toast.error("No profile record found for this user.");
      return;
    }

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      department: form.department.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
    };

    const { error } = await db.from("profiles").update(payload).eq("id", profile.id);
    setSaving(false);

    if (error) {
      toast.error(error.message || "Could not update profile.");
      return;
    }

    toast.success("Profile updated.");
    setEditOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="My Profile" subtitle="Loading your profile..." />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your identity, contact details, role context, and account overview."
      >
        <Button size="sm" onClick={() => setEditOpen(true)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Edit Profile
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
              <Badge className="mb-2" variant={accountStatus === "Active" ? "default" : "destructive"}>
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
                <Badge variant="outline">No roles</Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={email} />
              <InfoRow icon={Phone} label="Phone" value={form.phone || "Not set"} />
              <InfoRow icon={Building2} label="Department" value={form.department || "Not set"} />
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</p>
                  <p className="text-sm font-black text-slate-950">{joinedAt}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow icon={UserCircle} label="Full name" value={displayName} />
                  <InfoRow icon={Mail} label="Login email" value={email} />
                  <InfoRow icon={Phone} label="Phone" value={form.phone || "Not set"} />
                  <InfoRow icon={Building2} label="Department" value={form.department || "Not set"} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Role & Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoRow icon={ShieldCheck} label="Primary role" value={primaryRole} />
                    <InfoRow icon={CheckCircle2} label="Account status" value={accountStatus} />
                    <InfoRow icon={CalendarDays} label="Joined" value={joinedAt} />
                    <InfoRow icon={Activity} label="Last sign in" value={lastSignIn} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Assigned roles</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roleBadges.length ? (
                        roleBadges.map((role) => <Badge key={role}>{role}</Badge>)
                      ) : (
                        <Badge variant="outline">No roles assigned</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Work Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-muted-foreground">
                    This first version only connects identity and editable profile details. Work metrics, timesheets, notifications, and security events will be connected in the next steps.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input
                id="profile-full-name"
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-department">Department</Label>
              <Input
                id="profile-department"
                value={form.department}
                onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                placeholder="Sales, Support, Operations..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-avatar">Avatar URL</Label>
              <Input
                id="profile-avatar"
                value={form.avatar_url}
                onChange={(event) => setForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
