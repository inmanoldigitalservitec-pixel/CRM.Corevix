import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REPORTS = [
  { id: "invoices", label: "Invoices Report", table: "invoice_finance_summary", dateKey: "date_issued", amountKey: "total" },
  { id: "payments", label: "Payments Received", table: "payments", dateKey: "payment_date", amountKey: "amount" },
  { id: "credit_notes", label: "Credit Notes Report", table: "credit_notes", dateKey: "date_issued", amountKey: "amount" },
  { id: "estimates", label: "Estimates Report", table: "estimates", dateKey: "date_issued", amountKey: "total" },
  { id: "proposals", label: "Proposals Report", table: "proposals", dateKey: "created_at", amountKey: "total" },
  { id: "expenses", label: "Expenses Report", table: "expenses", dateKey: "expense_date", amountKey: "amount" },
  { id: "subscriptions", label: "Subscriptions / MRR", table: "subscriptions", dateKey: "start_date", amountKey: "amount" },
  { id: "customers", label: "Customers Report", table: "clients", dateKey: "created_at", amountKey: "" },
] as const;

const PERIODS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "all", label: "All Time" },
];

type ReportId = typeof REPORTS[number]["id"];
type Row = Record<string, any>;

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function getPeriodRange(period: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "this_month") return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  if (period === "last_month") return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
  if (period === "this_quarter") {
    const q = Math.floor(month / 3) * 3;
    return { start: new Date(year, q, 1), end: new Date(year, q + 3, 1) };
  }
  if (period === "this_year") return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  return { start: null, end: null };
}

function inPeriod(value: string | null | undefined, period: string) {
  if (period === "all") return true;
  if (!value) return false;
  const date = new Date(value);
  const { start, end } = getPeriodRange(period);
  if (!start || !end) return true;
  return date >= start && date < end;
}

function downloadCsv(filename: string, rows: Row[], columns: { key: string; label: string }[]) {
  const escape = (value: any) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.map((c) => escape(c.label)).join(","), ...rows.map((row) => columns.map((c) => escape(row[c.key])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function columnsFor(reportId: ReportId) {
  if (reportId === "invoices") return [
    { key: "number", label: "Invoice #" }, { key: "client_name", label: "Customer" }, { key: "date_issued", label: "Date" }, { key: "due_date", label: "Due Date" }, { key: "total", label: "Amount" }, { key: "paid_amount", label: "Paid" }, { key: "credit_amount", label: "Credit" }, { key: "balance_due", label: "Balance" }, { key: "finance_status", label: "Status" },
  ];
  if (reportId === "payments") return [
    { key: "payment_number", label: "Payment #" }, { key: "client_name", label: "Customer" }, { key: "invoice_number", label: "Invoice" }, { key: "payment_date", label: "Date" }, { key: "method", label: "Method" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" },
  ];
  if (reportId === "credit_notes") return [
    { key: "credit_note_number", label: "Credit #" }, { key: "client_name", label: "Customer" }, { key: "invoice_number", label: "Invoice" }, { key: "date_issued", label: "Date" }, { key: "reason", label: "Reason" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" },
  ];
  if (reportId === "expenses") return [
    { key: "title", label: "Expense" }, { key: "vendor", label: "Vendor" }, { key: "category", label: "Category" }, { key: "expense_date", label: "Date" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" },
  ];
  if (reportId === "subscriptions") return [
    { key: "name", label: "Subscription" }, { key: "client_name", label: "Customer" }, { key: "billing_cycle", label: "Cycle" }, { key: "start_date", label: "Start" }, { key: "next_billing_date", label: "Next Billing" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" },
  ];
  if (reportId === "customers") return [
    { key: "company_name", label: "Customer" }, { key: "contact_person", label: "Contact" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }, { key: "created_at", label: "Created" },
  ];
  return [
    { key: "number", label: "#" }, { key: "title", label: "Title" }, { key: "client_name", label: "Customer" }, { key: "date", label: "Date" }, { key: "total", label: "Amount" }, { key: "status", label: "Status" },
  ];
}

export function SalesReportCenter() {
  const { profile } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportId>("invoices");
  const [period, setPeriod] = useState("this_month");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const db = supabase as any;

  const config = REPORTS.find((report) => report.id === activeReport)!;
  const columns = columnsFor(activeReport);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [clientsRes, invoicesRes, dataRes] = await Promise.all([
      db.from("clients").select("id,company_name,contact_person,email,phone,status,created_at").eq("company_id", cid).limit(2000),
      db.from("invoices").select("id,number,client_id").eq("company_id", cid).limit(2000),
      db.from(config.table).select("*").eq("company_id", cid).limit(2000),
    ]);

    const err = clientsRes.error || invoicesRes.error || dataRes.error;
    if (err) {
      toast.error(err.message || "No se pudo generar el reporte.");
      setLoading(false);
      return;
    }

    const clients = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
    const invoices = new Map((invoicesRes.data || []).map((i: any) => [i.id, i]));
    const invoiceByNumber = new Map((invoicesRes.data || []).map((i: any) => [i.number, i]));

    const hydrated = (dataRes.data || []).map((row: any) => {
      const invoice = row.invoice_id ? invoices.get(row.invoice_id) : row.invoice_id === undefined && row.number ? invoiceByNumber.get(row.number) : null;
      const client = row.client_id ? clients.get(row.client_id) : invoice?.client_id ? clients.get(invoice.client_id) : null;
      return {
        ...row,
        client_name: client?.company_name || "—",
        invoice_number: invoice?.number || row.number || "—",
        date: row.date_issued || row.created_at || row.payment_date || row.expense_date || row.start_date,
      };
    });

    setRows(hydrated);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeReport, profile?.company_id]);

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.finance_status || row.status).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = row.finance_status || row.status || "";
      const rowDate = row[config.dateKey] || row.date;
      const text = columns.map((c) => row[c.key]).join(" ").toLowerCase();
      return inPeriod(rowDate, period) && (status === "all" || rowStatus === status) && (!q || text.includes(q));
    });
  }, [columns, config.dateKey, period, rows, search, status]);

  const totalAmount = filtered.reduce((sum, row) => sum + Number(row[config.amountKey] || 0), 0);
  const paidOrClosed = filtered.filter((row) => ["Paid", "Completed", "Accepted", "Converted", "Applied", "Issued", "Active"].includes(row.finance_status || row.status)).length;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="border-b p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 font-extrabold text-slate-900">Sales Report</div>
          <div className="space-y-1">
            {REPORTS.map((report) => (
              <button key={report.id} type="button" onClick={() => { setActiveReport(report.id); setStatus("all"); setSearch(""); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold ${activeReport === report.id ? "border bg-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                {report.label}<ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </aside>

        <section className="p-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px]">
            <div><div className="font-extrabold text-slate-900">Generated Report</div><p className="text-sm font-medium text-slate-500">{config.label}</p></div>
            <div><div className="mb-1 text-xs font-bold text-slate-600">Period</div><Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
            <div><div className="mb-1 text-xs font-bold text-slate-600">Status</div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Summary label="Rows" value={String(filtered.length)} />
            <Summary label="Total" value={config.amountKey ? money(totalAmount) : "—"} />
            <Summary label="Closed/Paid" value={String(paidOrClosed)} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={() => downloadCsv(`${activeReport}-report.csv`, filtered, columns)}><Download className="mr-2 h-4 w-4" />Export CSV</Button></div>
            <div className="relative sm:w-72"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={columns.length} className="py-8 text-center text-sm text-slate-500">Generating report...</TableCell></TableRow> : filtered.length ? filtered.map((row, index) => (
                    <TableRow key={row.id || index}>{columns.map((column) => <TableCell key={column.key}>{renderCell(column.key, row[column.key])}</TableCell>)}</TableRow>
                  )) : <TableRow><TableCell colSpan={columns.length} className="py-8 text-center text-sm text-slate-500">No records found for this report.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function renderCell(key: string, value: any) {
  if (["total", "amount", "paid_amount", "credit_amount", "balance_due"].includes(key)) return money(value);
  if (key.includes("date") || key === "created_at" || key === "start_date" || key === "next_billing_date") return dateLabel(value);
  if (key === "status" || key === "finance_status") return <StatusBadge status={value || "—"} />;
  return value || "—";
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-xl font-extrabold text-slate-950">{value}</div></div>;
}
