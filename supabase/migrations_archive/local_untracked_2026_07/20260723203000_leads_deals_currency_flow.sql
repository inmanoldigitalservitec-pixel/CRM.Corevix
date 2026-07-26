alter table public.leads
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists estimated_value_base numeric(14, 2);

alter table public.deals
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists value_base numeric(14, 2);

create or replace function public.leads_currency_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_currency text;
begin
  select * into v_settings
  from public.crm_finance_currency_snapshot(new.company_id)
  limit 1;

  v_currency := coalesce(nullif(upper(new.currency), ''), v_settings.base_currency, 'USD');
  new.currency := v_currency;
  new.base_currency := coalesce(nullif(upper(new.base_currency), ''), v_settings.base_currency, 'USD');
  new.exchange_rate := coalesce(nullif(new.exchange_rate, 0), case when v_currency = new.base_currency then 1 else v_settings.usd_to_dop_rate end);
  new.exchange_rate_source := coalesce(nullif(new.exchange_rate_source, ''), v_settings.rate_source);
  new.exchange_rate_updated_at := coalesce(new.exchange_rate_updated_at, v_settings.rate_updated_at);
  new.estimated_value_base := public.crm_convert_currency_amount(coalesce(new.estimated_value, 0), v_currency, new.base_currency, new.exchange_rate);

  return new;
end;
$$;

create or replace function public.deals_currency_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_currency text;
begin
  select * into v_settings
  from public.crm_finance_currency_snapshot(new.company_id)
  limit 1;

  v_currency := coalesce(nullif(upper(new.currency), ''), v_settings.base_currency, 'USD');
  new.currency := v_currency;
  new.base_currency := coalesce(nullif(upper(new.base_currency), ''), v_settings.base_currency, 'USD');
  new.exchange_rate := coalesce(nullif(new.exchange_rate, 0), case when v_currency = new.base_currency then 1 else v_settings.usd_to_dop_rate end);
  new.exchange_rate_source := coalesce(nullif(new.exchange_rate_source, ''), v_settings.rate_source);
  new.exchange_rate_updated_at := coalesce(new.exchange_rate_updated_at, v_settings.rate_updated_at);
  new.value_base := public.crm_convert_currency_amount(coalesce(new.value, 0), v_currency, new.base_currency, new.exchange_rate);

  return new;
end;
$$;

drop trigger if exists leads_currency_sync on public.leads;
create trigger leads_currency_sync
before insert or update on public.leads
for each row execute function public.leads_currency_sync_trigger();

drop trigger if exists deals_currency_sync on public.deals;
create trigger deals_currency_sync
before insert or update on public.deals
for each row execute function public.deals_currency_sync_trigger();

update public.leads
set updated_at = updated_at;

update public.deals
set updated_at = updated_at;
