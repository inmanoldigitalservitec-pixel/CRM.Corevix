import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/crm/metric-card";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { Users, DollarSign, TrendingUp, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Corevix CRM" }] }),
});

const COLORS = ["oklch(0.546 0.245 262.881)", "oklch(0.6 0.2 160)", "oklch(0.7 0.18 45)", "oklch(0.65 0.22 310)"];

function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([]);
  const [dealsByStage, setDealsByStage] = useState<any[]>([]);

  const db = supabase as any;

  const fetchReports = useCallback(async () => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;

    const [{ data: leads }, { data: deals }, { data: invoices }, { data: tasks }] = await Promise.all([
      db.from("leads").select("id, status, estimated_value, created_at").eq("company_id", cid),
      db.from("deals").select("id, stage, value").eq("company_id", cid),
      db.from("invoices").select("id, status, total").eq("company_id", cid),
      db.from("tasks").select("id, status").eq("company_id", cid),
    ]);

    const leadsArr = leads || [];
    const dealsArr = deals || [];
    const invoicesArr = invoices || [];
    const tasksArr = tasks || [];

    const wonDeals = dealsArr.filter((d: any) => d.stage === "Won");
    const paidInvoices = invoicesArr.filter((i: any) => i.status === "Paid");

    setMetrics({
      totalLeads: leadsArr.length,
      totalDeals: dealsArr.length,
      revenue: paidInvoices.reduce((s: number, i: any) => s + Number(i.total), 0),
      completedTasks: tasksArr.filter((t: any) => t.status === "Completed").length,
      conversionRate: dealsArr.length > 0 ? Math.round((wonDeals.length / dealsArr.length) * 100) : 0,
    });

    // Group leads by status
    const statusMap: Record<string, number> = {};
    leadsArr.forEach((l: any) => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
    setLeadsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    // Group deals by stage
    const stageMap: Record<string, number> = {};
    dealsArr.forEach((d: any) => { stageMap[d.stage] = (stageMap[d.stage] || 0) + Number(d.value); });
    setDealsByStage(Object.entries(stageMap).map(([stage, value]) => ({ stage, value })));

    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <div className="p-6"><LoadingMetrics count={8} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Business analytics and insights</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Leads" value={metrics.totalLeads || 0} icon={Users} />
        <MetricCard label="Total Deals" value={metrics.totalDeals || 0} icon={DollarSign} />
        <MetricCard label="Revenue" value={`$${(metrics.revenue || 0).toLocaleString()}`} icon={TrendingUp} />
        <MetricCard label="Tasks Done" value={metrics.completedTasks || 0} icon={CheckSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Deal Value by Stage</CardTitle></CardHeader>
          <CardContent>
            {dealsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealsByStage}>
                  <XAxis dataKey="stage" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="oklch(0.546 0.245 262.881)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No deals data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Leads by Status</CardTitle></CardHeader>
          <CardContent>
            {leadsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={leadsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                    {leadsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No leads data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
