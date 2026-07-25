create or replace function public.seed_default_finance_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin: todas las capacidades financieras.
  insert into public.role_capabilities (
    company_id,
    role,
    capability,
    is_allowed
  )
  select
    new.id,
    'admin'::public.app_role,
    pc.capability,
    true
  from public.permission_capabilities pc
  on conflict (company_id, role, capability) do nothing;

  -- Manager: operaciones financieras excepto anular facturas.
  insert into public.role_capabilities (
    company_id,
    role,
    capability,
    is_allowed
  )
  select
    new.id,
    'manager'::public.app_role,
    pc.capability,
    true
  from public.permission_capabilities pc
  where pc.capability in (
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
  on conflict (company_id, role, capability) do nothing;

  -- Agente de ventas: lectura y registro ordinario.
  insert into public.role_capabilities (
    company_id,
    role,
    capability,
    is_allowed
  )
  select
    new.id,
    'sales_agent'::public.app_role,
    pc.capability,
    true
  from public.permission_capabilities pc
  where pc.capability in (
    'payments.view',
    'payments.create',
    'invoices.view',
    'credit_notes.view'
  )
  on conflict (company_id, role, capability) do nothing;

  -- Viewer y collaborator: solo lectura.
  insert into public.role_capabilities (
    company_id,
    role,
    capability,
    is_allowed
  )
  select
    new.id,
    role_data.role,
    pc.capability,
    true
  from (
    values
      ('viewer'::public.app_role),
      ('collaborator'::public.app_role)
  ) as role_data(role)
  cross join public.permission_capabilities pc
  where pc.capability in (
    'payments.view',
    'invoices.view',
    'credit_notes.view'
  )
  on conflict (company_id, role, capability) do nothing;

  return new;
end;
$$;

drop trigger if exists
  companies_seed_default_finance_capabilities
on public.companies;

create trigger companies_seed_default_finance_capabilities
after insert
on public.companies
for each row
execute function public.seed_default_finance_capabilities();

revoke all
on function public.seed_default_finance_capabilities()
from public, anon, authenticated;

grant execute
on function public.seed_default_finance_capabilities()
to service_role;

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
  select
    case
      when p_user_id is null then false
      when nullif(btrim(p_capability), '') is null then false

      else exists (
        select 1
        from public.profiles p
        join public.companies c
          on c.id = p.company_id
        join public.user_roles ur
          on ur.user_id = p.user_id
        where p.user_id = p_user_id
          and p.is_active = true
          and (
            ur.role = 'super_admin'::public.app_role
            or exists (
              select 1
              from public.role_capabilities rc
              where rc.company_id = p.company_id
                and rc.role = ur.role
                and rc.capability = p_capability
                and rc.is_allowed = true
            )
          )
      )
    end;
$$;

revoke all
on function public.has_permission(uuid, text)
from public, anon;

grant execute
on function public.has_permission(uuid, text)
to authenticated, service_role;
