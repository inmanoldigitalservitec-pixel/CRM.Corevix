create table if not exists public.company_currency_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  base_currency text not null default 'USD',
  usd_to_dop_rate numeric(14, 6) not null default 60,
  rate_source text not null default 'manual',
  rate_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint company_currency_settings_base_currency_check
    check (base_currency in ('USD', 'DOP')),
  constraint company_currency_settings_rate_source_check
    check (rate_source in ('manual')),
  constraint company_currency_settings_usd_to_dop_rate_check
    check (usd_to_dop_rate > 0)
);

alter table public.company_currency_settings enable row level security;

drop policy if exists "view company currency settings" on public.company_currency_settings;
create policy "view company currency settings"
on public.company_currency_settings
for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "create company currency settings" on public.company_currency_settings;
create policy "create company currency settings"
on public.company_currency_settings
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin', 'admin', 'manager']::public.app_role[])
);

drop policy if exists "update company currency settings" on public.company_currency_settings;
create policy "update company currency settings"
on public.company_currency_settings
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

drop trigger if exists update_company_currency_settings_updated_at
on public.company_currency_settings;

create trigger update_company_currency_settings_updated_at
before update on public.company_currency_settings
for each row
execute function public.update_updated_at_column();
