-- Link invoices to proposals/products and support public invoice viewing + items.
-- Safe migration: uses IF NOT EXISTS guards where possible.

-- invoices columns
alter table if exists public.invoices
  add column if not exists proposal_id uuid null,
  add column if not exists product_id uuid null,
  add column if not exists public_token text not null default gen_random_uuid()::text,
  add column if not exists payment_link text null,
  add column if not exists paid_at timestamptz null,
  add column if not exists sent_at timestamptz null,
  add column if not exists viewed_at timestamptz null,
  add column if not exists created_by uuid null;

-- foreign keys (add as separate statements for compatibility)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_proposal_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_proposal_id_fkey
      foreign key (proposal_id) references public.proposals(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_product_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_product_id_fkey
      foreign key (product_id) references public.products(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_created_by_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end $$;

-- uniqueness for public_token
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_public_token_key'
  ) then
    alter table public.invoices
      add constraint invoices_public_token_key unique (public_token);
  end if;
end $$;

-- invoice_items table
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists invoices_proposal_id_idx on public.invoices(proposal_id);

