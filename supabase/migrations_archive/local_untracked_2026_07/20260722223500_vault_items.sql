create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  category text not null default 'login',
  status text not null default 'active',
  sensitivity text not null default 'restricted',
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  url text,
  username text,
  email text,
  secret_value text,
  notes text,
  tags text[] not null default '{}',
  expires_at date,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_items_category_check check (
    category in (
      'login',
      'api_key',
      'server',
      'domain_dns',
      'bank_account',
      'document',
      'license',
      'recovery_code',
      'secure_note',
      'other'
    )
  ),
  constraint vault_items_status_check check (status in ('active', 'needs_review', 'expired', 'archived')),
  constraint vault_items_sensitivity_check check (sensitivity in ('internal', 'restricted', 'critical'))
);

create index if not exists vault_items_company_id_idx on public.vault_items(company_id);
create index if not exists vault_items_client_id_idx on public.vault_items(client_id);
create index if not exists vault_items_project_id_idx on public.vault_items(project_id);
create index if not exists vault_items_owner_id_idx on public.vault_items(owner_id);
create index if not exists vault_items_status_idx on public.vault_items(status);
create index if not exists vault_items_category_idx on public.vault_items(category);
create index if not exists vault_items_expires_at_idx on public.vault_items(expires_at);

drop trigger if exists update_vault_items_updated_at on public.vault_items;
create trigger update_vault_items_updated_at
before update on public.vault_items
for each row execute function public.update_updated_at_column();

alter table public.vault_items enable row level security;

drop policy if exists "Vault managers can view vault items" on public.vault_items;
create policy "Vault managers can view vault items"
on public.vault_items
for select
using (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);

drop policy if exists "Vault managers can create vault items" on public.vault_items;
create policy "Vault managers can create vault items"
on public.vault_items
for insert
with check (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);

drop policy if exists "Vault managers can update vault items" on public.vault_items;
create policy "Vault managers can update vault items"
on public.vault_items
for update
using (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
)
with check (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);

drop policy if exists "Vault managers can delete vault items" on public.vault_items;
create policy "Vault managers can delete vault items"
on public.vault_items
for delete
using (
  company_id = public.get_user_company_id(auth.uid())
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);
