import { CrmCreationDialog } from "@/components/crm/crm-form-shell";

type ProjectWorkspaceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
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
    <CrmCreationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      bodyClassName="pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      {children}
    </CrmCreationDialog>
  );
}
