import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusKey, useT } from "@/i18n";

const statusLabelsEs: Record<string, string> = {
  New: "Nuevo",
  Contacted: "Contactado",
  Qualified: "Calificado",
  "Proposal Needed": "Requiere propuesta",
  "Proposal Sent": "Propuesta enviada",
  Negotiation: "Negociación",
  Won: "Ganado",
  Lost: "Perdido",
  "Not Interested": "Sin interés",
  Active: "Activo",
  Inactive: "Inactivo",
  Pending: "Pendiente",
  VIP: "VIP",
  "Past Client": "Cliente anterior",
  "To Do": "Por hacer",
  "In Progress": "En progreso",
  Waiting: "En espera",
  Completed: "Completado",
  Cancelled: "Cancelado",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  "Not Started": "No iniciado",
  "Waiting on Client": "Esperando al cliente",
  "On Hold": "En pausa",
  Draft: "Borrador",
  Sent: "Enviado",
  Viewed: "Visto",
  Accepted: "Aceptado",
  Rejected: "Rechazado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Paid: "Pagado",
  "Partially Paid": "Parcialmente pagada",
  "Partially Refunded": "Parcialmente reembolsado",
  Unpaid: "Sin pagar",
  Overdue: "Vencido",
  "Not Sent": "No enviada",
  Open: "Abierto",
  Answered: "Respondido",
  Closed: "Cerrado",
  Resolved: "Resuelto",
  Archived: "Archivado",
  Read: "Leído",
  Unread: "No leído",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Approved: "Aprobado",
  Issued: "Emitida",
  Applied: "Aplicada",
  Trial: "Prueba",
  Paused: "Pausada",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
};

const statusColors: Record<string, string> = {
  // Leads
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Proposal Needed": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Proposal Sent": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Negotiation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Not Interested": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  // Clients
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  VIP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Past Client": "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  // Tasks
  "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Waiting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  // Priorities
  Low: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  // Projects
  "Not Started": "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  "Waiting on Client": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "On Hold": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  // Proposals
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  Sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Viewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Expired: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400",
  Trial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  // Invoices
  Paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Partially Paid": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "Partially Refunded": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  // WhatsApp
  Open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Answered: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Resolved: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  Archived: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400",
  // Misc
  Read: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  Unread: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useT();
  const key = statusKey(status);
  const label = t(key);
  const display = label === key ? (statusLabelsEs[status] ?? status) : label;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-[11px] px-2 py-0.5 rounded-md border-0",
        statusColors[status] || "bg-gray-100 text-gray-600",
        className,
      )}
    >
      {display}
    </Badge>
  );
}
