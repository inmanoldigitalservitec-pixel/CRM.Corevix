alter table public.estimates
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists subtotal_base numeric(14, 2),
  add column if not exists tax_base numeric(14, 2),
  add column if not exists total_base numeric(14, 2);

alter table public.invoices
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists subtotal_base numeric(14, 2),
  add column if not exists tax_base numeric(14, 2),
  add column if not exists discount_base numeric(14, 2),
  add column if not exists total_base numeric(14, 2);

alter table public.payments
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists amount_base numeric(14, 2);

alter table public.credit_notes
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists amount_base numeric(14, 2);

alter table public.expenses
  add column if not exists currency text,
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(14, 6),
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists amount_base numeric(14, 2);

create or replace function public.crm_convert_currency_amount(
  p_amount numeric,
  p_from_currency text,
  p_to_currency text,
  p_usd_to_dop_rate numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    case
      when upper(coalesce(p_from_currency, 'USD')) = upper(coalesce(p_to_currency, 'USD')) then coalesce(p_amount, 0)
      when upper(coalesce(p_from_currency, 'USD')) = 'USD' and upper(coalesce(p_to_currency, 'USD')) = 'DOP' then coalesce(p_amount, 0) * coalesce(nullif(p_usd_to_dop_rate, 0), 1)
      when upper(coalesce(p_from_currency, 'USD')) = 'DOP' and upper(coalesce(p_to_currency, 'USD')) = 'USD' then coalesce(p_amount, 0) / coalesce(nullif(p_usd_to_dop_rate, 0), 1)
      else coalesce(p_amount, 0)
    end,
    case when upper(coalesce(p_to_currency, 'USD')) = 'DOP' then 0 else 2 end
  );
$$;

create or replace function public.crm_finance_currency_snapshot(p_company_id uuid)
returns table(
  base_currency text,
  usd_to_dop_rate numeric,
  rate_source text,
  rate_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(upper(ccs.base_currency), ''), 'USD') as base_currency,
    coalesce(nullif(ccs.usd_to_dop_rate, 0), 60)::numeric as usd_to_dop_rate,
    coalesce(nullif(ccs.rate_source, ''), 'manual') as rate_source,
    ccs.rate_updated_at
  from public.company_currency_settings ccs
  where ccs.company_id = p_company_id
  union all
  select 'USD', 60::numeric, 'manual', null::timestamptz
  where not exists (
    select 1
    from public.company_currency_settings ccs
    where ccs.company_id = p_company_id
  )
  limit 1;
$$;

create or replace function public.invoice_finance_currency_sync_trigger()
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

  v_currency := coalesce(nullif(upper(new.currency), ''), nullif(upper(new.invoice_data->>'currency'), ''), v_settings.base_currency, 'USD');

  new.currency := v_currency;
  new.base_currency := coalesce(nullif(upper(new.base_currency), ''), v_settings.base_currency, 'USD');
  new.exchange_rate := coalesce(nullif(new.exchange_rate, 0), case when v_currency = new.base_currency then 1 else v_settings.usd_to_dop_rate end);
  new.exchange_rate_source := coalesce(nullif(new.exchange_rate_source, ''), v_settings.rate_source);
  new.exchange_rate_updated_at := coalesce(new.exchange_rate_updated_at, v_settings.rate_updated_at);
  new.subtotal_base := public.crm_convert_currency_amount(coalesce(new.subtotal, 0), v_currency, new.base_currency, new.exchange_rate);
  new.tax_base := public.crm_convert_currency_amount(coalesce(new.tax, 0), v_currency, new.base_currency, new.exchange_rate);
  new.discount_base := public.crm_convert_currency_amount(coalesce(new.discount, 0), v_currency, new.base_currency, new.exchange_rate);
  new.total_base := public.crm_convert_currency_amount(coalesce(new.total, 0), v_currency, new.base_currency, new.exchange_rate);
  new.invoice_data := coalesce(new.invoice_data, '{}'::jsonb) || jsonb_build_object('currency', v_currency);

  return new;
end;
$$;

drop trigger if exists invoices_finance_currency_sync on public.invoices;
create trigger invoices_finance_currency_sync
before insert or update on public.invoices
for each row execute function public.invoice_finance_currency_sync_trigger();

create or replace function public.sales_currency_sync_trigger()
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

  if tg_table_name = 'estimates' then
    new.subtotal_base := public.crm_convert_currency_amount(coalesce(new.subtotal, 0), v_currency, new.base_currency, new.exchange_rate);
    new.tax_base := public.crm_convert_currency_amount(coalesce(new.tax, 0), v_currency, new.base_currency, new.exchange_rate);
    new.total_base := public.crm_convert_currency_amount(coalesce(new.total, 0), v_currency, new.base_currency, new.exchange_rate);
  else
    new.amount_base := public.crm_convert_currency_amount(coalesce(new.amount, 0), v_currency, new.base_currency, new.exchange_rate);
  end if;

  return new;
end;
$$;

drop trigger if exists estimates_currency_sync on public.estimates;
create trigger estimates_currency_sync
before insert or update on public.estimates
for each row execute function public.sales_currency_sync_trigger();

drop trigger if exists payments_currency_sync on public.payments;
create trigger payments_currency_sync
before insert or update on public.payments
for each row execute function public.sales_currency_sync_trigger();

drop trigger if exists credit_notes_currency_sync on public.credit_notes;
create trigger credit_notes_currency_sync
before insert or update on public.credit_notes
for each row execute function public.sales_currency_sync_trigger();

drop trigger if exists expenses_currency_sync on public.expenses;
create trigger expenses_currency_sync
before insert or update on public.expenses
for each row execute function public.sales_currency_sync_trigger();

update public.estimates set updated_at = updated_at;
update public.invoices set updated_at = updated_at;
update public.payments set updated_at = updated_at;
update public.credit_notes set updated_at = updated_at;
update public.expenses set updated_at = updated_at;

drop view if exists public.invoice_finance_summary;
create view public.invoice_finance_summary as
select
  i.id as invoice_id,
  i.company_id,
  i.client_id,
  i.number,
  i.status,
  i.currency,
  i.base_currency,
  i.exchange_rate,
  i.exchange_rate_source,
  i.exchange_rate_updated_at,
  i.total,
  coalesce(i.total_base, i.total, 0)::numeric(14,2) as total_base,
  i.date_issued,
  i.due_date,
  coalesce(p.paid_amount, 0)::numeric(14,2) as paid_amount,
  coalesce(p.paid_amount_base, p.paid_amount, 0)::numeric(14,2) as paid_amount_base,
  coalesce(c.credit_amount, 0)::numeric(14,2) as credit_amount,
  coalesce(c.credit_amount_base, c.credit_amount, 0)::numeric(14,2) as credit_amount_base,
  greatest(coalesce(i.total, 0) - coalesce(p.paid_amount, 0) - coalesce(c.credit_amount, 0), 0)::numeric(14,2) as balance_due,
  greatest(coalesce(i.total_base, i.total, 0) - coalesce(p.paid_amount_base, p.paid_amount, 0) - coalesce(c.credit_amount_base, c.credit_amount, 0), 0)::numeric(14,2) as balance_due_base,
  case
    when coalesce(i.total_base, i.total, 0) <= 0 then i.status
    when coalesce(p.paid_amount_base, p.paid_amount, 0) + coalesce(c.credit_amount_base, c.credit_amount, 0) >= coalesce(i.total_base, i.total, 0) then 'Paid'
    when coalesce(p.paid_amount_base, p.paid_amount, 0) + coalesce(c.credit_amount_base, c.credit_amount, 0) > 0 then 'Partial'
    when i.due_date < current_date and i.status not in ('Paid','Cancelled') then 'Overdue'
    else i.status
  end as finance_status
from public.invoices i
left join (
  select invoice_id, company_id, sum(amount) as paid_amount, sum(coalesce(amount_base, amount)) as paid_amount_base
  from public.payments
  where invoice_id is not null and status = 'Completed'
  group by invoice_id, company_id
) p on p.invoice_id = i.id and p.company_id = i.company_id
left join (
  select invoice_id, company_id, sum(amount) as credit_amount, sum(coalesce(amount_base, amount)) as credit_amount_base
  from public.credit_notes
  where invoice_id is not null and status in ('Issued','Applied')
  group by invoice_id, company_id
) c on c.invoice_id = i.id and c.company_id = i.company_id;

drop function if exists public.convert_estimate_to_invoice(uuid);

create or replace function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns table(invoice_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  existing_id uuid;
  new_id uuid;
  current_profile public.profiles%rowtype;
begin
  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null then
    raise exception 'No active profile found';
  end if;

  select * into e
  from public.estimates
  where id = p_estimate_id
    and company_id = current_profile.company_id;

  if e.id is null then
    raise exception 'Estimate not found';
  end if;

  select id into existing_id
  from public.invoices
  where estimate_id = e.id
    and company_id = e.company_id
  limit 1;

  if existing_id is not null then
    invoice_id := existing_id;
    created := false;
    return next;
    return;
  end if;

  insert into public.invoices (
    company_id,
    number,
    client_id,
    subtotal,
    tax,
    discount,
    total,
    currency,
    base_currency,
    exchange_rate,
    exchange_rate_source,
    exchange_rate_updated_at,
    subtotal_base,
    tax_base,
    discount_base,
    total_base,
    status,
    date_issued,
    due_date,
    notes,
    invoice_data,
    created_by,
    estimate_id
  ) values (
    e.company_id,
    'INV-EST-' || e.number::text,
    e.client_id,
    coalesce(e.subtotal, 0),
    coalesce(e.tax, 0),
    0,
    coalesce(e.total, 0),
    e.currency,
    e.base_currency,
    e.exchange_rate,
    e.exchange_rate_source,
    e.exchange_rate_updated_at,
    e.subtotal_base,
    e.tax_base,
    0,
    e.total_base,
    'Draft',
    current_date,
    current_date + interval '30 days',
    e.notes,
    jsonb_strip_nulls(jsonb_build_object('currency', e.currency)),
    current_profile.user_id,
    e.id
  ) returning id into new_id;

  update public.estimates
  set status = 'Converted'
  where id = e.id;

  invoice_id := new_id;
  created := true;
  return next;
end;
$$;

drop function if exists public.register_invoice_payment(uuid, numeric, date, text, text, text, text, uuid);

create or replace function public.register_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_method text default 'Manual',
  p_status text default 'Completed',
  p_reference text default null,
  p_notes text default null,
  p_client_id uuid default null
)
returns table(
  payment_id uuid,
  invoice_id uuid,
  invoice_status text,
  remaining_balance numeric,
  became_paid boolean,
  project_id uuid,
  project_created boolean,
  project_error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;
  v_previous_status text;
  v_payment_id uuid;
  v_completed_amount numeric := 0;
  v_remaining_balance numeric := 0;
  v_became_paid boolean := false;
  v_project_id uuid;
  v_project_created boolean := false;
  v_project_error text;
begin
  select *
  into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null or current_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_invoice_id is null then
    raise exception 'No se pudo confirmar el ID de la factura.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id
  for update;

  if not found then
    raise exception 'No se encontró la factura dentro de la compañía actual.';
  end if;

  if v_invoice.status in ('Cancelled', 'Canceled') then
    raise exception 'Esta factura está cancelada.';
  end if;

  v_previous_status := v_invoice.status;

  select coalesce(sum(coalesce(p.amount_base, p.amount)), 0)
  into v_completed_amount
  from public.payments p
  where p.company_id = current_profile.company_id
    and p.invoice_id = p_invoice_id
    and p.status = 'Completed';

  v_remaining_balance := greatest(coalesce(v_invoice.total_base, v_invoice.total, 0) - v_completed_amount, 0);

  if public.crm_convert_currency_amount(p_amount, v_invoice.currency, v_invoice.base_currency, v_invoice.exchange_rate) > v_remaining_balance then
    raise exception 'El pago supera el saldo pendiente.';
  end if;

  if p_status = 'Completed' and v_remaining_balance <= 0 then
    raise exception 'Esta factura ya está pagada.';
  end if;

  insert into public.payments (
    company_id,
    invoice_id,
    client_id,
    amount,
    currency,
    base_currency,
    exchange_rate,
    exchange_rate_source,
    exchange_rate_updated_at,
    amount_base,
    payment_date,
    method,
    status,
    reference,
    notes,
    created_by
  )
  values (
    current_profile.company_id,
    p_invoice_id,
    coalesce(p_client_id, v_invoice.client_id),
    p_amount,
    v_invoice.currency,
    v_invoice.base_currency,
    v_invoice.exchange_rate,
    v_invoice.exchange_rate_source,
    v_invoice.exchange_rate_updated_at,
    public.crm_convert_currency_amount(p_amount, v_invoice.currency, v_invoice.base_currency, v_invoice.exchange_rate),
    coalesce(p_payment_date, current_date),
    coalesce(nullif(trim(p_method), ''), 'Manual'),
    coalesce(nullif(trim(p_status), ''), 'Completed'),
    nullif(trim(p_reference), ''),
    nullif(trim(p_notes), ''),
    current_profile.id
  )
  returning id into v_payment_id;

  perform public.refresh_invoice_finance_status(p_invoice_id);

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id;

  select greatest(
    coalesce(v_invoice.total_base, v_invoice.total, 0) - coalesce(sum(coalesce(p.amount_base, p.amount)) filter (where p.status = 'Completed'), 0),
    0
  )
  into v_remaining_balance
  from public.payments p
  where p.company_id = current_profile.company_id
    and p.invoice_id = p_invoice_id;

  v_became_paid := v_previous_status is distinct from 'Paid' and v_invoice.status = 'Paid';

  if v_became_paid then
    begin
      select created_project.project_id, created_project.created
      into v_project_id, v_project_created
      from public.create_project_from_paid_invoice(p_invoice_id) as created_project
      limit 1;
    exception
      when others then
        v_project_error := SQLERRM;
    end;
  end if;

  payment_id := v_payment_id;
  invoice_id := p_invoice_id;
  invoice_status := v_invoice.status;
  remaining_balance := public.crm_convert_currency_amount(
    coalesce(v_remaining_balance, 0),
    v_invoice.base_currency,
    v_invoice.currency,
    v_invoice.exchange_rate
  );
  became_paid := v_became_paid;
  project_id := v_project_id;
  project_created := coalesce(v_project_created, false);
  project_error := v_project_error;

  return next;
end;
$$;

revoke all on function public.crm_finance_currency_snapshot(uuid) from public;
grant execute on function public.crm_finance_currency_snapshot(uuid) to authenticated, service_role;

revoke all on function public.register_invoice_payment(uuid, numeric, date, text, text, text, text, uuid) from public;
grant execute on function public.register_invoice_payment(uuid, numeric, date, text, text, text, text, uuid) to authenticated, service_role;

grant execute on function public.convert_estimate_to_invoice(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
