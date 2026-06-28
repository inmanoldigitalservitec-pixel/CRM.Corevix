import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserContext(request: Request, supabase: SupabaseClient) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization Bearer token");
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Invalid Supabase user token");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,user_id,company_id,full_name,email")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("User profile or company_id not found");
  }

  return {
    userId: user.id,
    profileId: profile.id,
    companyId: profile.company_id,
    profile,
  };
}
