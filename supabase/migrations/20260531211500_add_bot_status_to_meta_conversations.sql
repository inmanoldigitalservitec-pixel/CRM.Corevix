alter table public.meta_conversations
add column if not exists bot_status text not null default 'active';

alter table public.meta_conversations
add constraint meta_conversations_bot_status_check
check (bot_status in ('active', 'paused'));

create index if not exists idx_meta_conversations_bot_status
on public.meta_conversations(company_id, platform, bot_status);
