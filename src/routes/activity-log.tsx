import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registro de actividad</h1>
        <p className="text-sm text-muted-foreground">
          Timeline global del CRM con eventos recientes en ventas, operaciones y soporte.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Eventos recientes</CardDescription>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entidades activas</CardDescription>
            <CardTitle className="text-3xl">
              {new Set(logs.map((log) => log.entity_type)).size}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Top de actividad</CardDescription>
            <CardTitle className="text-base">
              {entitySummary.length
                ? entitySummary.map(([key, count]) => `${key} (${count})`).join(", ")
                : "Sin datos"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Ultimos 250 eventos disponibles para tu empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingTable rows={8} cols={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No hay actividad para mostrar"
              description="Todavia no se han registrado eventos o el filtro actual no coincide."
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
