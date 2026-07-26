create table if not exists public.attention_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  state text not null default 'new',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  acknowledged_at timestamptz,
  ignored_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz,
  auto_resolved_at timestamptz,
  last_title text,
  last_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attention_memory_company_user_key_unique unique (company_id, user_id, key),
  constraint attention_memory_state_check check (
    state in ('new', 'acknowledged', 'snoozed', 'resolved', 'auto_resolved')
  )
);

create index if not exists idx_attention_memory_company_user_state
  on public.attention_memory(company_id, user_id, state);

create index if not exists idx_attention_memory_company_user_last_seen
  on public.attention_memory(company_id, user_id, last_seen_at desc);

alter table public.attention_memory enable row level security;

drop policy if exists "view own attention memory" on public.attention_memory;
drop policy if exists "create own attention memory" on public.attention_memory;
drop policy if exists "update own attention memory" on public.attention_memory;
drop policy if exists "delete own attention memory" on public.attention_memory;

create policy "view own attention memory"
on public.attention_memory
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own attention memory"
on public.attention_memory
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own attention memory"
on public.attention_memory
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

create policy "delete own attention memory"
on public.attention_memory
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

drop trigger if exists update_attention_memory_updated_at on public.attention_memory;

create trigger update_attention_memory_updated_at
before update on public.attention_memory
for each row
execute function public.update_updated_at_column();
