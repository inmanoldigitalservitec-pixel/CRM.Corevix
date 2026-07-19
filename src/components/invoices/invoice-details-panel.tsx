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
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap">{actions}</div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid h-auto w-full min-w-0 grid-cols-3 rounded-none border-b border-slate-200 bg-white p-0">
          <TabsTrigger
            value="summary"
            className="rounded-none border-b border-transparent bg-white py-2 text-xs font-normal shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="document"
            className="rounded-none border-b border-transparent bg-white py-2 text-xs font-normal shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Documento
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none border-b border-transparent bg-white py-2 text-xs font-normal shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Actividad
          </TabsTrigger>
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
