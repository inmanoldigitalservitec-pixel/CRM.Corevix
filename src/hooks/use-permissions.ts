import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

const ROLE_PRIORITY: AppRole[] = ["super_admin", "admin", "manager", "sales_agent", "viewer"];

export function getEffectiveRole(roles: string[] | null | undefined): AppRole {
  const set = new Set((roles || []) as string[]);
  for (const r of ROLE_PRIORITY) {
    if (set.has(r)) return r;
  }
  return "viewer";
}

export function useRole() {
  const { roles } = useAuth();
  const role = useMemo(() => getEffectiveRole(roles), [roles]);
  const isAtLeast = useMemo(() => {
    const idx = ROLE_PRIORITY.indexOf(role);
    return (min: AppRole) => idx <= ROLE_PRIORITY.indexOf(min);
  }, [role]);
  return { role, isAtLeast };
}

type PermissionKey =
  | "leads.view_all"
  | "leads.view_assigned"
  | "leads.create"
  | "leads.edit"
  | "leads.delete"
  | "clients.view_all"
  | "clients.view_assigned"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  | "deals.view_all"
  | "deals.view_assigned"
  | "deals.create"
  | "deals.edit"
  | "deals.delete"
  | "tasks.view_all"
  | "tasks.view_assigned"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "projects.view_all"
  | "projects.view_assigned"
  | "projects.create"
  | "projects.edit"
  | "projects.delete"
  | "settings.view"
  | "settings.manage"
  | "team.view"
  | "team.manage";

type PermissionRow = {
  module: string;
  role: AppRole;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_assign: boolean;
};

export function usePermissions() {
  const { profile } = useAuth();
  const { role, isAtLeast } = useRole();

  const isActiveMember = !!profile?.company_id && !!profile?.is_active;

  const [dbPerms, setDbPerms] = useState<Record<string, PermissionRow> | null>(null);
  const [dbPermsLoading, setDbPermsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isActiveMember || !profile?.company_id) {
        setDbPerms(null);
        return;
      }
      setDbPermsLoading(true);
      const { data, error } = await (supabase as any)
        .from("permissions")
        .select("module, role, can_view, can_create, can_edit, can_delete, can_assign")
        .eq("company_id", profile.company_id)
        .eq("role", role);
      if (cancelled) return;
      if (error) {
        setDbPerms(null);
        setDbPermsLoading(false);
        return;
      }
      const map: Record<string, PermissionRow> = {};
      (data || []).forEach((row: PermissionRow) => {
        map[row.module] = row;
      });
      setDbPerms(map);
      setDbPermsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isActiveMember, profile?.company_id, role]);

  const resolveFromDb = (key: PermissionKey): boolean | null => {
    if (!dbPerms) return null;
    const [module, action] = key.split(".") as [string, string];
    const row = dbPerms[module];
    if (!row) return null;
    if (action === "view") return row.can_view;
    if (action === "manage")
      return row.can_edit || row.can_create || row.can_delete || row.can_assign;
    if (action === "create") return row.can_create;
    if (action === "edit") return row.can_edit;
    if (action === "delete") return row.can_delete;
    if (action === "view_all") return row.can_view && role !== "sales_agent";
    if (action === "view_assigned") return row.can_view && role === "sales_agent";
    return null;
  };

  const can = useMemo(() => {
    return (key: PermissionKey): boolean => {
      if (!isActiveMember) return false;

      // Super/admin: full access
      if (isAtLeast("admin")) return true;

      const fromDb = resolveFromDb(key);
      if (fromDb !== null) {
        // Enforce invariant roles even if the table is misconfigured.
        if (role === "viewer" && !key.endsWith(".view_all") && key !== "settings.view")
          return false;
        if (role === "sales_agent" && key.endsWith(".delete")) return false;
        return fromDb;
      }

      if (role === "manager") {
        if (key === "team.manage" || key === "team.view") return false;
        if (key === "settings.manage") return false;
        if (key === "settings.view") return true;
        return true;
      }

      if (role === "sales_agent") {
        if (key === "team.view" || key === "team.manage") return false;
        if (key === "settings.view" || key === "settings.manage") return false;
        if (key.endsWith(".delete")) return false;
        if (key.endsWith(".view_all")) return false;
        if (key.endsWith(".view_assigned")) return true;
        if (key.endsWith(".create")) return true;
        if (key.endsWith(".edit")) return true;
        return false;
      }

      // viewer
      if (role === "viewer") {
        if (key === "settings.view") return false;
        if (key === "settings.manage") return false;
        if (key === "team.view" || key === "team.manage") return false;
        if (key.endsWith(".view_all")) return true;
        if (key.endsWith(".view_assigned")) return false;
        return false;
      }

      return false;
    };
  }, [isActiveMember, isAtLeast, role, dbPerms]);

  return { role, can, isActiveMember, dbPermsLoading };
}
