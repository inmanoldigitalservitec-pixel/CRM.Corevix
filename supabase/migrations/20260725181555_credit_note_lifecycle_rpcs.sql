-- ============================================================
-- Credit-note lifecycle
--
-- save_credit_note:    create/update Draft
-- issue_credit_note:   Draft -> Issued
-- apply_credit_note:   Issued -> Applied
-- cancel_credit_note:  Draft/Issued -> Cancelled
-- ============================================================

create or replace function public.save_credit_note(
  p_credit_note_id uuid default null,
  p_invoice_id uuid default null,
  p_client_id uuid default null,
  p_amount numeric default 0,
  p_date_issued date default current_date,
  p_reason text default null,
  p_notes text default null
)
returns table (
  credit_note_id uuid,
  credit_note_number bigint,
  status text,
  amount numeric,
  invoice_id uuid,
  client_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_existing public.credit_notes%rowtype;
  v_invoice public.invoices%rowtype;
  v_client_id uuid;
  v_currency text;
  v_base_currency text;
  v_exchange_rate numeric;
  v_exchange_rate_source text;
  v_exchange_rate_updated_at timestamptz;
  v_amount_base numeric;
begin
  perform public.require_permission('credit_notes.issue');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception
      'El monto debe ser mayor que cero.'
      using errcode = '22023';
  end if;

  if p_credit_note_id is not null then
    select *
    into v_existing
    from public.credit_notes
    where id = p_credit_note_id
      and company_id = v_profile.company_id
    for update;

    if not found then
      raise exception
        'Nota de crédito no encontrada o acceso denegado.';
    end if;

    if v_existing.status <> 'Draft' then
      raise exception
        'Solo pueden editarse notas de crédito en estado Draft.'
        using errcode = '55000';
    end if;
  end if;

  if p_invoice_id is not null then
    select *
    into v_invoice
    from public.invoices
    where id = p_invoice_id
      and company_id = v_profile.company_id;

    if not found then
      raise exception
        'Factura no encontrada o acceso denegado.';
    end if;

    if v_invoice.status = 'Cancelled' then
      raise exception
        'No puede crearse una nota para una factura cancelada.'
        using errcode = '55000';
    end if;

    v_client_id := v_invoice.client_id;

    if p_client_id is not null
       and p_client_id is distinct from v_invoice.client_id then
      raise exception
        'El cliente de la nota no coincide con el cliente de la factura.'
        using errcode = '22023';
    end if;

    v_currency := v_invoice.currency;
    v_base_currency := v_invoice.base_currency;
    v_exchange_rate := v_invoice.exchange_rate;
    v_exchange_rate_source := v_invoice.exchange_rate_source;
    v_exchange_rate_updated_at := v_invoice.exchange_rate_updated_at;

    if p_amount > coalesce(v_invoice.total, 0) then
      raise exception
        'El monto de la nota no puede superar el total de la factura.'
        using errcode = '22023';
    end if;
  else
    v_client_id := p_client_id;

    if v_client_id is null then
      raise exception
        'Debe seleccionar un cliente o una factura.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.clients c
      where c.id = v_client_id
        and c.company_id = v_profile.company_id
    ) then
      raise exception
        'Cliente no encontrado o acceso denegado.';
    end if;

    select
      ccs.base_currency,
      ccs.base_currency,
      1,
      'Base currency',
      now()
    into
      v_currency,
      v_base_currency,
      v_exchange_rate,
      v_exchange_rate_source,
      v_exchange_rate_updated_at
    from public.company_currency_settings ccs
    where ccs.company_id = v_profile.company_id
    limit 1;
  end if;

  v_currency := coalesce(v_currency, v_base_currency, 'USD');
  v_base_currency := coalesce(v_base_currency, v_currency);
  v_exchange_rate := coalesce(v_exchange_rate, 1);

  v_amount_base := public.crm_convert_currency_amount(
    p_amount,
    v_currency,
    v_base_currency,
    v_exchange_rate
  );

  if p_credit_note_id is null then
    insert into public.credit_notes (
      company_id,
      invoice_id,
      client_id,
      amount,
      status,
      date_issued,
      reason,
      notes,
      created_by,
      currency,
      base_currency,
      exchange_rate,
      exchange_rate_source,
      exchange_rate_updated_at,
      amount_base
    )
    values (
      v_profile.company_id,
      p_invoice_id,
      v_client_id,
      p_amount,
      'Draft',
      coalesce(p_date_issued, current_date),
      nullif(btrim(p_reason), ''),
      nullif(btrim(p_notes), ''),
      v_profile.id,
      v_currency,
      v_base_currency,
      v_exchange_rate,
      v_exchange_rate_source,
      v_exchange_rate_updated_at,
      v_amount_base
    )
    returning *
    into v_existing;
  else
    update public.credit_notes
    set
      invoice_id = p_invoice_id,
      client_id = v_client_id,
      amount = p_amount,
      date_issued = coalesce(p_date_issued, current_date),
      reason = nullif(btrim(p_reason), ''),
      notes = nullif(btrim(p_notes), ''),
      currency = v_currency,
      base_currency = v_base_currency,
      exchange_rate = v_exchange_rate,
      exchange_rate_source = v_exchange_rate_source,
      exchange_rate_updated_at = v_exchange_rate_updated_at,
      amount_base = v_amount_base,
      updated_at = now()
    where id = v_existing.id
      and company_id = v_profile.company_id
    returning *
    into v_existing;
  end if;

  credit_note_id := v_existing.id;
  credit_note_number := v_existing.credit_note_number;
  status := v_existing.status;
  amount := v_existing.amount;
  invoice_id := v_existing.invoice_id;
  client_id := v_existing.client_id;

  return next;
end;
$$;

revoke all
on function public.save_credit_note(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text,
  text
)
from public, anon;

grant execute
on function public.save_credit_note(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text,
  text
)
to authenticated, service_role;


create or replace function public.issue_credit_note(
  p_credit_note_id uuid
)
returns table (
  credit_note_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_note public.credit_notes%rowtype;
  v_invoice public.invoices%rowtype;
  v_existing_credit numeric;
begin
  perform public.require_permission('credit_notes.issue');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  select *
  into v_note
  from public.credit_notes
  where id = p_credit_note_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'Nota de crédito no encontrada o acceso denegado.';
  end if;

  if v_note.status <> 'Draft' then
    raise exception
      'Solo puede emitirse una nota en estado Draft.'
      using errcode = '55000';
  end if;

  if v_note.invoice_id is not null then
    select *
    into v_invoice
    from public.invoices
    where id = v_note.invoice_id
      and company_id = v_profile.company_id
    for update;

    if not found then
      raise exception
        'Factura no encontrada o acceso denegado.';
    end if;

    if v_invoice.status in ('Draft', 'Cancelled') then
      raise exception
        'La factura debe estar emitida y no cancelada.'
        using errcode = '55000';
    end if;

    select coalesce(sum(cn.amount), 0)
    into v_existing_credit
    from public.credit_notes cn
    where cn.invoice_id = v_invoice.id
      and cn.company_id = v_profile.company_id
      and cn.id <> v_note.id
      and cn.status in ('Issued', 'Applied');

    if v_existing_credit + v_note.amount
       > coalesce(v_invoice.total, 0) then
      raise exception
        'El crédito acumulado supera el total de la factura.'
        using errcode = '22023';
    end if;
  end if;

  update public.credit_notes
  set
    status = 'Issued',
    updated_at = now()
  where id = v_note.id;

  credit_note_id := v_note.id;
  status := 'Issued';

  return next;
end;
$$;

revoke all
on function public.issue_credit_note(uuid)
from public, anon;

grant execute
on function public.issue_credit_note(uuid)
to authenticated, service_role;


create or replace function public.apply_credit_note(
  p_credit_note_id uuid
)
returns table (
  credit_note_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_note public.credit_notes%rowtype;
begin
  perform public.require_permission('credit_notes.apply');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  select *
  into v_note
  from public.credit_notes
  where id = p_credit_note_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'Nota de crédito no encontrada o acceso denegado.';
  end if;

  if v_note.status <> 'Issued' then
    raise exception
      'Solo puede aplicarse una nota en estado Issued.'
      using errcode = '55000';
  end if;

  update public.credit_notes
  set
    status = 'Applied',
    updated_at = now()
  where id = v_note.id;

  credit_note_id := v_note.id;
  status := 'Applied';

  return next;
end;
$$;

revoke all
on function public.apply_credit_note(uuid)
from public, anon;

grant execute
on function public.apply_credit_note(uuid)
to authenticated, service_role;


create or replace function public.cancel_credit_note(
  p_credit_note_id uuid,
  p_reason text default null
)
returns table (
  credit_note_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_note public.credit_notes%rowtype;
begin
  perform public.require_permission('credit_notes.issue');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  select *
  into v_note
  from public.credit_notes
  where id = p_credit_note_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'Nota de crédito no encontrada o acceso denegado.';
  end if;

  if v_note.status not in ('Draft', 'Issued') then
    raise exception
      'Solo pueden cancelarse notas Draft o Issued.'
      using errcode = '55000';
  end if;

  update public.credit_notes
  set
    status = 'Cancelled',
    notes = case
      when nullif(btrim(p_reason), '') is null
        then notes
      when nullif(btrim(notes), '') is null
        then 'Cancelación: ' || btrim(p_reason)
      else notes || E'\nCancelación: ' || btrim(p_reason)
    end,
    updated_at = now()
  where id = v_note.id;

  credit_note_id := v_note.id;
  status := 'Cancelled';

  return next;
end;
$$;

revoke all
on function public.cancel_credit_note(uuid, text)
from public, anon;

grant execute
on function public.cancel_credit_note(uuid, text)
to authenticated, service_role;
