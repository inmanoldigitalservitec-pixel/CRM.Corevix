import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceActivity, type InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import { InvoiceDetailsSummary } from "@/components/invoices/invoice-details-summary";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";

type DetailField = {
  label: string;
  value?: string | null;
  mono?: boolean;
};

export function InvoiceDetailsPanel({
  invoice,
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
  publicUrl,
  formatMoney,
}: {
  invoice: {
    number: string;
    status: string;
    date_issued?: string | null;
    due_date?: string | null;
  };
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
  publicUrl?: string | null;
  formatMoney: (amount: number, currency: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">{actions}</div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="document">Documento</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-0">
          <InvoiceDetailsSummary
            invoice={invoice}
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
            publicUrl={publicUrl}
            formatMoney={formatMoney}
          />
        </TabsContent>

        <TabsContent value="document" className="mt-0">
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
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <InvoiceActivity events={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
