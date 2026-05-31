export type MetaPlatform = "messenger" | "instagram";

export type MetaConversationListRow = {
  id: string;
  company_id: string;
  account_id: string | null;
  platform: MetaPlatform;
  sender_name: string | null;
  external_user_id: string;
  sender_profile_pic: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  status: string | null;
  linked_lead_id: string | null;
  linked_client_id: string | null;
  linked_deal_id: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type MetaMessageRow = {
  id: string;
  company_id: string;
  account_id: string | null;
  conversation_id: string | null;
  platform: MetaPlatform;
  external_message_id: string | null;
  direction: "inbound" | "outbound";
  message_type: string;
  text: string | null;
  attachments: unknown[];
  raw_payload: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
};
