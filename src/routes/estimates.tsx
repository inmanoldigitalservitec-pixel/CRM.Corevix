import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DISPLAY_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  "To Do": "Por hacer",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Draft: "Borrador",
  Sent: "Enviado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Issued: "Emitida",
  Applied: "Aplicada",
  Active: "Activo",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
  Linked: "Vinculada",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

export const Route = createFileRoute("/estimates")({
  component: EstimatesPage,
  head: () => ({ meta: [{ title: "Cotizaciones — Corevix CRM" }] }),
});

const STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"];

type EstimateRow = {
  id: string;
  number: number | null;
  title: string;
  status: string;
  total: number | null;
  updated_at: string;
};

function EstimatesPage() {
  return (
    <div className="space-y-4">
      <SalesBasicPage
        config={{
          routeTitle: "Cotizaciones",
          subtitle:
            "Cotizaciones previas a factura, relacionadas a clientes, proyectos o oportunidades.",
          table: "estimates",
          module: "estimates",
          numberKey: "number",
          titleKey: "title",
          amountKey: "total",
          dateKey: "date_issued",
          statusKey: "status",
          statuses: STATUSES,
          primaryLabel: "cotización",
          defaultValues: {
            title: "",
            client_id: "none",
            project_id: "none",
            deal_id: "none",
            subtotal: "0",
            tax: "0",
            total: "0",
            status: "Draft",
            date_issued: new Date().toISOString().slice(0, 10),
            expiry_date: "",
            notes: "",
          },
          fields: [
            { key: "title", label: "Título", type: "text", required: true, span: 2 },
            { key: "client_id", label: "Cliente", type: "select" },
            { key: "project_id", label: "Proyecto", type: "select" },
            { key: "subtotal", label: "Subtotal", type: "number" },
            { key: "tax", label: "Impuesto", type: "number" },
            { key: "total", label: "Total", type: "number" },
            {
              key: "status",
              label: "Estado",
              type: "select",
              options: STATUSES.map((value) => ({
                label: value,
                value,
                displayLabel: displayLabel(value),
              })),
            },
            { key: "date_issued", label: "Fecha de emisión", type: "date" },
            { key: "expiry_date", label: "Fecha de vencimiento", type: "date" },
            { key: "notes", label: "Notas", type: "textarea" },
          ],
        }}
      />
      <EstimateConversionPanel />
    </div>
  );
}

function EstimateConversionPanel() {
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const { data, loading, fetch } = useCrud<EstimateRow>({
    table: "estimates",
    select: "id,number,title,status,total,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 25,
  });

  const convertible = useMemo(
    () => data.filter((estimate) => estimate.status !== "Converted"),
    [data],
  );

  const convertEstimate = async (estimate: EstimateRow) => {
    setConvertingId(estimate.id);
    try {
      const { data: result, error } = await (supabase as any).rpc("convert_estimate_to_invoice", {
        p_estimate_id: estimate.id,
      });
      if (error) throw error;
      const first = Array.isArray(result) ? result[0] : result;
      toast.success(
        first?.created
          ? "Cotización convertida en factura."
          : "Ya existe una factura para esta cotización.",
      );
      await fetch();
    } catch (error: any) {
      toast.error(error.message || "No se pudo convertir la cotización.");
    } finally {
      setConvertingId(null);
    }
  };

  if (loading || convertible.length === 0) return null;

  return (
    <div className="mx-4 rounded-xl border bg-white p-4 shadow-sm sm:mx-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900">Cotización → Factura</h3>
          <p className="text-sm font-medium text-slate-500">
            Convierte cotizaciones aceptadas o enviadas en facturas sin duplicarlas.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {convertible.slice(0, 5).map((estimate) => (
          <div
            key={estimate.id}
            className="flex flex-col gap-2 rounded-xl border bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">
                #{estimate.number || "—"} · {estimate.title}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {displayLabel(estimate.status)} · ${Number(estimate.total || 0).toLocaleString()}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void convertEstimate(estimate)}
              disabled={convertingId === estimate.id}
            >
              <FileText className="mr-2 h-4 w-4" />
              {convertingId === estimate.id ? "Convirtiendo..." : "Convertir en factura"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
