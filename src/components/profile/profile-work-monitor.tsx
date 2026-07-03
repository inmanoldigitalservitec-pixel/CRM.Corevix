import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CheckSquare,
  FolderOpen,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTeamUsers } from "@/hooks/use-team-users";
import { useUserActivity } from "@/hooks/use-user-activity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProfileWorkMonitorProps = {
  profileId: string | null;
  userId: string | null;
};

type ExtraCounts = {
  projects: number;
  tickets: number;
};

type WorkRoute = "/tasks" | "/leads" | "/pipeline" | "/projects" | "/tickets";

function formatDateTime(value?: string | null) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return date.toLocaleString();
}

function WorkMetric({
  icon: Icon,
  label,
  value,
  href,
  tone = "slate",
}: {
  icon: ElementType;
  label: string;
  value: number;
  href: WorkRoute;
  tone?: "blue" | "emerald" | "violet" | "amber" | "rose" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <Link to={href} className="rounded-2xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-2xl font-black text-slate-950">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">Open assigned work</p>
    </Link>
  );
}

export function ProfileWorkMonitor({ profileId, userId }: ProfileWorkMonitorProps) {
  const db = supabase as any;
  const { data: teamUsers, loading: teamLoading, refetch: refetchTeam } = useTeamUsers({ enabled: !!profileId });
  const { data: activity, loading: activityLoading, refetch: refetchActivity } = useUserActivity(profileId, 10);
  const [extraCounts, setExtraCounts] = useState<ExtraCounts>({ projects: 0, tickets: 0 });
  const [extraLoading, setExtraLoading] = useState(false);

  const teamRow = useMemo(() => {
    if (!profileId && !userId) return null;
    return (
      teamUsers.find((row) => row.profile_id === profileId) ||
      teamUsers.find((row) => row.user_id === userId) ||
      null
    );
  }, [profileId, teamUsers, userId]);

  const loadExtraCounts = async () => {
    if (!profileId) return;
    setExtraLoading(true);
    const [projectsResult, ticketsResult] = await Promise.all([
      db.from("projects").select("id", { count: "exact", head: true }).eq("manager", profileId),
      db
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", profileId)
        .neq("status", "Closed"),
    ]);
    setExtraCounts({
      projects: projectsResult.error ? 0 : projectsResult.count || 0,
      tickets: ticketsResult.error ? 0 : ticketsResult.count || 0,
    });
    setExtraLoading(false);
  };

  useEffect(() => {
    void loadExtraCounts();
  }, [profileId]);

  const refresh = () => {
    void refetchTeam();
    void refetchActivity();
    void loadExtraCounts();
  };

  const loading = teamLoading || extraLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">Work Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Assigned work and recent activity for this profile.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading || activityLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <WorkMetric icon={CheckSquare} label="Tasks" value={teamRow?.tasks_assigned || 0} href="/tasks" tone="rose" />
        <WorkMetric icon={Users} label="Leads" value={teamRow?.leads_assigned || 0} href="/leads" tone="violet" />
        <WorkMetric icon={BriefcaseBusiness} label="Deals" value={teamRow?.deals_assigned || 0} href="/pipeline" tone="emerald" />
        <WorkMetric icon={FolderOpen} label="Projects" value={extraCounts.projects} href="/projects" tone="blue" />
        <WorkMetric icon={Ticket} label="Tickets" value={extraCounts.tickets} href="/tickets" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : activity.length ? (
              <div className="space-y-2">
                {activity.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-white p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.action}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.detail || item.entity_type}</p>
                      </div>
                      <Badge variant="secondary" className="w-fit shrink-0">
                        {item.entity_type}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-muted-foreground">
                No recent activity found for this profile.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Profile Work Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last activity</p>
              <p className="mt-1 font-semibold text-slate-950">{formatDateTime(teamRow?.last_activity_at)}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
              <p className="mt-1 text-muted-foreground">
                Counts are based on CRM assignments currently linked to this profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
