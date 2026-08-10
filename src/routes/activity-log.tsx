import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Boxes, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataCard } from "@/components/crm/data-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingTable } from "@/components/crm/loading-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/activity-log")({
  component: ActivityLogPage,
  head: () => ({ meta: [{ title: "Registro de actividad — Corevix CRM" }] }),
});

type ActivityRow = {
  id: string;
  action: string;
  detail: string | null;
  entity_type: string;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActivityLogPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadLogs = async () => {
      if (!profile?.company_id) return;
      setLoading(true);
      const { data } = await (supabase as any)
        .from("activity_logs")
        .select("id,action,detail,entity_type,created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(250);

      if (cancelled) return;
      setLogs(data || []);
      setLoading(false);
    };

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      `${log.action} ${log.detail || ""} ${log.entity_type}`.toLowerCase().includes(term),
    );
  }, [logs, search]);

  const entitySummary = useMemo(() => {
    return Object.entries(
      logs.reduce<Record<string, number>>((acc, item) => {
        acc[item.entity_type] = (acc[item.entity_type] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [logs]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Registro de actividad"
        subtitle="Timeline global del CRM con eventos recientes en ventas, operaciones y soporte."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <MetricCard label="Eventos recientes" value={logs.length} icon={Activity} size="compact" />
        <MetricCard
          label="Entidades activas"
          value={new Set(logs.map((log) => log.entity_type)).size}
          icon={Boxes}
          size="compact"
        />
        <MetricCard
          label="Top de actividad"
          value={entitySummary[0]?.[0] || "—"}
          icon={ListChecks}
          size="compact"
        />
      </div>

      <DataCard noPadding className="overflow-hidden">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Ultimos 250 eventos disponibles para tu empresa.</CardDescription>
        </CardHeader>
        <div className="border-b border-border/40 px-4 pb-4 sm:px-6">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar acción, entidad o detalle..."
            mobileCollapsible={false}
          />
        </div>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <LoadingTable rows={8} cols={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No hay actividad para mostrar"
              description="Todavia no se han registrado eventos o el filtro actual no coincide."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Accion</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell>{log.detail || "Sin detalle"}</TableCell>
                        <TableCell>{formatDateTime(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-2 md:hidden">
                {filtered.map((log) => (
                  <article key={log.id} className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">{log.action}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {log.entity_type}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {log.detail || "Sin detalle"}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </DataCard>
    </div>
  );
}
