create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  widgets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_layouts_company_user_unique unique (company_id, user_id),
  constraint dashboard_layouts_widgets_is_array check (jsonb_typeof(widgets) = 'array')
);

create index if not exists idx_dashboard_layouts_company_user
  on public.dashboard_layouts(company_id, user_id);

alter table public.dashboard_layouts enable row level security;

drop policy if exists "view own dashboard layouts" on public.dashboard_layouts;
drop policy if exists "create own dashboard layouts" on public.dashboard_layouts;
drop policy if exists "update own dashboard layouts" on public.dashboard_layouts;
drop policy if exists "delete own dashboard layouts" on public.dashboard_layouts;

create policy "view own dashboard layouts"
on public.dashboard_layouts
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own dashboard layouts"
on public.dashboard_layouts
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own dashboard layouts"
on public.dashboard_layouts
for update
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
)
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "delete own dashboard layouts"
on public.dashboard_layouts
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

drop trigger if exists update_dashboard_layouts_updated_at on public.dashboard_layouts;

create trigger update_dashboard_layouts_updated_at
before update on public.dashboard_layouts
for each row
execute function public.update_updated_at_column();
