import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

export type TeamInvitationActionResult = {
  ok: true;
  email_sent: boolean;
  invitation_link: string;
  token?: string;
  invitationId?: string;
  delivery_channel?: "gmail" | "resend" | "manual";
  gmail_error?: string;
  resend_error?: string;
  status?: string;
};

export function useUpdateUserRole() {
  const updateRole = async (targetUserId: string, newRole: AppRole) => {
    const { error } = await (supabase as any).rpc("update_team_member_role", {
      _target_user_id: targetUserId,
      _new_role: newRole,
    });
    if (error) throw error;
  };
  return { updateRole };
}

export function useToggleUserStatus() {
  const toggleStatus = async (targetUserId: string, active: boolean) => {
    const { error } = await (supabase as any).rpc("toggle_team_member_status", {
      _target_user_id: targetUserId,
      _active: active,
    });
    if (error) throw error;
  };
  return { toggleStatus };
}

export function useInviteUser() {
  const invite = async (args: {
    email: string;
    role: AppRole;
    full_name?: string;
    department?: string;
    redirectTo?: string;
  }) => {
    const { data, error } = await (supabase as any).functions.invoke("invite-user", {
      body: { action: "create", ...args },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Invite failed");
    return data as TeamInvitationActionResult;
  };

  const resendInvite = async (invitationId: string, redirectTo?: string) => {
    const { data, error } = await (supabase as any).functions.invoke("invite-user", {
      body: { action: "resend", invitationId, redirectTo },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Resend failed");
    return data as TeamInvitationActionResult;
  };

  const revokeInvite = async (invitationId: string) => {
    const { data, error } = await (supabase as any).functions.invoke("invite-user", {
      body: { action: "revoke", invitationId },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Revoke failed");
    return data as TeamInvitationActionResult;
  };

  return { invite, resendInvite, revokeInvite };
}
