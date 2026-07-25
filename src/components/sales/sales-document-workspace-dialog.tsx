import type { ComponentType, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SalesDocumentWorkspaceTab = {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

type SalesDocumentWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  srTitle?: string;
  status?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tabs: SalesDocumentWorkspaceTab[];
  activeTab: string;
  onActiveTabChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function SalesDocumentWorkspaceDialog({
  open,
  onOpenChange,
  title,
  srTitle,
  status,
  meta,
  actions,
  tabs,
  activeTab,
  onActiveTabChange,
  children,
  className = "",
}: SalesDocumentWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none md:h-[92vh] md:w-[calc(100vw-24px)] md:max-w-[1180px] md:border md:border-slate-200 [&>button]:hidden ${className}`}
      >
        <DialogTitle className="sr-only">{srTitle || title}</DialogTitle>
        <DialogDescription className="sr-only">
          Revisa y gestiona los detalles, acciones y relaciones de este documento comercial.
        </DialogDescription>

        <header className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] md:px-5 md:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-normal tracking-normal text-slate-950">
                  {title}
                </h2>
                {status}
              </div>
              {meta ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-slate-500">
                  {meta}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Cerrar"
                className="h-8 w-8 rounded-none border-b border-slate-200 shadow-none"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={onActiveTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 overflow-x-auto border-b border-slate-100 bg-white px-4 py-0 md:px-5">
            <TabsList className="inline-flex h-11 w-max justify-start gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-11 gap-2 rounded-none border-b-2 border-transparent bg-white px-3 text-xs font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-5">
            {children}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
