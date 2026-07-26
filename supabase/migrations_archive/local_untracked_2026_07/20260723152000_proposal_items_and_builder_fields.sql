alter table public.proposals
  add column if not exists proposal_date date,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists discount_type text not null default 'none',
  add column if not exists discount_value numeric not null default 0,
  add column if not exists adjustment_value numeric not null default 0,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists tax_total numeric not null default 0,
  add column if not exists total numeric not null default 0,
  add column if not exists quantity_mode text not null default 'qty',
  add column if not exists tags text[] not null default '{}',
  add column if not exists allow_comments boolean not null default true,
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_address text,
  add column if not exists recipient_city text,
  add column if not exists recipient_state text,
  add column if not exists recipient_country text,
  add column if not exists recipient_zip_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposals_discount_type_check'
  ) then
    alter table public.proposals
      add constraint proposals_discount_type_check
      check (discount_type in ('none', 'fixed', 'amount', 'percent'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposals_quantity_mode_check'
  ) then
    alter table public.proposals
      add constraint proposals_quantity_mode_check
      check (quantity_mode in ('qty', 'hours', 'qty_hours'));
  end if;
end $$;

create index if not exists idx_proposals_assigned_to
  on public.proposals(company_id, assigned_to);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_name text not null default '',
  description text,
  quantity numeric not null default 1,
  unit_type text not null default 'qty',
  rate numeric not null default 0,
  tax_rate numeric not null default 0,
  is_optional boolean not null default false,
  sort_order integer not null default 0,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_items_unit_type_check check (unit_type in ('qty', 'hours', 'qty_hours'))
);

alter table public.proposal_items
  add column if not exists company_id uuid,
  add column if not exists proposal_id uuid,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists item_name text not null default '',
  add column if not exists description text,
  add column if not exists quantity numeric not null default 1,
  add column if not exists unit_type text not null default 'qty',
  add column if not exists rate numeric not null default 0,
  add column if not exists tax_rate numeric not null default 0,
  add column if not exists is_optional boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists amount numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_proposal_items_company_proposal
  on public.proposal_items(company_id, proposal_id, sort_order);

create index if not exists idx_proposal_items_company_product
  on public.proposal_items(company_id, product_id);

alter table public.proposal_items enable row level security;

drop policy if exists "view proposal items" on public.proposal_items;
create policy "view proposal items"
  on public.proposal_items
  for select
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "create proposal items" on public.proposal_items;
create policy "create proposal items"
  on public.proposal_items
  for insert
  to authenticated
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "update proposal items" on public.proposal_items;
create policy "update proposal items"
  on public.proposal_items
  for update
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()))
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "delete proposal items" on public.proposal_items;
create policy "delete proposal items"
  on public.proposal_items
  for delete
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()));

create or replace function public.set_proposal_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists proposal_items_updated_at on public.proposal_items;
create trigger proposal_items_updated_at
  before update on public.proposal_items
  for each row
  execute function public.set_proposal_items_updated_at();
