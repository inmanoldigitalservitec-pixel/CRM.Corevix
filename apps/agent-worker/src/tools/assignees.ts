import type { ToolContext, ToolResult } from "../types";

const PROFILE_SELECT = "id,user_id,full_name,email,is_active";

function normalize(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@._\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSelf(value: any) {
  const text = normalize(value);
  if (!text) return true;
  return [
    "yo",
    "mi",
    "me",
    "a mi",
    "para mi",
    "conmigo",
    "mi usuario",
    "usuario actual",
    "current user",
    "current_user",
    "myself",
    "me mismo",
  ].includes(text);
}

function getInput(args: any) {
  const raw =
    args.assigned_to ??
    args.assignee ??
    args.owner ??
    args.owner_id ??
    args.user ??
    args.user_id ??
    args.profile_id ??
    args.responsible ??
    args.responsable ??
    args.assign_to;

  if (raw && typeof raw === "object") {
    return raw.profile_id || raw.profileId || raw.id || raw.user_id || raw.userId || raw.email || raw.full_name || raw.name || "";
  }

  return raw;
}

async function currentProfile(ctx: ToolContext) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("company_id", ctx.companyId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function companyProfiles(ctx: ToolContext) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("company_id", ctx.companyId)
    .order("full_name", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function resolveCrmAssignee(ctx: ToolContext, args: any): Promise<ToolResult & { profileId?: string; profile?: any }> {
  const input = getInput(args);
  const self = await currentProfile(ctx);

  if (isSelf(input)) {
    if (!self?.id) return { ok: false, error: "No pude identificar tu usuario actual para asignar la tarea." };
    return { ok: true, profileId: self.id, profile: self };
  }

  const raw = String(input ?? "").trim();
  if (!raw) {
    if (!self?.id) return { ok: false, error: "Toda tarea necesita responsable y no pude identificar tu usuario actual." };
    return { ok: true, profileId: self.id, profile: self };
  }

  const profiles = await companyProfiles(ctx);
  const wanted = normalize(raw);
  const selfKeys = [self?.id, self?.user_id, self?.full_name, self?.email].filter(Boolean).map(normalize);
  if (self?.id && selfKeys.includes(wanted)) return { ok: true, profileId: self.id, profile: self };

  if (isUuid(raw)) {
    const direct = profiles.find((profile: any) => profile.id === raw || profile.user_id === raw);
    if (direct?.id) return { ok: true, profileId: direct.id, profile: direct };
  }

  const exact = profiles.filter((profile: any) => normalize(profile.full_name) === wanted || normalize(profile.email) === wanted);
  const contains = profiles.filter((profile: any) => {
    const name = normalize(profile.full_name);
    const email = normalize(profile.email);
    return (name && name.includes(wanted)) || (email && email.includes(wanted));
  });

  const matches = (exact.length ? exact : contains).filter((profile: any) => profile.is_active !== false);
  if (matches.length === 1) return { ok: true, profileId: matches[0].id, profile: matches[0] };

  if (matches.length > 1) {
    return {
      ok: false,
      error: "Encontré más de un usuario parecido. Indica el email o nombre exacto del responsable.",
      data: matches.slice(0, 8).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        is_active: profile.is_active,
      })),
    };
  }

  return { ok: false, error: `No encontré un usuario activo llamado "${raw}" dentro del CRM.` };
}

export function hasAssigneeInput(args: any) {
  return ["assigned_to", "assignee", "owner", "owner_id", "user", "user_id", "profile_id", "responsible", "responsable", "assign_to"].some((key) =>
    Object.prototype.hasOwnProperty.call(args ?? {}, key),
  );
}
