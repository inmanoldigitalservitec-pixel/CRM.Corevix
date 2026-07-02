-- Corevix CRM — Contracts advanced fields
-- Documents, invoice relation, and safer signed/reporting fields.

alter table public.contracts
  add column if not exists invoice_id uuid,
  add column if not exists signature_status text not null default 'Not Signed' check (signature_status in ('Not Signed', 'Pending Signature', 'Signed', 'Declined'));

update public.contracts
set signature_status = 'Signed'
where signed_at is not null
  and signature_status <> 'Signed';

create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contract_documents_company_id_idx on public.contract_documents(company_id);
create index if not exists contract_documents_contract_id_idx on public.contract_documents(contract_id);
create index if not exists contract_documents_created_at_idx on public.contract_documents(created_at desc);
create index if not exists contracts_invoice_id_idx on public.contracts(invoice_id);
create index if not exists contracts_signature_status_idx on public.contracts(signature_status);

alter table public.contract_documents enable row level security;

drop policy if exists "Company members can view contract documents" on public.contract_documents;
create policy "Company members can view contract documents"
on public.contract_documents
for select
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = contract_documents.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can create contract documents" on public.contract_documents;
create policy "Company members can create contract documents"
on public.contract_documents
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = contract_documents.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can update contract documents" on public.contract_documents;
create policy "Company members can update contract documents"
on public.contract_documents
for update
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = contract_documents.company_id
      and coalesce(p.is_active, true) = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = contract_documents.company_id
      and coalesce(p.is_active, true) = true
  )
);

drop policy if exists "Company members can delete contract documents" on public.contract_documents;
create policy "Company members can delete contract documents"
on public.contract_documents
for delete
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = contract_documents.company_id
      and coalesce(p.is_active, true) = true
  )
);
