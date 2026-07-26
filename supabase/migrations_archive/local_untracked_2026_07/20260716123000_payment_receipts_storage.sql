insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  file_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 3145728),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payment_receipts_company_id_idx on public.payment_receipts(company_id);
create index if not exists payment_receipts_payment_id_idx on public.payment_receipts(payment_id);
create index if not exists payment_receipts_invoice_id_idx on public.payment_receipts(invoice_id);

alter table public.payment_receipts enable row level security;

drop policy if exists "Company members can view payment receipts" on public.payment_receipts;
create policy "Company members can view payment receipts"
on public.payment_receipts
for select
using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "Company members can insert payment receipts" on public.payment_receipts;
create policy "Company members can insert payment receipts"
on public.payment_receipts
for insert
with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "Company members can delete payment receipts" on public.payment_receipts;
create policy "Company members can delete payment receipts"
on public.payment_receipts
for delete
using (company_id = public.get_user_company_id(auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can upload payment receipts'
  ) then
    create policy "Company members can upload payment receipts"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'payment-receipts'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can read payment receipts'
  ) then
    create policy "Company members can read payment receipts"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'payment-receipts'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can delete payment receipts'
  ) then
    create policy "Company members can delete payment receipts"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'payment-receipts'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;
end $$;
