import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProjectWorkspaceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeClassName: Record<NonNullable<ProjectWorkspaceFormDialogProps["size"]>, string> = {
  sm: "md:max-w-md",
  md: "md:max-w-xl",
  lg: "md:max-w-2xl",
};

export function ProjectWorkspaceFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
}: ProjectWorkspaceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none",
          "md:h-auto md:max-h-[85vh] md:w-[calc(100vw-24px)] md:rounded-2xl md:border md:shadow-2xl",
          sizeClassName[size],
        )}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left">
          <DialogTitle className="text-lg font-extrabold tracking-[-0.02em] text-slate-950">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm font-medium leading-5 text-slate-500">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
