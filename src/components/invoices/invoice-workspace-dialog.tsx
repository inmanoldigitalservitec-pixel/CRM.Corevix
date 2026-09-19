import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Activity, Bell, CreditCard, FileText, ListChecks, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { InvoiceActivity, type InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import { InvoiceDetailsSummary } from "@/components/invoices/invoice-details-summary";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import { InvoiceNotesPanel } from "@/components/invoices/invoice-notes-panel";
import { InvoicePaymentsPanel } from "@/components/invoices/invoice-payments-panel";
import {
  ProposalRemindersPanel,
  ProposalTasksPanel,
  type ProposalProfileRow,
  type ProposalReminderRow,
  type ProposalTaskRow,
} from "@/components/proposals/proposal-workspace-dialog";
import { TaskCreateDialog } from "@/components/tasks/task-detail-dialog";
import { openGlobalReminderCreate } from "@/components/calendar/global-reminder-create-host";
import {
  SalesDocumentWorkspaceDialog,
  type SalesDocumentWorkspaceTab,
} from "@/components/sales/sales-document-workspace-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";

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
  canEditNotes,
  canCreateTasks,
  canEditTasks,
  canManageReminders,
  canRegisterPayment,
  onRegisterPayment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    number: string;
    status: string;
    client_id?: string | null;
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
  canEditNotes: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canManageReminders: boolean;
  canRegisterPayment: boolean;
  onRegisterPayment?: () => void;
}) {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("invoice");
  const [profiles, setProfiles] = useState<ProposalProfileRow[]>([]);
  const [tasks, setTasks] = useState<ProposalTaskRow[]>([]);
  const [reminders, setReminders] = useState<ProposalReminderRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const profilesById = useMemo(() => {
    const entries: Array<[string, ProposalProfileRow]> = [];
    profiles.forEach((item) => {
      entries.push([item.id, item]);
      if (item.user_id) entries.push([item.user_id, item]);
    });
    return new Map(entries);
  }, [profiles]);

  const taskCountLabel = useMemo(() => {
    if (!tasks.length) return "Sin tareas todavía";
    const openCount = tasks.filter(
      (task) => !["completed", "cancelled"].includes(task.status.toLowerCase()),
    ).length;
    return `${openCount} abiertas · ${tasks.length} total`;
  }, [tasks]);

  const reminderCountLabel = useMemo(() => {
    if (!reminders.length) return "Sin recordatorios todavía";
    const openCount = reminders.filter((reminder) => reminder.status === "Pending").length;
    return `${openCount} pendientes · ${reminders.length} total`;
  }, [reminders]);

  const loadProfiles = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id,full_name,email,user_id,is_active")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    if (!error) setProfiles((data || []) as ProposalProfileRow[]);
  }, [profile?.company_id]);

  const loadTasks = useCallback(async () => {
    if (!invoice?.id || !profile?.company_id) return;
    setLoadingTasks(true);
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select(
        "id,company_id,title,description,status,priority,assigned_to,due_date,related_client_id,related_proposal_id,related_invoice_id,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("related_invoice_id", invoice.id)
      .order("updated_at", { ascending: false })
      .limit(200);
    setLoadingTasks(false);
    if (error) {
      toast.error(error.message || "No se pudieron cargar las tareas de la factura.");
      return;
    }
    setTasks((data || []) as ProposalTaskRow[]);
  }, [invoice?.id, profile?.company_id]);

  const loadReminders = useCallback(async () => {
    if (!invoice?.id || !profile?.company_id) return;
    setLoadingReminders(true);
    const { data, error } = await (supabase as any)
      .from("calendar_events")
      .select(
        "id,company_id,user_id,title,description,status,start_at,related_invoice_id,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("related_invoice_id", invoice.id)
      .order("start_at", { ascending: true })
      .limit(200);
    setLoadingReminders(false);
    if (error) {
      toast.error(error.message || "No se pudieron cargar los recordatorios de la factura.");
      return;
    }
    setReminders(
      (data || []).map((event: any) => ({
        id: event.id,
        company_id: event.company_id,
        invoice_id: event.related_invoice_id,
        assigned_to: event.user_id,
        created_by: event.user_id,
        title: event.title,
        notes: event.description,
        remind_at: event.start_at,
        status:
          event.status === "completed"
            ? "Completed"
            : event.status === "cancelled"
              ? "Cancelled"
              : "Pending",
        completed_at: event.status === "completed" ? event.updated_at : null,
        archived_at: null,
        created_at: event.updated_at,
        updated_at: event.updated_at,
      })) as ProposalReminderRow[],
    );
  }, [invoice?.id, profile?.company_id]);

  useEffect(() => {
    if (!open || !invoice?.id) return;
    void loadProfiles();
    void loadTasks();
    void loadReminders();
  }, [invoice?.id, loadProfiles, loadReminders, loadTasks, open]);

  useEffect(() => {
    const onReminderCreated = async (event: Event) => {
      const created = (
        event as CustomEvent<{
          event?: { id?: string; title?: string; related_invoice_id?: string | null };
        }>
      ).detail?.event;
      if (!created || created.related_invoice_id !== invoice?.id) return;
      await loadReminders();
      if (profile?.company_id) {
        await logActivityEvent({
          companyId: profile.company_id,
          userId: profile.id || null,
          action: "invoice_reminder_created",
          entityType: "calendar_events",
          entityId: created.id || invoice.id,
          detail: `Recordatorio creado desde factura ${invoice.number}: ${created.title || ""}`,
          metadata: { invoice_id: invoice.id },
        }).catch(() => {});
      }
      setActivityRefreshKey((current) => current + 1);
    };
    window.addEventListener("corevix:reminder-created", onReminderCreated);
    return () => window.removeEventListener("corevix:reminder-created", onReminderCreated);
  }, [invoice, loadReminders, profile?.company_id, profile?.id]);

  useEffect(() => {
    if (!open) setTaskDialogOpen(false);
  }, [open]);

  async function updateTaskStatus(task: ProposalTaskRow, status: string) {
    if (!profile?.company_id || !invoice) return;
    setSavingTask(true);
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status })
      .eq("id", task.id)
      .eq("company_id", profile.company_id);
    setSavingTask(false);
    if (error) return toast.error(error.message || "No se pudo actualizar la tarea.");

    await loadTasks();
    await logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: status === "Completed" ? "invoice_task_completed" : "invoice_task_updated",
      entityType: "tasks",
      entityId: task.id,
      detail: `Tarea ${status === "Completed" ? "completada" : "actualizada"} en factura ${invoice.number}: ${task.title}`,
      metadata: { invoice_id: invoice.id },
    }).catch(() => {});
    setActivityRefreshKey((current) => current + 1);
  }

  async function updateReminderStatus(
    reminder: ProposalReminderRow,
    status: "Completed" | "Cancelled",
  ) {
    if (!profile?.company_id || !invoice) return;
    setSavingReminder(true);
    const nextStatus = status === "Completed" ? "completed" : "cancelled";
    const { error } = await (supabase as any)
      .from("calendar_events")
      .update({ status: nextStatus })
      .eq("id", reminder.id)
      .eq("company_id", profile.company_id);
    setSavingReminder(false);
    if (error) return toast.error(error.message || "No se pudo actualizar el recordatorio.");

    await loadReminders();
    await logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action:
        status === "Completed" ? "invoice_reminder_completed" : "invoice_reminder_cancelled",
      entityType: "calendar_events",
      entityId: reminder.id,
      detail: `Recordatorio ${status === "Completed" ? "completado" : "cancelado"} en factura ${invoice.number}: ${reminder.title}`,
      metadata: { invoice_id: invoice.id },
    }).catch(() => {});
    setActivityRefreshKey((current) => current + 1);
  }

  function openInvoiceReminderCreator() {
    if (!invoice) return;
    openGlobalReminderCreate({
      initialValues: {
        title: `Dar seguimiento a factura ${invoice.number}`,
        description: `Recordatorio creado desde la factura ${invoice.number}.`,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        relatedClientId: invoice.client_id || null,
        relatedInvoiceId: invoice.id,
        contextLabel: `Factura: ${invoice.number}`,
      },
    });
  }

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
          canRegisterPayment={canRegisterPayment}
          onRegisterPayment={onRegisterPayment}
        />
      </TabsContent>

      <TabsContent value="tasks" className="mt-0">
        <ProposalTasksPanel
          tasks={tasks}
          profilesById={profilesById}
          canEdit={canCreateTasks || canEditTasks}
          loading={loadingTasks}
          saving={savingTask}
          countLabel={taskCountLabel}
          onRefresh={() => void loadTasks()}
          onCreate={() => setTaskDialogOpen(true)}
          onComplete={(task) => void updateTaskStatus(task, "Completed")}
          contextLabel="factura"
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-0">
        <InvoiceActivity
          invoiceId={invoice.id}
          events={activity}
          refreshKey={activityRefreshKey}
        />
      </TabsContent>

      <TabsContent value="reminders" className="mt-0">
        <ProposalRemindersPanel
          reminders={reminders}
          profilesById={profilesById}
          canEdit={canManageReminders}
          loading={loadingReminders}
          saving={savingReminder}
          countLabel={reminderCountLabel}
          onRefresh={() => void loadReminders()}
          onCreate={openInvoiceReminderCreator}
          onComplete={(reminder) => void updateReminderStatus(reminder, "Completed")}
          onCancel={(reminder) => void updateReminderStatus(reminder, "Cancelled")}
          contextLabel="factura"
        />
      </TabsContent>

      <TabsContent value="notes" className="mt-0">
        <InvoiceNotesPanel
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          canEdit={canEditNotes}
          onChanged={() => setActivityRefreshKey((current) => current + 1)}
        />
      </TabsContent>

      <TaskCreateDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        companyId={profile?.company_id}
        currentUserId={profile?.user_id || user?.id || null}
        profiles={profiles}
        relatedInvoiceId={invoice.id}
        canCreate={canCreateTasks}
        initialValues={{
          title: `Seguimiento de factura ${invoice.number}`,
          clientId: invoice.client_id || undefined,
          assignedTo: profile?.user_id || user?.id || undefined,
        }}
        onCreated={async () => {
          await loadTasks();
          setActivityRefreshKey((current) => current + 1);
        }}
      />
    </SalesDocumentWorkspaceDialog>
  );
}
