import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REPORTS = [
  {
    id: "invoices",
    label: "Reporte de facturas",
    table: "invoice_finance_summary",
    dateKey: "date_issued",
    amountKey: "total",
  },
  {
    id: "payments",
    label: "Pagos recibidos",
    table: "payments",
    dateKey: "payment_date",
    amountKey: "amount",
  },
  {
    id: "credit_notes",
    label: "Reporte de notas de crédito",
    table: "credit_notes",
    dateKey: "date_issued",
    amountKey: "amount",
  },
  {
    id: "estimates",
    label: "Reporte de cotizaciones",
    table: "estimates",
    dateKey: "date_issued",
    amountKey: "total",
  },
  {
    id: "proposals",
    label: "Reporte de propuestas",
    table: "proposals",
    dateKey: "created_at",
    amountKey: "total",
  },
  {
    id: "expenses",
    label: "Reporte de gastos",
    table: "expenses",
    dateKey: "expense_date",
    amountKey: "amount",
  },
  {
    id: "subscriptions",
    label: "Subscriptions / MRR",
    table: "subscriptions",
    dateKey: "start_date",
    amountKey: "amount",
  },
  {
    id: "customers",
    label: "Reporte de clientes",
    table: "clients",
    dateKey: "created_at",
    amountKey: "",
  },
] as const;

const PERIODS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Mes pasado" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type ReportId = (typeof REPORTS)[number]["id"];
type Row = Record<string, any>;
type ReportClientRow = {
  id: string;
  company_name?: string | null;
};
type ReportInvoiceRow = {
  id: string;
  number?: string | null;
  client_id?: string | null;
};

function money(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function getPeriodRange(period: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "this_month")
    return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  if (period === "last_month")
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
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
  const csv = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c.key])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function columnsFor(reportId: ReportId) {
  if (reportId === "invoices")
    return [
      { key: "number", label: "Factura #" },
      { key: "client_name", label: "Cliente" },
      { key: "date_issued", label: "Fecha" },
      { key: "due_date", label: "Vencimiento" },
      { key: "total", label: "Monto" },
      { key: "paid_amount", label: "Pagado" },
      { key: "credit_amount", label: "Crédito" },
      { key: "balance_due", label: "Balance" },
      { key: "finance_status", label: "Estado" },
    ];
  if (reportId === "payments")
    return [
      { key: "payment_number", label: "Pago #" },
      { key: "client_name", label: "Cliente" },
      { key: "invoice_number", label: "Factura" },
      { key: "payment_date", label: "Fecha" },
      { key: "method", label: "Método" },
      { key: "amount", label: "Monto" },
      { key: "status", label: "Estado" },
    ];
  if (reportId === "credit_notes")
    return [
      { key: "credit_note_number", label: "Credit #" },
      { key: "client_name", label: "Cliente" },
      { key: "invoice_number", label: "Factura" },
      { key: "date_issued", label: "Fecha" },
      { key: "reason", label: "Razón" },
      { key: "amount", label: "Monto" },
      { key: "status", label: "Estado" },
    ];
  if (reportId === "expenses")
    return [
      { key: "title", label: "Gasto" },
      { key: "vendor", label: "Proveedor" },
      { key: "category", label: "Categoría" },
      { key: "expense_date", label: "Fecha" },
      { key: "amount", label: "Monto" },
      { key: "status", label: "Estado" },
    ];
  if (reportId === "subscriptions")
    return [
      { key: "name", label: "Suscripción" },
      { key: "client_name", label: "Cliente" },
      { key: "billing_cycle", label: "Ciclo" },
      { key: "start_date", label: "Inicio" },
      { key: "next_billing_date", label: "Próxima facturación" },
      { key: "amount", label: "Monto" },
      { key: "status", label: "Estado" },
    ];
  if (reportId === "customers")
    return [
      { key: "company_name", label: "Cliente" },
      { key: "contact_person", label: "Contacto" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Teléfono" },
      { key: "status", label: "Estado" },
      { key: "created_at", label: "Creado" },
    ];
  return [
    { key: "number", label: "#" },
    { key: "title", label: "Título" },
    { key: "client_name", label: "Cliente" },
    { key: "date", label: "Fecha" },
    { key: "total", label: "Monto" },
    { key: "status", label: "Estado" },
  ];
}

function chartGroupKey(reportId: ReportId, row: Row) {
  if (reportId === "payments") return row.method || "Manual";
  if (reportId === "subscriptions") return row.billing_cycle || "Sin ciclo";
  if (reportId === "customers") return row.status || "Sin estado";
  if (reportId === "expenses") return row.category || row.status || "General";
  return row.finance_status || row.status || "Sin estado";
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
      db
        .from("clients")
        .select("id,company_name,contact_person,email,phone,status,created_at")
        .eq("company_id", cid)
        .limit(2000),
      db.from("invoices").select("id,number,client_id").eq("company_id", cid).limit(2000),
      db.from(config.table).select("*").eq("company_id", cid).limit(2000),
    ]);

    const err = clientsRes.error || invoicesRes.error || dataRes.error;
    if (err) {
      toast.error(err.message || "No se pudo generar el reporte.");
      setLoading(false);
      return;
    }

    const clients = new Map<string, ReportClientRow>(
      (clientsRes.data || []).map((c: ReportClientRow) => [c.id, c]),
    );
    const invoices = new Map<string, ReportInvoiceRow>(
      (invoicesRes.data || []).map((i: ReportInvoiceRow) => [i.id, i]),
    );
    const invoiceByNumber = new Map<string, ReportInvoiceRow>(
      (invoicesRes.data || [])
        .filter((i: ReportInvoiceRow) => Boolean(i.number))
        .map((i: ReportInvoiceRow) => [String(i.number), i]),
    );

    const hydrated = (dataRes.data || []).map((row: any) => {
      const invoice = row.invoice_id
        ? invoices.get(row.invoice_id)
        : row.invoice_id === undefined && row.number
          ? invoiceByNumber.get(row.number)
          : null;
      const client = row.client_id
        ? clients.get(row.client_id)
        : invoice?.client_id
          ? clients.get(invoice.client_id)
          : null;
      return {
        ...row,
        client_name: client?.company_name || "—",
        invoice_number: invoice?.number || row.number || "—",
        date:
          row.date_issued ||
          row.created_at ||
          row.payment_date ||
          row.expense_date ||
          row.start_date,
      };
    });

    setRows(hydrated);
    setLoading(false);
  };

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [activeReport, profile?.company_id]);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.finance_status || row.status).filter(Boolean)),
      ).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = row.finance_status || row.status || "";
      const rowDate = row[config.dateKey] || row.date;
      const text = columns
        .map((c) => row[c.key])
        .join(" ")
        .toLowerCase();
      return (
        inPeriod(rowDate, period) &&
        (status === "all" || rowStatus === status) &&
        (!q || text.includes(q))
      );
    });
  }, [columns, config.dateKey, period, rows, search, status]);

  const totalAmount = filtered.reduce((sum, row) => sum + Number(row[config.amountKey] || 0), 0);
  const paidOrClosed = filtered.filter((row) =>
    ["Paid", "Completed", "Accepted", "Converted", "Applied", "Issued", "Active"].includes(
      row.finance_status || row.status,
    ),
  ).length;

  const chartData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; amount: number; count: number; paid: number; balance: number }
    >();
    filtered.forEach((row) => {
      const name = chartGroupKey(activeReport, row);
      const current = map.get(name) || { name, amount: 0, count: 0, paid: 0, balance: 0 };
      current.amount += Number(row[config.amountKey] || 0);
      current.paid += Number(row.paid_amount || 0);
      current.balance += Number(row.balance_due || 0);
      current.count += 1;
      map.set(name, current);
    });
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [activeReport, config.amountKey, filtered]);

  return (
    <div className="border-y border-slate-100 bg-white">
      <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 text-[11px] font-normal uppercase tracking-wide text-slate-500">
            Reportes
          </div>
          <div className="space-y-1">
            {REPORTS.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  setActiveReport(report.id);
                  setStatus("all");
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between border-b px-0 py-2.5 text-left text-sm font-normal transition ${
                  activeReport === report.id
                    ? "border-blue-500 text-slate-950"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-950"
                }`}
              >
                {report.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="p-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px]">
            <div>
              <div className="text-sm font-normal text-slate-950">Reporte generado</div>
              <p className="text-sm font-normal text-slate-500">{config.label}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Periodo
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Estado
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <Summary label="Filas" value={String(filtered.length)} />
            <Summary label="Total" value={config.amountKey ? money(totalAmount) : "—"} />
            <Summary label="Cerrados/pagados" value={String(paidOrClosed)} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="border-y border-slate-100 py-4">
              <div className="mb-3 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Gráfico por grupo
              </div>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "count" ? value : money(value)
                      }
                    />
                    <Bar
                      dataKey={config.amountKey ? "amount" : "count"}
                      radius={[6, 6, 0, 0]}
                      fill="#2563eb"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-[260px] place-items-center text-sm font-normal text-slate-500">
                  Todavía no hay datos para graficar.
                </div>
              )}
            </div>
            <div className="border-y border-slate-100 py-4">
              <div className="mb-3 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Distribución
              </div>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey={config.amountKey ? "amount" : "count"}
                      nameKey="name"
                      outerRadius={88}
                      label={({ name }) => name}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => (config.amountKey ? money(value) : value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-[260px] place-items-center text-sm font-normal text-slate-500">
                  Todavía no hay datos de distribución.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar en el reporte..."
                  className="h-9 w-72 rounded-none border-0 border-b border-slate-200 bg-white pl-7 pr-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                variant="default"
                className="h-9 rounded-full bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
                onClick={() => downloadCsv(`${activeReport}-report.csv`, filtered, columns)}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden border-y border-slate-100">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        Generating report...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length ? (
                    filtered.map((row, index) => (
                      <TableRow key={row.id || index}>
                        {columns.map((column) => (
                          <TableCell key={column.key} className="font-normal text-slate-700">
                            {renderCell(column.key, row[column.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No records found for this report.
                      </TableCell>
                    </TableRow>
                  )}
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
  if (["total", "amount", "paid_amount", "credit_amount", "balance_due"].includes(key))
    return money(value);
  if (
    key.includes("date") ||
    key === "created_at" ||
    key === "start_date" ||
    key === "next_billing_date"
  )
    return dateLabel(value);
  if (key === "status" || key === "finance_status") return <StatusBadge status={value || "—"} />;
  return value || "—";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <div className="truncate text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-2xl font-normal leading-none text-slate-950">{value}</div>
    </div>
  );
}
