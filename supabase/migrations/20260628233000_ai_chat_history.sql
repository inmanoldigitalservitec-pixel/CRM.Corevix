create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nuevo chat',
  preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_threads_company_user_updated
  on public.ai_chat_threads(company_id, user_id, updated_at desc);

create index if not exists idx_ai_chat_messages_thread_created
  on public.ai_chat_messages(thread_id, created_at asc);

alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "view own ai chat threads" on public.ai_chat_threads;
drop policy if exists "create own ai chat threads" on public.ai_chat_threads;
drop policy if exists "update own ai chat threads" on public.ai_chat_threads;
drop policy if exists "delete own ai chat threads" on public.ai_chat_threads;

create policy "view own ai chat threads"
on public.ai_chat_threads
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own ai chat threads"
on public.ai_chat_threads
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own ai chat threads"
on public.ai_chat_threads
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

create policy "delete own ai chat threads"
on public.ai_chat_threads
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

drop policy if exists "view own ai chat messages" on public.ai_chat_messages;
drop policy if exists "create own ai chat messages" on public.ai_chat_messages;
drop policy if exists "update own ai chat messages" on public.ai_chat_messages;
drop policy if exists "delete own ai chat messages" on public.ai_chat_messages;

create policy "view own ai chat messages"
on public.ai_chat_messages
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own ai chat messages"
on public.ai_chat_messages
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own ai chat messages"
on public.ai_chat_messages
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

create policy "delete own ai chat messages"
on public.ai_chat_messages
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);
