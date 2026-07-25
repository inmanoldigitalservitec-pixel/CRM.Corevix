-- ============================================================
-- Sensitive capability authorization
-- ============================================================

create table if not exists public.permission_capabilities (
  capability text primary key,
  module text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),

  constraint permission_capabilities_name_not_blank
    check (btrim(capability) <> ''),

  constraint permission_capabilities_module_not_blank
    check (btrim(module) <> ''),

  constraint permission_capabilities_action_not_blank
    check (btrim(action) <> ''),

  constraint permission_capabilities_format
    check (capability = module || '.' || action)
);

create unique index if not exists
  permission_capabilities_module_action_uidx
on public.permission_capabilities(module, action);

create table if not exists public.role_capabilities (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  role public.app_role not null,

  capability text not null
    references public.permission_capabilities(capability)
    on delete cascade,

  is_allowed boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint role_capabilities_company_role_capability_uidx
    unique(company_id, role, capability)
);

create index if not exists
  role_capabilities_company_role_idx
on public.role_capabilities(company_id, role);

alter table public.permission_capabilities
  enable row level security;

alter table public.role_capabilities
  enable row level security;

-- No direct access is needed from frontend clients yet.
revoke all
on table public.permission_capabilities
from public, anon, authenticated;

revoke all
on table public.role_capabilities
from public, anon, authenticated;

-- ============================================================
-- Seed capability catalog
-- ============================================================

insert into public.permission_capabilities (
  capability,
  module,
  action,
  description
)
values
  (
    'payments.view',
    'payments',
    'view',
    'View payments and related payment history.'
  ),
  (
    'payments.create',
    'payments',
    'create',
    'Register new invoice payments.'
  ),
  (
    'payments.reverse',
    'payments',
    'reverse',
    'Reverse the remaining net amount of a completed payment.'
  ),
  (
    'payments.refund',
    'payments',
    'refund',
    'Create partial or total refunds for completed payments.'
  ),
  (
    'invoices.view',
    'invoices',
    'view',
    'View invoices.'
  ),
  (
    'invoices.issue',
    'invoices',
    'issue',
    'Issue or send an invoice.'
  ),
  (
    'invoices.void',
    'invoices',
    'void',
    'Void or cancel an issued invoice.'
  ),
  (
    'credit_notes.view',
    'credit_notes',
    'view',
    'View credit notes.'
  ),
  (
    'credit_notes.issue',
    'credit_notes',
    'issue',
    'Issue a new credit note.'
  ),
  (
    'credit_notes.apply',
    'credit_notes',
    'apply',
    'Apply a credit note to an invoice.'
  )
on conflict (capability) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- ============================================================
-- Authorization context helper
-- ============================================================

create or replace function public.get_authorization_context(
  p_user_id uuid
)
returns table (
  user_id uuid,
  profile_id uuid,
  company_id uuid,
  role public.app_role,
  profile_active boolean,
  company_exists boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.id,
    p.company_id,
    ur.role,
    p.is_active,
    (c.id is not null)
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.user_id
  left join public.companies c
    on c.id = p.company_id
  where p.user_id = p_user_id
  order by
    case ur.role
      when 'super_admin' then 1
      when 'admin' then 2
      when 'manager' then 3
      when 'sales_agent' then 4
      when 'collaborator' then 5
      when 'viewer' then 6
      else 99
    end
  limit 1;
$$;

revoke all
on function public.get_authorization_context(uuid)
from public, anon, authenticated;

grant execute
on function public.get_authorization_context(uuid)
to service_role;

-- ============================================================
-- Capability lookup
-- ============================================================

create or replace function public.has_permission(
  p_user_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with auth_context as (
    select *
    from public.get_authorization_context(p_user_id)
  )
  select
    case
      when p_user_id is null then false
      when nullif(btrim(p_capability), '') is null then false

      -- Super admins retain global authority inside their company context.
      when exists (
        select 1
        from auth_context ac
        where ac.profile_active = true
          and ac.company_exists = true
          and ac.company_id is not null
          and ac.role = 'super_admin'
      ) then true

      else exists (
        select 1
        from auth_context ac
        join public.role_capabilities rc
          on rc.company_id = ac.company_id
         and rc.role = ac.role
         and rc.capability = p_capability
         and rc.is_allowed = true
        where ac.profile_active = true
          and ac.company_exists = true
          and ac.company_id is not null
      )
    end;
$$;

revoke all
on function public.has_permission(uuid, text)
from public, anon, authenticated;

grant execute
on function public.has_permission(uuid, text)
to authenticated, service_role;

-- ============================================================
-- Required capability assertion
-- ============================================================

create or replace function public.require_permission(
  p_capability text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_context record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Debe iniciar sesión para realizar esta operación.'
      using errcode = '42501';
  end if;

  select *
  into v_context
  from public.get_authorization_context(v_user_id);

  if v_context.user_id is null then
    raise exception
      'No se encontró un perfil para el usuario autenticado.'
      using errcode = '42501';
  end if;

  if coalesce(v_context.profile_active, false) = false then
    raise exception
      'El perfil del usuario está inactivo.'
      using errcode = '42501';
  end if;

  if v_context.company_id is null
     or coalesce(v_context.company_exists, false) = false then
    raise exception
      'No hay una compañía activa asociada al usuario.'
      using errcode = '42501';
  end if;

  if v_context.role is null then
    raise exception
      'El usuario no tiene un rol asignado.'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    v_user_id,
    p_capability
  ) then
    raise exception
      'No tiene el permiso requerido: %.',
      p_capability
      using errcode = '42501';
  end if;
end;
$$;

revoke all
on function public.require_permission(text)
from public, anon;

grant execute
on function public.require_permission(text)
to authenticated, service_role;

comment on function public.has_permission(uuid, text)
is
'Checks an active user profile, existing company, assigned role and company-specific sensitive capability.';

comment on function public.require_permission(text)
is
'Raises SQLSTATE 42501 unless the authenticated user has the requested sensitive capability.';

-- ============================================================
-- Default role capability assignments for existing companies
-- ============================================================

-- Super admin is handled directly by has_permission().
-- These defaults grant operational finance permissions to admins.

insert into public.role_capabilities (
  company_id,
  role,
  capability,
  is_allowed
)
select
  c.id,
  'admin'::public.app_role,
  pc.capability,
  true
from public.companies c
cross join public.permission_capabilities pc
on conflict (
  company_id,
  role,
  capability
) do nothing;

-- Managers can view and operate ordinary financial workflows,
-- but cannot void invoices by default.

insert into public.role_capabilities (
  company_id,
  role,
  capability,
  is_allowed
)
select
  c.id,
  'manager'::public.app_role,
  pc.capability,
  true
from public.companies c
join public.permission_capabilities pc
  on pc.capability in (
    'payments.view',
    'payments.create',
    'payments.reverse',
    'payments.refund',
    'invoices.view',
    'invoices.issue',
    'credit_notes.view',
    'credit_notes.issue',
    'credit_notes.apply'
  )
on conflict (
  company_id,
  role,
  capability
) do nothing;

-- Sales agents receive read/create permissions only.

insert into public.role_capabilities (
  company_id,
  role,
  capability,
  is_allowed
)
select
  c.id,
  'sales_agent'::public.app_role,
  pc.capability,
  true
from public.companies c
join public.permission_capabilities pc
  on pc.capability in (
    'payments.view',
    'payments.create',
    'invoices.view',
    'credit_notes.view'
  )
on conflict (
  company_id,
  role,
  capability
) do nothing;

-- Viewer and collaborator default to view-only finance access.

insert into public.role_capabilities (
  company_id,
  role,
  capability,
  is_allowed
)
select
  c.id,
  role_value.role,
  pc.capability,
  true
from public.companies c
cross join (
  values
    ('viewer'::public.app_role),
    ('collaborator'::public.app_role)
) role_value(role)
join public.permission_capabilities pc
  on pc.capability in (
    'payments.view',
    'invoices.view',
    'credit_notes.view'
  )
on conflict (
  company_id,
  role,
  capability
) do nothing;
