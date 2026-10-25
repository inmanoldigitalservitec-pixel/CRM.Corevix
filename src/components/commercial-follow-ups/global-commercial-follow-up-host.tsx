import { useEffect, useState } from "react";
import {
  CommercialFollowUpPanel,
  type CommercialFollowUpOpenRequest,
} from "./commercial-follow-up-panel";

const OPEN_EVENT = "corevix:open-commercial-follow-up";

/** Typed launcher shared by Leads, Pipeline, Clients, WhatsApp and the follow-up inbox. */
export function openCommercialFollowUp(request: CommercialFollowUpOpenRequest = {}) {
  window.dispatchEvent(
    new CustomEvent<CommercialFollowUpOpenRequest>(OPEN_EVENT, { detail: request }),
  );
}

export function GlobalCommercialFollowUpHost() {
  const [request, setRequest] = useState<CommercialFollowUpOpenRequest>({});
  const [requestKey, setRequestKey] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<CommercialFollowUpOpenRequest>).detail || {};
      setRequest(detail);
      setRequestKey((current) => current + 1);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <CommercialFollowUpPanel
      key={requestKey}
      open={open}
      onOpenChange={setOpen}
      request={request}
    />
  );
}
