begin;

create table if not exists public.lead_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  custom_name text,
  custom_description text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  currency text not null default 'USD',
  estimated_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_products_has_interest check (product_id is not null or nullif(trim(custom_name), '') is not null)
);

-- Some environments already contain an older lead_products table. Upgrade it
-- in place before creating indexes or policies so the migration is idempotent.
alter table public.lead_products
  add column if not exists client_id uuid,
  add column if not exists deal_id uuid,
  add column if not exists custom_name text,
  add column if not exists custom_description text,
  add column if not exists quantity numeric(12,2) not null default 1,
  add column if not exists unit_price numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'USD',
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lead_products'
      and column_name = 'estimated_total'
  ) then
    alter table public.lead_products
      add column estimated_total numeric(14,2)
      generated always as (round(quantity * unit_price, 2)) stored;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lead_products_client_id_fkey'
  ) then
    alter table public.lead_products
      add constraint lead_products_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lead_products_deal_id_fkey'
  ) then
    alter table public.lead_products
      add constraint lead_products_deal_id_fkey
      foreign key (deal_id) references public.deals(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lead_products_created_by_fkey'
  ) then
    alter table public.lead_products
      add constraint lead_products_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists ix_lead_products_company_lead
  on public.lead_products(company_id, lead_id);
create index if not exists ix_lead_products_company_client
  on public.lead_products(company_id, client_id);
create index if not exists ix_lead_products_company_deal
  on public.lead_products(company_id, deal_id);
create unique index if not exists ux_lead_products_catalog_item
  on public.lead_products(company_id, lead_id, product_id)
  where product_id is not null;

alter table public.lead_products enable row level security;

drop policy if exists lead_products_select_company on public.lead_products;
create policy lead_products_select_company on public.lead_products
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = lead_products.company_id
      and coalesce(p.is_active, true)
  )
);

drop policy if exists lead_products_insert_company on public.lead_products;
create policy lead_products_insert_company on public.lead_products
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = lead_products.company_id
      and coalesce(p.is_active, true)
  )
);

drop policy if exists lead_products_update_company on public.lead_products;
create policy lead_products_update_company on public.lead_products
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = lead_products.company_id
      and coalesce(p.is_active, true)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = lead_products.company_id
      and coalesce(p.is_active, true)
  )
);

drop policy if exists lead_products_delete_company on public.lead_products;
create policy lead_products_delete_company on public.lead_products
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = lead_products.company_id
      and coalesce(p.is_active, true)
  )
);

create or replace function public.touch_lead_product_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_lead_product_updated_at on public.lead_products;
create trigger trg_touch_lead_product_updated_at
before update on public.lead_products
for each row execute function public.touch_lead_product_updated_at();

create or replace function public.propagate_converted_lead_product_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.converted_client_id is distinct from old.converted_client_id
     and new.converted_client_id is not null then
    update public.lead_products
      set client_id = new.converted_client_id,
          updated_at = now()
    where company_id = new.company_id
      and lead_id = new.id
      and client_id is distinct from new.converted_client_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_propagate_converted_lead_product_client on public.leads;
create trigger trg_propagate_converted_lead_product_client
after update of converted_client_id on public.leads
for each row execute function public.propagate_converted_lead_product_client();

commit;
