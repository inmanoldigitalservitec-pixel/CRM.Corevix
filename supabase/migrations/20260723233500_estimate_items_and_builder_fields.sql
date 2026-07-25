-- Estimate builder persistence.
-- Adds line items to estimates using the same snapshot philosophy as proposals:
-- item/product data, tax used at creation time, currency conversion used at creation time.

alter table public.estimates
  add column if not exists reference text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists discount_type text not null default 'none',
  add column if not exists discount_value numeric(14, 2) not null default 0,
  add column if not exists adjustment numeric(14, 2) not null default 0,
  add column if not exists quantity_mode text not null default 'qty',
  add column if not exists client_note text,
  add column if not exists terms text,
  add column if not exists estimate_data jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_discount_type_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_discount_type_check
      check (discount_type in ('none', 'fixed', 'percent'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_quantity_mode_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_quantity_mode_check
      check (quantity_mode in ('qty', 'hours', 'qty_hours'));
  end if;
end $$;

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_name text not null default '',
  description text,
  quantity numeric(14, 4) not null default 1,
  unit_type text not null default 'qty',
  rate numeric(14, 2) not null default 0,
  tax_rate numeric(8, 4) not null default 0,
  tax_id uuid references public.company_taxes(id) on delete set null,
  tax_name text,
  tax_amount numeric(14, 2) not null default 0,
  is_optional boolean not null default false,
  sort_order integer not null default 0,
  amount numeric(14, 2) not null default 0,
  document_currency text,
  original_currency text,
  original_rate numeric(14, 2),
  converted_rate numeric(14, 2),
  exchange_rate numeric(14, 6),
  exchange_rate_source text,
  exchange_rate_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_items_quantity_check check (quantity > 0),
  constraint estimate_items_unit_type_check check (unit_type in ('qty', 'hours', 'qty_hours')),
  constraint estimate_items_rate_check check (rate >= 0),
  constraint estimate_items_tax_rate_check check (tax_rate >= 0 and tax_rate <= 100),
  constraint estimate_items_tax_amount_check check (tax_amount >= 0),
  constraint estimate_items_amount_check check (amount >= 0)
);

create index if not exists idx_estimate_items_company_estimate
  on public.estimate_items(company_id, estimate_id, sort_order);

create index if not exists idx_estimate_items_company_product
  on public.estimate_items(company_id, product_id);

create index if not exists idx_estimate_items_company_tax
  on public.estimate_items(company_id, tax_id);

alter table public.estimate_items enable row level security;

drop policy if exists "Company members can read estimate items" on public.estimate_items;
create policy "Company members can read estimate items"
  on public.estimate_items
  for select
  using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "Company members can insert estimate items" on public.estimate_items;
create policy "Company members can insert estimate items"
  on public.estimate_items
  for insert
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "Company members can update estimate items" on public.estimate_items;
create policy "Company members can update estimate items"
  on public.estimate_items
  for update
  using (company_id = public.get_user_company_id(auth.uid()))
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "Company members can delete estimate items" on public.estimate_items;
create policy "Company members can delete estimate items"
  on public.estimate_items
  for delete
  using (company_id = public.get_user_company_id(auth.uid()));

drop trigger if exists set_estimate_items_updated_at on public.estimate_items;
create trigger set_estimate_items_updated_at
  before update on public.estimate_items
  for each row
  execute function public.set_updated_at();

-- Preserve existing estimate totals as one generated line so older records still
-- behave correctly when the new builder starts reading item rows.
insert into public.estimate_items (
  company_id,
  estimate_id,
  item_name,
  description,
  quantity,
  unit_type,
  rate,
  tax_rate,
  tax_id,
  tax_name,
  tax_amount,
  is_optional,
  sort_order,
  amount,
  document_currency,
  original_currency,
  original_rate,
  converted_rate,
  exchange_rate,
  exchange_rate_source,
  exchange_rate_updated_at,
  created_at,
  updated_at
)
select
  e.company_id,
  e.id,
  coalesce(nullif(btrim(e.title), ''), 'Cotización'),
  e.notes,
  1,
  coalesce(nullif(e.quantity_mode, ''), 'qty'),
  greatest(0, coalesce(e.subtotal, e.total - coalesce(e.tax, 0), e.total, 0)),
  coalesce(
    e.tax_rate,
    case
      when coalesce(e.subtotal, 0) > 0
        then round(((coalesce(e.tax, 0) / nullif(e.subtotal, 0)) * 100)::numeric, 4)
      else 0
    end
  ),
  e.tax_id,
  e.tax_name,
  coalesce(e.tax_amount, e.tax, 0),
  false,
  0,
  greatest(0, coalesce(e.subtotal, e.total - coalesce(e.tax, 0), e.total, 0)),
  coalesce(e.currency, e.base_currency),
  coalesce(e.currency, e.base_currency),
  greatest(0, coalesce(e.subtotal, e.total - coalesce(e.tax, 0), e.total, 0)),
  greatest(0, coalesce(e.subtotal, e.total - coalesce(e.tax, 0), e.total, 0)),
  coalesce(e.exchange_rate, 1),
  e.exchange_rate_source,
  e.exchange_rate_updated_at,
  e.created_at,
  e.updated_at
from public.estimates e
where not exists (
    select 1
    from public.estimate_items ei
    where ei.estimate_id = e.id
  )
  and (coalesce(e.subtotal, 0) > 0 or coalesce(e.total, 0) > 0);

notify pgrst, 'reload schema';
