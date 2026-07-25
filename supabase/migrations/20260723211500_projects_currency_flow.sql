alter table if exists public.projects
  add column if not exists budget_currency text default 'USD',
  add column if not exists base_currency text default 'USD',
  add column if not exists exchange_rate numeric,
  add column if not exists budget_base numeric;

update public.projects
set
  budget_currency = coalesce(nullif(upper(budget_currency), ''), coalesce(nullif(upper(base_currency), ''), 'USD')),
  base_currency = coalesce(nullif(upper(base_currency), ''), 'USD'),
  exchange_rate = coalesce(exchange_rate, 60),
  budget_base = coalesce(budget_base, budget)
where budget is not null;

alter table if exists public.projects
  add constraint projects_budget_currency_check
  check (budget_currency in ('USD', 'DOP'));

alter table if exists public.projects
  add constraint projects_base_currency_check
  check (base_currency in ('USD', 'DOP'));
