## invite-user

Sends an email invitation to join the inviter's company.

### Env vars (Supabase Edge Functions)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` (e.g. `https://mi-dominio.com`)
- `RESEND_API_KEY` (optional)
- `RESEND_FROM` (optional, defaults to `Corevix CRM <onboarding@resend.dev>`)

### Request

`POST` JSON body:

- `email` (string, required)
- `full_name` (string, optional)
- `department` (string, optional)
- `role` (one of `super_admin|admin|manager|sales_agent|collaborator|viewer`, optional, default `viewer`)
- `redirectTo` (string, optional) – where the magic link should redirect after acceptance

Requires `Authorization: Bearer <user_jwt>` for an authenticated user who can manage users (admin/super_admin).

### Manual test

1. Deploy the function (Supabase CLI): `supabase functions deploy invite-user`
2. In Supabase dashboard, set the env vars above for this function
3. In the app as admin: Team → Invite user → enter email/role → “Crear invitación”

### Notes

- If `RESEND_API_KEY` is not set, the function returns `email_sent=false` and includes `invitation_link` so you can copy/share it manually.
