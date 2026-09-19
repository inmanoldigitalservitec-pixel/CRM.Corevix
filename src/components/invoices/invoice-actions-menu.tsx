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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrmDetailLineButton } from "@/components/crm/crm-detail-layout";

export function InvoiceActionsMenu({
  canOpenPublic,
  canMarkPaid,
  canRegisterPayment,
  canCreateProject,
  canViewProject,
  canViewClient,
  canViewProposal,
  viewProposalDisabled = false,
  inline = false,
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
  viewProposalDisabled?: boolean;
  inline?: boolean;
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
  if (inline) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onView}>
          <FileText className="h-4 w-4" />
          Ver detalle
        </CrmDetailLineButton>
        <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Editar
        </CrmDetailLineButton>
        {canOpenPublic ? (
          <>
            <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onOpenPublic}>
              <ExternalLink className="h-4 w-4" />
              Ver factura pública
            </CrmDetailLineButton>
            <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onCopyPublic}>
              <Copy className="h-4 w-4" />
              Copiar enlace
            </CrmDetailLineButton>
          </>
        ) : null}
        {canRegisterPayment ? (
          <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onRegisterPayment}>
            <Receipt className="h-4 w-4" />
            Registrar pago
          </CrmDetailLineButton>
        ) : null}
        {canMarkPaid ? (
          <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onMarkPaid}>
            <CheckCircle2 className="h-4 w-4" />
            Marcar pagada
          </CrmDetailLineButton>
        ) : null}
        {canViewProject ? (
          <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onViewProject}>
            <BriefcaseBusiness className="h-4 w-4" />
            Ver proyecto
          </CrmDetailLineButton>
        ) : null}
        {canViewClient ? (
          <CrmDetailLineButton type="button" className="h-8 gap-1.5 px-2 text-xs" onClick={onViewClient}>
            <UserRound className="h-4 w-4" />
            Ver cliente
          </CrmDetailLineButton>
        ) : null}
        {canViewProposal ? (
          <CrmDetailLineButton
            type="button"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={onViewProposal}
            disabled={viewProposalDisabled}
          >
            <FileText className="h-4 w-4" />
            Ver propuesta
          </CrmDetailLineButton>
        ) : null}
        {canDeleteDraft ? (
          <CrmDetailLineButton
            type="button"
            className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
            onClick={onDeleteDraft}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar borrador
          </CrmDetailLineButton>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CrmDetailLineButton
          type="button"
          className="h-8 w-8 justify-center px-0"
          aria-label="Más acciones"
        >
          <MoreHorizontal className="h-4 w-4" />
        </CrmDetailLineButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-none border-slate-200 bg-white shadow-none"
      >
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
              <DropdownMenuItem onSelect={onViewProposal} disabled={viewProposalDisabled}>
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
