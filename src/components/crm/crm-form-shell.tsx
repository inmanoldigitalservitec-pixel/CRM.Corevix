import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CrmCreationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  contentClassName?: string;
  bodyClassName?: string;
};

const dialogSizeClass: Record<NonNullable<CrmCreationDialogProps["size"]>, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

export const crmFormStyles = {
  label: "text-xs font-normal uppercase tracking-wide text-slate-500",
  input:
    "h-12 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-base font-normal shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm",
  select:
    "h-12 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-base font-normal shadow-none focus:ring-0 focus:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm",
  textarea:
    "min-h-24 resize-none rounded-none border-0 border-b border-slate-200 bg-white px-0 py-3 text-base font-normal shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm",
  footer:
    "sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur",
  cancelButton: "font-normal",
  primaryButton: "rounded-full bg-[#1d62f9] px-5 font-normal hover:bg-[#0f52dd]",
};

export function CrmCreationDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  contentClassName,
  bodyClassName,
}: CrmCreationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-none",
          "max-sm:!left-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:rounded-none",
          "sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-slate-200",
          dialogSizeClass[size],
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 pr-14 text-left sm:px-6 lg:px-7">
          <DialogTitle className="text-xl font-normal tracking-normal text-slate-950">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm font-normal text-slate-500">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6 lg:px-7",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-7">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
