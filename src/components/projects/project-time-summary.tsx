type TimeSummaryCard = {
  label: string;
  value: string;
  hint: string;
};

function SummaryCard({ label, value, hint }: TimeSummaryCard) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function ProjectTimeSummary({
  total,
  billable,
  nonBillable,
  entries,
}: {
  total: string;
  billable: string;
  nonBillable: string;
  entries: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total" value={total} hint="Horas registradas en el proyecto" />
      <SummaryCard label="Facturable" value={billable} hint="Tiempo listo para billing futuro" />
      <SummaryCard label="No facturable" value={nonBillable} hint="Trabajo interno o no cobrable" />
      <SummaryCard label="Entradas" value={entries} hint="Sesiones registradas hasta ahora" />
    </div>
  );
}
