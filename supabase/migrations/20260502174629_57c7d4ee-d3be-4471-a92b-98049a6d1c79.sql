
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(UUID, app_role[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_any_role(UUID, app_role[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
