alter table public.proposals
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists amount_base numeric(14, 2);

drop trigger if exists proposals_currency_sync on public.proposals;
create trigger proposals_currency_sync
before insert or update on public.proposals
for each row execute function public.sales_currency_sync_trigger();

update public.proposals
set updated_at = updated_at;
