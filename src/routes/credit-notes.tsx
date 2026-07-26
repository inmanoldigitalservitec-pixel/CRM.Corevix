import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, ExternalLink, Eye } from "lucide-react";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DISPLAY_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Issued: "Emitida",
  Applied: "Aplicada",
  Cancelled: "Cancelada",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

export const Route = createFileRoute("/credit-notes")({
  component: CreditNotesPage,
  head: () => ({ meta: [{ title: "Notas de crédito — Corevix CRM" }] }),
});

const STATUSES = ["Draft", "Issued", "Applied", "Cancelled"];
const CREATE_STATUSES = ["Draft"];

type CreditNoteRow = Record<string, any>;

function getPublicUrl(row: CreditNoteRow) {
  const token = String(row.public_token || "").trim();
  if (!token || typeof window === "undefined") return null;
  return `${window.location.origin}/credit-note/public/${token}`;
}

function CreditNotesPage() {
  const [previewNote, setPreviewNote] = useState<CreditNoteRow | null>(null);

  const openPublicCreditNote = (row: CreditNoteRow) => {
    const url = getPublicUrl(row);
    if (!url) {
      toast.error("Esta nota de crédito todavía no tiene un enlace público.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyPublicCreditNoteLink = async (row: CreditNoteRow) => {
    const url = getPublicUrl(row);
    if (!url) {
      toast.error("Esta nota de crédito todavía no tiene un enlace público.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de la nota de crédito copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const openPreview = (row: CreditNoteRow) => {
    if (!String(row.public_token || "").trim()) {
      toast.error("Esta nota de crédito todavía no tiene una vista previa disponible.");
      return;
    }
    setPreviewNote(row);
  };

  return (
    <>
      <SalesBasicPage
        onOpenRow={openPreview}
        renderRowActions={(row) => (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
              onClick={() => openPreview(row)}
              disabled={!row.public_token}
              title="Vista previa"
              aria-label="Vista previa de nota de crédito"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
              onClick={() => openPublicCreditNote(row)}
              disabled={!row.public_token}
              title="Abrir en otra pestaña"
              aria-label="Abrir nota de crédito en otra pestaña"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
              onClick={() => void copyPublicCreditNoteLink(row)}
              disabled={!row.public_token}
              title="Copiar enlace"
              aria-label="Copiar enlace de nota de crédito"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </>
        )}
        config={{
          routeTitle: "Notas de crédito",
          subtitle: "Ajustes a favor del cliente con documento fiscal imprimible.",
          table: "credit_notes",
          module: "credit_notes",
          createPermission: "credit_notes.issue",
          numberKey: "credit_note_number",
          titleKey: "reason",
          amountKey: "amount",
          dateKey: "date_issued",
          statusKey: "status",
          statuses: STATUSES,
          primaryLabel: "nota de crédito",
          defaultValues: {
            reason: "",
            invoice_id: "none",
            client_id: "none",
            amount: "0",
            status: "Draft",
            date_issued: new Date().toISOString().slice(0, 10),
            notes: "",
          },
          fields: [
            { key: "reason", label: "Razón", type: "text", required: true, span: 2 },
            { key: "invoice_id", label: "Factura", type: "select" },
            { key: "client_id", label: "Cliente", type: "select" },
            { key: "amount", label: "Monto", type: "number", required: true },
            { key: "date_issued", label: "Fecha", type: "date" },
            {
              key: "status",
              label: "Estado",
              type: "select",
              options: CREATE_STATUSES.map((value) => ({
                label: value,
                value,
                displayLabel: displayLabel(value),
              })),
            },
            { key: "notes", label: "Notas", type: "textarea" },
          ],
        }}
      />

      <Dialog
        open={Boolean(previewNote)}
        onOpenChange={(open) => {
          if (!open) setPreviewNote(null);
        }}
      >
        <DialogContent className="flex h-[94dvh] w-[96vw] max-w-[1180px] flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-semibold text-slate-950">
                  {previewNote?.reason || "Vista previa de nota de crédito"}
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {previewNote?.credit_note_number || "—"} · {displayLabel(previewNote?.status || "Draft")}
                </p>
              </div>
              {previewNote ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openPublicCreditNote(previewNote)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir en otra pestaña
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 bg-slate-100">
            {previewNote?.public_token ? (
              <iframe
                title={`Vista previa de la nota de crédito ${previewNote.credit_note_number || "—"}`}
                src={`/credit-note/public/${previewNote.public_token}`}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
                Esta nota de crédito todavía no tiene una vista previa disponible.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
