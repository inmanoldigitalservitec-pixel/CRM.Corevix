import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingTable } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
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
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exportar PDFs</h1>
        <p className="text-sm text-muted-foreground">
          Centraliza propuestas y facturas con salida imprimible o descarga desde su vista publica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Documentos listados</CardDescription>
            <CardTitle className="text-3xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Listos para imprimir</CardDescription>
            <CardTitle className="text-3xl">{printReadyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tipos soportados</CardDescription>
            <CardTitle className="text-3xl">2</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cola de exportacion</CardTitle>
          <CardDescription>
            Usa &quot;Imprimir PDF&quot; para abrir la vista publica con el dialogo de impresion
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingTable rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No hay documentos para exportar"
              description="Crea facturas o propuestas con enlace publico para habilitar la salida en PDF."
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
