-- Reconcile invoice_items with the active invoice editor/detail queries.
-- Some installs created invoice_items from the public invoice migration, which
-- did not include company_id, tax_rate or sort_order. This migration backfills
-- company_id from invoices and keeps existing line items.

alter table public.invoice_items
  add column if not exists company_id uuid,
  add column if not exists tax_rate numeric default 0,
  add column if not exists sort_order integer default 0;

update public.invoice_items ii
set company_id = i.company_id
from public.invoices i
where ii.invoice_id = i.id
  and ii.company_id is null;

update public.invoice_items
set
  quantity = coalesce(quantity, 1),
  unit_price = coalesce(unit_price, 0),
  total = coalesce(total, 0),
  tax_rate = coalesce(tax_rate, 0),
  sort_order = coalesce(sort_order, 0)
where quantity is null
  or unit_price is null
  or total is null
  or tax_rate is null
  or sort_order is null;

do $$
begin
  if exists (
    select 1
    from public.invoice_items
    where company_id is null
  ) then
    raise exception 'Cannot set invoice_items.company_id NOT NULL: some rows could not be matched to invoices.company_id';
  end if;
end $$;

alter table public.invoice_items
  alter column company_id set not null,
  alter column quantity set default 1,
  alter column unit_price set default 0,
  alter column total set default 0,
  alter column tax_rate set default 0,
  alter column sort_order set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_items_company_id_fkey'
      and conrelid = 'public.invoice_items'::regclass
  ) then
    alter table public.invoice_items
      add constraint invoice_items_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_items_invoice_id_fkey'
      and conrelid = 'public.invoice_items'::regclass
  ) then
    alter table public.invoice_items
      add constraint invoice_items_invoice_id_fkey
      foreign key (invoice_id) references public.invoices(id) on delete cascade;
  end if;
end $$;

create index if not exists invoice_items_company_id_idx on public.invoice_items(company_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists invoice_items_company_invoice_idx on public.invoice_items(company_id, invoice_id);
create index if not exists invoice_items_sort_idx on public.invoice_items(company_id, invoice_id, sort_order, created_at);

alter table public.invoice_items enable row level security;

drop policy if exists "view invoice_items" on public.invoice_items;
create policy "view invoice_items"
on public.invoice_items
for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "create invoice_items" on public.invoice_items;
create policy "create invoice_items"
on public.invoice_items
for insert
to authenticated
with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "update invoice_items" on public.invoice_items;
create policy "update invoice_items"
on public.invoice_items
for update
to authenticated
using (company_id = public.get_user_company_id(auth.uid()))
with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "delete invoice_items" on public.invoice_items;
create policy "delete invoice_items"
on public.invoice_items
for delete
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));
