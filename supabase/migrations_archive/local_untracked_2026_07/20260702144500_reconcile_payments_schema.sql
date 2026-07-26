-- Reconcile payments schema with the active CRM payments UI.
-- This migration is intentionally idempotent and safe for databases that already
-- created payments from the older billing migration or from sales_core_sections.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.payments
  add column if not exists payment_number bigint,
  add column if not exists client_id uuid,
  add column if not exists status text,
  add column if not exists updated_at timestamptz;

-- The current UI supports manual/client-only payments, so invoice_id must be nullable.
alter table public.payments
  alter column invoice_id drop not null;

alter table public.payments
  alter column amount set default 0,
  alter column payment_date set default current_date,
  alter column method set default 'Manual',
  alter column status set default 'Completed',
  alter column updated_at set default now();

update public.payments
set
  method = coalesce(nullif(method, ''), 'Manual'),
  status = coalesce(nullif(status, ''), 'Completed'),
  updated_at = coalesce(updated_at, created_at, now())
where method is null
  or nullif(method, '') is null
  or status is null
  or nullif(status, '') is null
  or updated_at is null;

alter table public.payments
  alter column method set not null,
  alter column status set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_status_check
      check (status in ('Pending','Completed','Failed','Refunded'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_client_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payments_invoice_id_fkey'
      and conrelid = 'public.payments'::regclass
      and pg_get_constraintdef(oid) not ilike '%ON DELETE SET NULL%'
  ) then
    alter table public.payments drop constraint payments_invoice_id_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_invoice_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_invoice_id_fkey
      foreign key (invoice_id) references public.invoices(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'payments_payment_number_seq'
      and c.relkind = 'S'
  ) then
    create sequence public.payments_payment_number_seq;
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.payments'::regclass
      and attname = 'payment_number'
      and attidentity = ''
  ) then
    alter sequence public.payments_payment_number_seq owned by public.payments.payment_number;
    alter table public.payments
      alter column payment_number set default nextval('public.payments_payment_number_seq'::regclass);
  end if;
end $$;

update public.payments
set payment_number = nextval('public.payments_payment_number_seq'::regclass)
where payment_number is null;

select setval(
  'public.payments_payment_number_seq'::regclass,
  greatest(coalesce((select max(payment_number) from public.payments), 0), 1),
  true
);

create index if not exists payments_company_id_idx on public.payments(company_id);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_client_id_idx on public.payments(client_id);
create index if not exists payments_status_idx on public.payments(company_id, status);
create index if not exists payments_payment_date_idx on public.payments(company_id, payment_date desc);

alter table public.payments enable row level security;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop policy if exists "Company members can view payments" on public.payments;
create policy "Company members can view payments"
on public.payments
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = payments.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can insert payments" on public.payments;
create policy "Company members can insert payments"
on public.payments
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = payments.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can update payments" on public.payments;
create policy "Company members can update payments"
on public.payments
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = payments.company_id
      and coalesce(p.is_active, true) = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = payments.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can delete payments" on public.payments;
create policy "Company members can delete payments"
on public.payments
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = payments.company_id
      and coalesce(p.is_active, true) = true
  )
);
