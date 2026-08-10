import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, FileStack, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataCard } from "@/components/crm/data-card";
import { LoadingTable } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
import { MetricCard } from "@/components/crm/metric-card";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
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
import { copyText } from "@/lib/download";

export const Route = createFileRoute("/pdf-export")({
  component: PdfExportPage,
  head: () => ({ meta: [{ title: "Exportar PDFs — Corevix CRM" }] }),
});

type PdfItem = {
  id: string;
  kind: "proposal" | "invoice";
  label: string;
  status: string;
  amount: string;
  updatedAt: string;
  publicToken: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PdfExportPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PdfItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      if (!profile?.company_id) return;
      setLoading(true);
      const db = supabase as any;
      const [proposalResult, invoiceResult] = await Promise.all([
        db
          .from("proposals")
          .select("id,number,title,status,amount,updated_at,public_token")
          .eq("company_id", profile.company_id)
          .order("updated_at", { ascending: false })
          .limit(60),
        db
          .from("invoices")
          .select("id,number,status,total,updated_at,public_token")
          .eq("company_id", profile.company_id)
          .order("updated_at", { ascending: false })
          .limit(60),
      ]);

      if (cancelled) return;

      const proposalItems: PdfItem[] = (proposalResult.data || []).map((proposal: any) => ({
        id: proposal.id,
        kind: "proposal",
        label: proposal.number || proposal.title || "Propuesta",
        status: proposal.status || "Draft",
        amount: String(proposal.amount ?? 0),
        updatedAt: proposal.updated_at || new Date().toISOString(),
        publicToken: proposal.public_token || null,
      }));

      const invoiceItems: PdfItem[] = (invoiceResult.data || []).map((invoice: any) => ({
        id: invoice.id,
        kind: "invoice",
        label: invoice.number || "Factura",
        status: invoice.status || "Draft",
        amount: String(invoice.total ?? 0),
        updatedAt: invoice.updated_at || new Date().toISOString(),
        publicToken: invoice.public_token || null,
      }));

      setItems(
        [...proposalItems, ...invoiceItems].sort(
          (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
        ),
      );
      setLoading(false);
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      `${item.kind} ${item.label} ${item.status}`.toLowerCase().includes(term),
    );
  }, [items, search]);

  const printReadyCount = items.filter((item) => item.publicToken).length;

  const getPublicUrl = (item: PdfItem, autoprint = false) => {
    if (!item.publicToken) return null;
    const path =
      item.kind === "proposal"
        ? `/proposal/public/${item.publicToken}`
        : `/invoice/public/${item.publicToken}`;
    const suffix = autoprint ? "?autoprint=1" : "";
    return `${window.location.origin}${path}${suffix}`;
  };

  const handleCopy = async (item: PdfItem) => {
    const url = getPublicUrl(item, false);
    if (!url) {
      toast.error("Este documento no tiene enlace publico todavia.");
      return;
    }
    await copyText(url);
    toast.success("Enlace copiado.");
  };

  const handleOpen = (item: PdfItem, autoprint = false) => {
    const url = getPublicUrl(item, autoprint);
    if (!url) {
      toast.error("Este documento no tiene enlace publico todavia.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Exportar PDFs"
        subtitle="Centraliza propuestas y facturas con salida imprimible o descarga desde su vista publica."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <MetricCard
          label="Documentos listados"
          value={items.length}
          icon={FileStack}
          size="compact"
        />
        <MetricCard
          label="Listos para imprimir"
          value={printReadyCount}
          icon={Printer}
          size="compact"
        />
        <MetricCard label="Tipos soportados" value="2" icon={FileText} size="compact" />
      </div>

      <DataCard noPadding className="overflow-hidden">
        <CardHeader>
          <CardTitle>Cola de exportacion</CardTitle>
          <CardDescription>
            Usa &quot;Imprimir PDF&quot; para abrir la vista publica con el dialogo de impresion
            automaticamente.
          </CardDescription>
        </CardHeader>
        <div className="border-b border-border/40 px-4 pb-4 sm:px-6">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por documento, tipo o estado..."
            mobileCollapsible={false}
          />
        </div>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <LoadingTable rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No hay documentos para exportar"
              description="Crea facturas o propuestas con enlace publico para habilitar la salida en PDF."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={`${item.kind}-${item.id}`}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{item.kind === "proposal" ? "Propuesta" : "Factura"}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.amount}</TableCell>
                        <TableCell>{formatDate(item.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpen(item, false)}
                              disabled={!item.publicToken}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Vista
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleCopy(item)}
                              disabled={!item.publicToken}
                            >
                              <Copy className="h-4 w-4" />
                              Link
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpen(item, true)}
                              disabled={!item.publicToken}
                            >
                              <Printer className="h-4 w-4" />
                              Imprimir PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-3 md:hidden">
                {filtered.map((item) => (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className="rounded-lg border border-border/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.kind === "proposal" ? "Propuesta" : "Factura"} · {item.status}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{item.amount}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Actualizado {formatDate(item.updatedAt)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpen(item, false)}
                        disabled={!item.publicToken}
                      >
                        <ExternalLink className="h-4 w-4" /> Vista
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopy(item)}
                        disabled={!item.publicToken}
                      >
                        <Copy className="h-4 w-4" /> Link
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpen(item, true)}
                        disabled={!item.publicToken}
                      >
                        <Printer className="h-4 w-4" /> PDF
                      </Button>
                    </div>
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
