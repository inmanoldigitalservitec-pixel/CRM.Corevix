import { useEffect, useMemo, useState } from "react";
import {
  ReminderCreateDialog,
  type ReminderCreateInitialValues,
  type ReminderEventRow,
} from "@/components/calendar/reminder-create-dialog";
import { useAuth } from "@/hooks/use-auth";

type ReminderCreateEventDetail = {
  initialValues?: ReminderCreateInitialValues;
};

export function openGlobalReminderCreate(detail: ReminderCreateEventDetail = {}) {
  window.dispatchEvent(new CustomEvent("corevix:open-reminder-create", { detail }));
}

export function GlobalReminderCreateHost() {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<ReminderCreateInitialValues | undefined>();

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ReminderCreateEventDetail>).detail || {};
      setInitialValues(detail.initialValues);
      setOpen(true);
    };
    window.addEventListener("corevix:open-reminder-create", onOpen);
    return () => window.removeEventListener("corevix:open-reminder-create", onOpen);
  }, []);

  const mergedInitialValues = useMemo(
    () => initialValues,
    [initialValues],
  );

  return (
    <ReminderCreateDialog
      open={open}
      onOpenChange={setOpen}
      companyId={profile?.company_id}
      currentUserId={profile?.user_id || user?.id || null}
      initialValues={mergedInitialValues}
      onCreated={(event: ReminderEventRow) => {
        window.dispatchEvent(new CustomEvent("corevix:reminder-created", { detail: { event } }));
      }}
    />
  );
}
