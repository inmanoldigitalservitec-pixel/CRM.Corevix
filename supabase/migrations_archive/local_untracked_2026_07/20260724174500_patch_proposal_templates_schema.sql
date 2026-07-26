alter table public.proposal_templates
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists description text,
  add column if not exists content_html text not null default '',
  add column if not exists content_json jsonb not null default '{}'::jsonb,
  add column if not exists is_default boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists proposal_templates_company_active_idx
  on public.proposal_templates(company_id, is_active, updated_at desc);

create or replace function public.set_proposal_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_proposal_template_updated_at on public.proposal_templates;
create trigger set_proposal_template_updated_at
before update on public.proposal_templates
for each row execute function public.set_proposal_workspace_updated_at();

alter table public.proposal_templates enable row level security;

drop policy if exists proposal_templates_company_select on public.proposal_templates;
create policy proposal_templates_company_select
on public.proposal_templates
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_insert on public.proposal_templates;
create policy proposal_templates_company_insert
on public.proposal_templates
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_update on public.proposal_templates;
create policy proposal_templates_company_update
on public.proposal_templates
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

notify pgrst, 'reload schema';
