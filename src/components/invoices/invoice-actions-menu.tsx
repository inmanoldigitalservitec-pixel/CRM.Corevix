import {
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InvoiceActionsMenu({
  canOpenPublic,
  canMarkPaid,
  canRegisterPayment,
  canCreateProject,
  canViewProject,
  canViewClient,
  canViewProposal,
  canDeleteDraft,
  onView,
  onOpenPublic,
  onCopyPublic,
  onEdit,
  onMarkPaid,
  onRegisterPayment,
  onCreateProject,
  onViewProject,
  onViewClient,
  onViewProposal,
  onDeleteDraft,
}: {
  canOpenPublic: boolean;
  canMarkPaid: boolean;
  canRegisterPayment: boolean;
  canCreateProject: boolean;
  canViewProject: boolean;
  canViewClient: boolean;
  canViewProposal: boolean;
  canDeleteDraft: boolean;
  onView: () => void;
  onOpenPublic: () => void;
  onCopyPublic: () => void;
  onEdit: () => void;
  onMarkPaid: () => void;
  onRegisterPayment: () => void;
  onCreateProject: () => void;
  onViewProject: () => void;
  onViewClient: () => void;
  onViewProposal: () => void;
  onDeleteDraft: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Más acciones">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onView}>
          <FileText className="h-4 w-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        {canOpenPublic ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenPublic}>
              <ExternalLink className="h-4 w-4" />
              Ver factura pública
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCopyPublic}>
              <Copy className="h-4 w-4" />
              Copiar enlace
            </DropdownMenuItem>
          </>
        ) : null}
        {canRegisterPayment || canMarkPaid || canCreateProject || canViewProject ? (
          <>
            <DropdownMenuSeparator />
            {canRegisterPayment ? (
              <DropdownMenuItem onSelect={onRegisterPayment}>
                <Receipt className="h-4 w-4" />
                Registrar pago
              </DropdownMenuItem>
            ) : null}
            {canMarkPaid ? (
              <DropdownMenuItem onSelect={onMarkPaid}>
                <CheckCircle2 className="h-4 w-4" />
                Marcar pagada
              </DropdownMenuItem>
            ) : null}
            {canViewProject ? (
              <DropdownMenuItem onSelect={onViewProject}>
                <BriefcaseBusiness className="h-4 w-4" />
                Ver proyecto
              </DropdownMenuItem>
            ) : null}
            {canCreateProject ? (
              <DropdownMenuItem onSelect={onCreateProject}>
                <BriefcaseBusiness className="h-4 w-4" />
                Crear proyecto
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        {canViewClient || canViewProposal ? (
          <>
            <DropdownMenuSeparator />
            {canViewClient ? (
              <DropdownMenuItem onSelect={onViewClient}>
                <UserRound className="h-4 w-4" />
                Ver cliente
              </DropdownMenuItem>
            ) : null}
            {canViewProposal ? (
              <DropdownMenuItem onSelect={onViewProposal}>
                <FileText className="h-4 w-4" />
                Ver propuesta
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        {canDeleteDraft ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDeleteDraft}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar borrador
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
