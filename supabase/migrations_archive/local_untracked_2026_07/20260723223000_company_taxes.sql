create table if not exists public.company_taxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rate numeric(8, 4) not null default 0,
  tax_type text not null default 'sales',
  is_active boolean not null default true,
  is_default boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint company_taxes_name_check
    check (length(trim(name)) > 0),
  constraint company_taxes_rate_check
    check (rate >= 0 and rate <= 100),
  constraint company_taxes_tax_type_check
    check (tax_type in ('sales', 'withholding', 'other')),
  constraint company_taxes_default_active_check
    check (is_default = false or is_active = true)
);

create unique index if not exists company_taxes_company_type_name_idx
  on public.company_taxes(company_id, tax_type, lower(trim(name)));

create unique index if not exists company_taxes_one_default_per_type_idx
  on public.company_taxes(company_id, tax_type)
  where is_default = true;

create index if not exists company_taxes_company_active_idx
  on public.company_taxes(company_id, is_active, tax_type, name);

alter table public.company_taxes enable row level security;

drop policy if exists "view company taxes" on public.company_taxes;
create policy "view company taxes"
on public.company_taxes
for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "create company taxes" on public.company_taxes;
create policy "create company taxes"
on public.company_taxes
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin', 'admin', 'manager']::public.app_role[])
);

drop policy if exists "update company taxes" on public.company_taxes;
create policy "update company taxes"
on public.company_taxes
for update
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin', 'admin', 'manager']::public.app_role[])
)
with check (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin', 'admin', 'manager']::public.app_role[])
);

drop policy if exists "delete company taxes" on public.company_taxes;
create policy "delete company taxes"
on public.company_taxes
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin', 'admin', 'manager']::public.app_role[])
);

drop trigger if exists update_company_taxes_updated_at
on public.company_taxes;

create trigger update_company_taxes_updated_at
before update on public.company_taxes
for each row
execute function public.update_updated_at_column();

insert into public.company_taxes (
  company_id,
  name,
  rate,
  tax_type,
  is_active,
  is_default,
  description
)
select
  c.id,
  'ITBIS 18%',
  18,
  'sales',
  true,
  true,
  'Impuesto general de ventas'
from public.companies c
where not exists (
  select 1
  from public.company_taxes t
  where t.company_id = c.id
    and t.tax_type = 'sales'
    and t.is_default = true
);

insert into public.company_taxes (
  company_id,
  name,
  rate,
  tax_type,
  is_active,
  is_default,
  description
)
select
  c.id,
  'Exento',
  0,
  'sales',
  true,
  false,
  'Sin impuesto'
from public.companies c
where not exists (
  select 1
  from public.company_taxes t
  where t.company_id = c.id
    and t.tax_type = 'sales'
    and lower(trim(t.name)) = 'exento'
);
