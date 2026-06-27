import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

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
      body: args,
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Invite failed");
    return data as {
      ok: true;
      email_sent: boolean;
      invitation_link: string;
      token?: string;
      invitationId?: string;
      resend_error?: string;
    };
  };
  return { invite };
}
