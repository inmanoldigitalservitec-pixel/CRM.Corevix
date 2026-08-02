import { useEffect, useMemo, useState } from "react";
import { TaskCreateDialog } from "@/components/tasks/task-detail-dialog";
import { useAuth } from "@/hooks/use-auth";

type TaskCreateInitialValues = {
  title?: string;
  description?: string;
  descriptionHtml?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
  assigneeIds?: string[];
  projectId?: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
};

type TaskCreateEventDetail = {
  initialValues?: TaskCreateInitialValues;
  openDetailAfterCreate?: boolean;
};

export function openGlobalTaskCreate(detail: TaskCreateEventDetail = {}) {
  window.dispatchEvent(new CustomEvent("corevix:open-task-create", { detail }));
}

export function GlobalTaskCreateHost() {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<TaskCreateInitialValues | undefined>();
  const [openDetailAfterCreate, setOpenDetailAfterCreate] = useState(true);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<TaskCreateEventDetail>).detail || {};
      setInitialValues(detail.initialValues);
      setOpenDetailAfterCreate(detail.openDetailAfterCreate !== false);
      setOpen(true);
    };
    window.addEventListener("corevix:open-task-create", onOpen);
    return () => window.removeEventListener("corevix:open-task-create", onOpen);
  }, []);

  const mergedInitialValues = useMemo(
    () => ({
      assignedTo: profile?.user_id || user?.id || undefined,
      ...initialValues,
    }),
    [initialValues, profile?.user_id, user?.id],
  );

  return (
    <TaskCreateDialog
      open={open}
      onOpenChange={setOpen}
      companyId={profile?.company_id}
      currentUserId={profile?.user_id || user?.id || null}
      initialValues={mergedInitialValues}
      onCreated={(task) => {
        window.dispatchEvent(new CustomEvent("corevix:task-created", { detail: { task } }));
        if (!openDetailAfterCreate || !task?.id) return;
        window.dispatchEvent(
          new CustomEvent("corevix:open-global-detail", {
            detail: {
              group: "tasks",
              id: task.id,
              href: `/tasks?taskId=${encodeURIComponent(task.id)}`,
            },
          }),
        );
      }}
    />
  );
}
