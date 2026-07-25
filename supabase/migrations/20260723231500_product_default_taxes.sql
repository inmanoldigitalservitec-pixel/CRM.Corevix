alter table public.products
  add column if not exists default_tax_id uuid references public.company_taxes(id) on delete set null,
  add column if not exists default_tax_name text,
  add column if not exists default_tax_rate numeric(7,4) default 0;

create index if not exists idx_products_default_tax_id
  on public.products(default_tax_id)
  where default_tax_id is not null;

update public.products p
set
  default_tax_name = t.name,
  default_tax_rate = t.rate
from public.company_taxes t
where p.default_tax_id = t.id
  and (
    p.default_tax_name is null
    or p.default_tax_rate is null
  );
