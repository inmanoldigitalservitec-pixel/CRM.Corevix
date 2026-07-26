import { useState, type ReactNode } from "react";
import { Activity, Bell, CreditCard, FileText, ListChecks, StickyNote } from "lucide-react";
import { EmptyState } from "@/components/crm/empty-state";
import { InvoiceActivity, type InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import { InvoiceDetailsSummary } from "@/components/invoices/invoice-details-summary";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import { InvoicePaymentsPanel } from "@/components/invoices/invoice-payments-panel";
import {
  SalesDocumentWorkspaceDialog,
  type SalesDocumentWorkspaceTab,
} from "@/components/sales/sales-document-workspace-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabsContent } from "@/components/ui/tabs";

type DetailField = {
  label: string;
  value?: string | null;
  mono?: boolean;
};

const invoiceWorkspaceTabs: SalesDocumentWorkspaceTab[] = [
  { value: "invoice", label: "Factura", icon: FileText },
  { value: "payments", label: "Pagos", icon: CreditCard },
  { value: "tasks", label: "Tareas", icon: ListChecks },
  { value: "activity", label: "Actividad", icon: Activity },
  { value: "reminders", label: "Recordatorios", icon: Bell },
  { value: "notes", label: "Notas", icon: StickyNote },
];

export function InvoiceWorkspaceDialog({
  open,
  onOpenChange,
  invoice,
  financialStatus,
  actions,
  summaryFields,
  issuerFields,
  clientFields,
  items,
  itemsLoading,
  itemsError,
  activity,
  currency,
  total,
  balance,
  subtotal,
  tax,
  discount,
  notes,
  formatMoney,
  paymentReceiptsRefreshKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    number: string;
    status: string;
    date_issued?: string | null;
    due_date?: string | null;
  } | null;
  financialStatus: string;
  actions: ReactNode;
  summaryFields: DetailField[];
  issuerFields: DetailField[];
  clientFields: DetailField[];
  items: InvoiceDetailItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  activity: InvoiceActivityEvent[];
  currency: string;
  total: string;
  balance: string;
  subtotal: string;
  tax: string;
  discount: string;
  notes?: string | null;
  formatMoney: (amount: number, currency: string) => string;
  paymentReceiptsRefreshKey?: number | string;
}) {
  const [activeTab, setActiveTab] = useState("invoice");

  if (!invoice) return null;

  return (
    <SalesDocumentWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={invoice.number || "Factura"}
      srTitle={`Factura ${invoice.number || ""}`.trim()}
      status={<StatusBadge status={financialStatus} />}
      meta={
        <>
          <span>{total}</span>
          <span>Saldo pendiente {balance}</span>
        </>
      }
      actions={actions}
      tabs={invoiceWorkspaceTabs}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
    >
      <TabsContent value="invoice" className="mt-0">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <InvoiceDocumentPreview
            invoice={invoice}
            issuerFields={issuerFields}
            clientFields={clientFields}
            items={items}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            currency={currency}
            subtotal={subtotal}
            tax={tax}
            discount={discount}
            total={total}
            notes={notes}
            formatMoney={formatMoney}
          />
          <InvoiceDetailsSummary
            invoice={invoice}
            financialStatus={financialStatus}
            fields={summaryFields}
            items={items}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            currency={currency}
            total={total}
            balance={balance}
            subtotal={subtotal}
            tax={tax}
            discount={discount}
            notes={notes}
            formatMoney={formatMoney}
          />
        </div>
      </TabsContent>

      <TabsContent value="payments" className="mt-0">
        <InvoicePaymentsPanel
          invoiceId={invoice.id}
          refreshKey={paymentReceiptsRefreshKey}
        />
      </TabsContent>

      <TabsContent value="tasks" className="mt-0">
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="Tareas listas para conectar"
          description="Esta pestaña queda reservada para las tareas asociadas a la factura."
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-0">
        <InvoiceActivity events={activity} />
      </TabsContent>

      <TabsContent value="reminders" className="mt-0">
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Sin recordatorios"
          description="Todavía no hay recordatorios asociados a esta factura."
        />
      </TabsContent>

      <TabsContent value="notes" className="mt-0">
        {notes ? (
          <section className="min-w-0 border-y border-slate-100 bg-white py-4">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Notas
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-normal text-slate-900">
              {notes}
            </p>
          </section>
        ) : (
          <EmptyState
            icon={<StickyNote className="h-6 w-6" />}
            title="Sin notas"
            description="Esta factura todavía no tiene notas registradas."
          />
        )}
      </TabsContent>
    </SalesDocumentWorkspaceDialog>
  );
}
