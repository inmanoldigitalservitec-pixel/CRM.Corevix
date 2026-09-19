alter table public.estimates
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists estimates_company_lead_idx
  on public.estimates(company_id, lead_id);