import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCards } from "@/components/crm/loading-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadCsv } from "@/lib/download";

export const Route = createFileRoute("/csv-export")({
  component: CsvExportPage,
  head: () => ({ meta: [{ title: "Exportar CSV — Corevix CRM" }] }),
});

type ExportModule = {
  key: string;
  title: string;
  description: string;
  table: string;
  filename: string;
  select: string;
  columns: Array<{ key: string; label: string }>;
  count: number;
};

const INITIAL_MODULES: ExportModule[] = [
  {
    key: "clients",
    title: "Clientes",
    description: "Exporta cartera de clientes con datos base y estado operativo.",
    table: "clients",
    filename: "corevix-clientes.csv",
    select: "id,company_name,contact_person,email,phone,status,created_at",
    columns: [
      { key: "id", label: "ID" },
      { key: "company_name", label: "Empresa" },
      { key: "contact_person", label: "Contacto" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telefono" },
      { key: "status", label: "Estado" },
      { key: "created_at", label: "Creado" },
    ],
    count: 0,
  },
  {
    key: "leads",
    title: "Leads",
    description: "Exporta prospectos con origen, seguimiento y contacto principal.",
    table: "leads",
    filename: "corevix-leads.csv",
    select: "id,first_name,last_name,company_name,email,phone,status,source,created_at",
    columns: [
      { key: "id", label: "ID" },
      { key: "first_name", label: "Nombre" },
      { key: "last_name", label: "Apellido" },
      { key: "company_name", label: "Empresa" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telefono" },
      { key: "status", label: "Estado" },
      { key: "source", label: "Origen" },
      { key: "created_at", label: "Creado" },
    ],
    count: 0,
  },
  {
    key: "tasks",
    title: "Tareas",
    description: "Exporta pendientes operativos, prioridad y vencimiento.",
    table: "tasks",
    filename: "corevix-tareas.csv",
    select: "id,title,status,priority,due_date,created_at",
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Titulo" },
      { key: "status", label: "Estado" },
      { key: "priority", label: "Prioridad" },
      { key: "due_date", label: "Vencimiento" },
      { key: "created_at", label: "Creada" },
    ],
    count: 0,
  },
  {
    key: "invoices",
    title: "Facturas",
    description: "Exporta facturas con numero, total y estado de cobro.",
    table: "invoices",
    filename: "corevix-facturas.csv",
    select: "id,number,status,total,due_date,created_at",
    columns: [
      { key: "id", label: "ID" },
      { key: "number", label: "Numero" },
      { key: "status", label: "Estado" },
      { key: "total", label: "Total" },
      { key: "due_date", label: "Vencimiento" },
      { key: "created_at", label: "Creada" },
    ],
    count: 0,
  },
  {
    key: "proposals",
    title: "Propuestas",
    description: "Exporta propuestas con monto, vigencia y estado comercial.",
    table: "proposals",
    filename: "corevix-propuestas.csv",
    select: "id,number,title,status,amount,valid_until,created_at",
    columns: [
      { key: "id", label: "ID" },
      { key: "number", label: "Numero" },
      { key: "title", label: "Titulo" },
      { key: "status", label: "Estado" },
      { key: "amount", label: "Monto" },
      { key: "valid_until", label: "Valida hasta" },
      { key: "created_at", label: "Creada" },
    ],
    count: 0,
  },
];

function CsvExportPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [modules, setModules] = useState(INITIAL_MODULES);

  const refreshCounts = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const db = supabase as any;
    const counts = await Promise.all(
      INITIAL_MODULES.map((module) =>
        db
          .from(module.table)
          .select("id", { count: "exact", head: true })
          .eq("company_id", profile.company_id),
      ),
    );
    setModules(
      INITIAL_MODULES.map((module, index) => ({
        ...module,
        count: counts[index].count || 0,
      })),
    );
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const totalRecords = useMemo(
    () => modules.reduce((sum, module) => sum + module.count, 0),
    [modules],
  );

  const handleExport = async (module: ExportModule) => {
    if (!profile?.company_id) return;
    setBusyKey(module.key);
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from(module.table)
        .select(module.select)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      downloadCsv(module.filename, data || [], module.columns);
      toast.success(`${module.title} exportado en CSV.`);
    } catch (error: any) {
      toast.error(error?.message || `No se pudo exportar ${module.title.toLowerCase()}.`);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exportar CSV</h1>
          <p className="text-sm text-muted-foreground">
            Punto unico para descargar los datos mas usados del CRM en formato tabular.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshCounts()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Actualizar conteos
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Modulos listos</CardDescription>
            <CardTitle className="text-3xl">{modules.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Registros exportables</CardDescription>
            <CardTitle className="text-3xl">{totalRecords}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Formato</CardDescription>
            <CardTitle className="text-3xl">CSV</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <LoadingCards count={5} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  {module.title}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold tracking-tight">{module.count}</div>
                <div className="text-xs text-muted-foreground">
                  {module.count === 1 ? "registro disponible" : "registros disponibles"}
                </div>
                <Button
                  className="w-full"
                  onClick={() => void handleExport(module)}
                  disabled={busyKey === module.key || module.count === 0}
                >
                  <Download className="h-4 w-4" />
                  {busyKey === module.key ? "Exportando..." : "Descargar CSV"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
