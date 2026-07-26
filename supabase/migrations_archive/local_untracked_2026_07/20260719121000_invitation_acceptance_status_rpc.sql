-- Public invitation status helper.
-- The invitation token is already a secret carried in the invite URL; this only returns
-- the minimum state needed to avoid accepting expired or invalid links in the UI.

CREATE OR REPLACE FUNCTION public.get_invitation_acceptance_status(
  _token text,
  _email text DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  status text,
  email text,
  expires_at timestamptz,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      i.status = 'pending'
      AND i.expires_at > now()
      AND (_email IS NULL OR lower(i.email) = lower(_email))
    ) AS is_valid,
    CASE
      WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired'
      ELSE i.status::text
    END AS status,
    i.email,
    i.expires_at,
    i.role
  FROM public.invitations i
  WHERE i.token = _token
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_invitation_acceptance_status(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation_acceptance_status(text, text) TO anon, authenticated;
