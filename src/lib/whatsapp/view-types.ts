export type ConversationStatus = "open" | "pending" | "resolved" | "archived" | string;

// NOTE: These are view row types (Supabase views), not present in generated `src/integrations/supabase/types.ts`.
// Do not move them to generated types.

export interface CrmWhatsappConversationListRow {
  conversation_id: string;
  company_id: string;
  contact_id: string | null;
  lead_id: string | null;
  whatsapp_lead_id: string | null;
  conversation_status: ConversationStatus | null;
  channel: string | null;
  bot_enabled: boolean | null;
  needs_human: boolean | null;
  unread_count: number | null;
  assigned_to: string | null;
  last_message: string | null;
  last_message_at: string | null;
  conversation_created_at: string | null;
  conversation_updated_at: string | null;
  phone: string | null;
  display_name: string | null;
  contact_name: string | null;
  whatsapp_profile_name: string | null;
  whatsapp_id: string | null;
  last_seen_at: string | null;
  lead_name: string | null;
  business_name: string | null;
  selected_service: string | null;
  lead_stage: string | null;
  ready_for_sales: boolean | null;
  lead_wants_human: boolean | null;
  is_hot_lead: boolean | null;
  lead_summary: string | null;
}

export type MessageDirection = "inbound" | "outbound" | string;

export interface CrmWhatsappMessageRow {
  message_id: string;
  conversation_id: string;
  company_id: string;
  lead_id: string | null;
  phone: string | null;
  direction: MessageDirection | null;
  message_type: string | null;
  content: string | null;
  button_id: string | null;
  button_title: string | null;
  whatsapp_message_id: string | null;
  created_at: string;
  delivery_status: "sent" | "delivered" | "read" | "failed" | string | null;
  delivery_status_at: string | null;
}
