import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/crm/metric-card";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { Users, DollarSign, TrendingUp, CheckSquare, Receipt, CreditCard, BadgeDollarSign, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Corevix CRM" }] }),
});

const COLORS = ["oklch(0.546 0.245 262.881)", "oklch(0.6 0.2 160)", "oklch(0.7 0.18 45)", "oklch(0.65 0.22 310)"];

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([]);
  const [dealsByStage, setDealsByStage] = useState<any[]>([]);
  const [paymentsByMethod, setPaymentsByMethod] = useState<any[]>([]);
  const [invoiceFinance, setInvoiceFinance] = useState<any[]>([]);
  const db = supabase as any;

  const fetchReports = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;

    const [leadsRes, dealsRes, invoicesRes, tasksRes, paymentsRes, creditsRes, subsRes, expensesRes, estimatesRes, proposalsRes, financeRes] = await Promise.all([
      db.from("leads").select("id,status,estimated_value,created_at").eq("company_id", cid),
      db.from("deals").select("id,stage,value").eq("company_id", cid),
      db.from("invoices").select("id,status,total").eq("company_id", cid),
      db.from("tasks").select("id,status").eq("company_id", cid),
      db.from("payments").select("id,amount,method,status,payment_date").eq("company_id", cid),
      db.from("credit_notes").select("id,amount,status,date_issued").eq("company_id", cid),
      db.from("subscriptions").select("id,amount,billing_cycle,status").eq("company_id", cid),
      db.from("expenses").select("id,amount,status,expense_date").eq("company_id", cid),
      db.from("estimates").select("id,status,total").eq("company_id", cid),
      db.from("proposals").select("id,status,total").eq("company_id", cid),
      db.from("invoice_finance_summary").select("invoice_id,finance_status,total,paid_amount,credit_amount,balance_due").eq("company_id", cid),
    ]);

    const leads = leadsRes.data || [];
    const deals = dealsRes.data || [];
    const invoices = invoicesRes.data || [];
    const tasks = tasksRes.data || [];
    const payments = paymentsRes.data || [];
    const credits = creditsRes.data || [];
    const subs = subsRes.data || [];
    const expenses = expensesRes.data || [];
    const estimates = estimatesRes.data || [];
    const proposals = proposalsRes.data || [];
    const finance = financeRes.data || [];

    const wonDeals = deals.filter((d: any) => d.stage === "Won");
    const paidInvoices = finance.filter((i: any) => i.finance_status === "Paid");
    const unpaidInvoices = finance.filter((i: any) => Number(i.balance_due || 0) > 0);
    const completedPayments = payments.filter((p: any) => p.status === "Completed");
    const activeSubs = subs.filter((s: any) => s.status === "Active" || s.status === "Trial");
    const paidExpenses = expenses.filter((e: any) => e.status === "Paid" || e.status === "Approved");
    const issuedCredits = credits.filter((c: any) => c.status === "Issued" || c.status === "Applied");

    const mrr = activeSubs.reduce((sum: number, s: any) => {
      const amount = Number(s.amount || 0);
      if (s.billing_cycle === "Weekly") return sum + amount * 4;
      if (s.billing_cycle === "Quarterly") return sum + amount / 3;
      if (s.billing_cycle === "Yearly") return sum + amount / 12;
      return sum + amount;
    }, 0);

    const revenue = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || paidInvoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
    const expenseTotal = paidExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const creditTotal = issuedCredits.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

    setMetrics({
      totalLeads: leads.length,
      totalDeals: deals.length,
      revenue,
      completedTasks: tasks.filter((t: any) => t.status === "Completed").length,
      conversionRate: deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: unpaidInvoices.length,
      unpaidAmount: unpaidInvoices.reduce((sum: number, i: any) => sum + Number(i.balance_due || 0), 0),
      expenseTotal,
      netIncome: revenue - expenseTotal - creditTotal,
      mrr,
      creditTotal,
      estimateConversion: estimates.length ? Math.round((estimates.filter((e: any) => e.status === "Converted").length / estimates.length) * 100) : 0,
      proposalConversion: proposals.length ? Math.round((proposals.filter((p: any) => ["Accepted", "Converted"].includes(p.status)).length / proposals.length) * 100) : 0,
    });

    const statusMap: Record<string, number> = {};
    leads.forEach((l: any) => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
    setLeadsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    const stageMap: Record<string, number> = {};
    deals.forEach((d: any) => { stageMap[d.stage] = (stageMap[d.stage] || 0) + Number(d.value || 0); });
    setDealsByStage(Object.entries(stageMap).map(([stage, value]) => ({ stage, value })));

    const methodMap: Record<string, number> = {};
    completedPayments.forEach((p: any) => { methodMap[p.method || "Manual"] = (methodMap[p.method || "Manual"] || 0) + Number(p.amount || 0); });
    setPaymentsByMethod(Object.entries(methodMap).map(([method, value]) => ({ method, value })));

    const financeMap: Record<string, number> = {};
    finance.forEach((i: any) => { financeMap[i.finance_status || "Unknown"] = (financeMap[i.finance_status || "Unknown"] || 0) + 1; });
    setInvoiceFinance(Object.entries(financeMap).map(([name, value]) => ({ name, value })));
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <div className="p-6"><LoadingMetrics count={8} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground">Business analytics and sales finance flow</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Leads" value={metrics.totalLeads || 0} icon={Users} />
        <MetricCard label="Total Deals" value={metrics.totalDeals || 0} icon={DollarSign} />
        <MetricCard label="Revenue" value={money(metrics.revenue || 0)} icon={TrendingUp} />
        <MetricCard label="Tasks Done" value={metrics.completedTasks || 0} icon={CheckSquare} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Paid Invoices" value={metrics.paidInvoices || 0} icon={Receipt} />
        <MetricCard label="Unpaid" value={money(metrics.unpaidAmount || 0)} icon={CreditCard} />
        <MetricCard label="Expenses" value={money(metrics.expenseTotal || 0)} icon={BadgeDollarSign} />
        <MetricCard label="MRR" value={money(metrics.mrr || 0)} icon={RotateCcw} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MiniCard label="Net Income" value={money(metrics.netIncome || 0)} />
        <MiniCard label="Credit Notes" value={money(metrics.creditTotal || 0)} />
        <MiniCard label="Estimate Conversion" value={`${metrics.estimateConversion || 0}%`} />
        <MiniCard label="Proposal Conversion" value={`${metrics.proposalConversion || 0}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Deal Value by Stage" empty="No deals data yet">{dealsByStage.length > 0 && <ResponsiveContainer width="100%" height={250}><BarChart data={dealsByStage}><XAxis dataKey="stage" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} /><Bar dataKey="value" fill="oklch(0.546 0.245 262.881)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</ChartCard>
        <ChartCard title="Payments by Method" empty="No payments data yet">{paymentsByMethod.length > 0 && <ResponsiveContainer width="100%" height={250}><BarChart data={paymentsByMethod}><XAxis dataKey="method" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} /><Bar dataKey="value" fill="oklch(0.6 0.2 160)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</ChartCard>
        <PieCard title="Invoice Finance Status" data={invoiceFinance} empty="No invoice finance data yet" />
        <PieCard title="Leads by Status" data={leadsByStatus} empty="No leads data yet" />
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold text-slate-950">{value}</div></div>;
}

function ChartCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent>{children || <p className="text-sm text-muted-foreground text-center py-12">{empty}</p>}</CardContent></Card>;
}

function PieCard({ title, data, empty }: { title: string; data: any[]; empty: string }) {
  return <Card className="border-0 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent>{data.length > 0 ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground text-center py-12">{empty}</p>}</CardContent></Card>;
}
