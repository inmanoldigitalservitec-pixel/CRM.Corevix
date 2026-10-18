create unique index if not exists invoices_company_estimate_uidx
  on public.invoices (company_id, estimate_id)
  where estimate_id is not null;

create or replace function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns table(invoice_id uuid, created boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_estimate public.estimates%rowtype;
  v_existing_invoice_id uuid;
  v_new_invoice_id uuid;
  v_discount numeric(14,2);
  v_total numeric(14,2);
begin
  select p.*
    into v_profile
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'No active profile found';
  end if;

  select e.*
    into v_estimate
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = v_profile.company_id
  for update;

  if not found then
    raise exception 'Estimate not found';
  end if;

  select i.id
    into v_existing_invoice_id
  from public.invoices i
  where i.estimate_id = v_estimate.id
    and i.company_id = v_estimate.company_id
  limit 1;

  if v_existing_invoice_id is not null then
    invoice_id := v_existing_invoice_id;
    created := false;
    return next;
    return;
  end if;

  if v_estimate.discount_type = 'percent' then
    v_discount := round(
      coalesce(v_estimate.subtotal, 0)
      * coalesce(v_estimate.discount_value, 0) / 100,
      2
    );
  elsif v_estimate.discount_type = 'fixed' then
    v_discount := coalesce(v_estimate.discount_value, 0);
  elsif v_estimate.discount_type = 'none' then
    v_discount := 0;
  else
    raise exception 'Unsupported estimate discount type: %',
      v_estimate.discount_type;
  end if;

  if v_discount < 0 or v_discount > coalesce(v_estimate.subtotal, 0) then
    raise exception 'Estimate discount is outside the supported range';
  end if;

  v_total := round(
    coalesce(v_estimate.subtotal, 0)
    - v_discount
    + coalesce(v_estimate.tax, 0),
    2
  );

  if round(coalesce(v_estimate.total, 0), 2) is distinct from v_total then
    raise exception 'Estimate totals do not reconcile';
  end if;

  if exists (
    select 1
    from public.estimate_items ei
    where ei.estimate_id = v_estimate.id
      and ei.company_id = v_estimate.company_id
      and round(ei.amount - coalesce(ei.tax_amount, 0), 2)
          is distinct from round(ei.quantity * ei.rate, 2)
  ) then
    raise exception 'Estimate line amounts do not match quantity, rate, and tax';
  end if;

  insert into public.invoices (
    company_id, number, client_id, subtotal, tax, discount, total,
    currency, base_currency, exchange_rate, exchange_rate_source,
    exchange_rate_updated_at, subtotal_base, tax_base, discount_base,
    total_base, status, date_issued, due_date, notes, invoice_data,
    created_by, estimate_id
  ) values (
    v_estimate.company_id,
    'INV-EST-' || v_estimate.number::text,
    v_estimate.client_id,
    coalesce(v_estimate.subtotal, 0),
    coalesce(v_estimate.tax, 0),
    v_discount,
    v_total,
    v_estimate.currency,
    v_estimate.base_currency,
    v_estimate.exchange_rate,
    v_estimate.exchange_rate_source,
    v_estimate.exchange_rate_updated_at,
    v_estimate.subtotal_base,
    v_estimate.tax_base,
    0,
    v_estimate.total_base,
    'Draft',
    current_date,
    current_date + interval '30 days',
    v_estimate.notes,
    jsonb_strip_nulls(jsonb_build_object('currency', v_estimate.currency)),
    v_profile.id,
    v_estimate.id
  )
  returning id into v_new_invoice_id;

  insert into public.invoice_items (
    company_id, invoice_id, product_id, item_name, description,
    quantity, unit_type, unit_price, total, is_optional,
    tax_id, tax_name, tax_rate, tax_amount, sort_order,
    document_currency, original_currency, original_unit_price,
    converted_unit_price, exchange_rate, exchange_rate_source,
    exchange_rate_updated_at
  )
  select
    ei.company_id,
    v_new_invoice_id,
    ei.product_id,
    ei.item_name,
    coalesce(nullif(btrim(ei.description), ''), ei.item_name, ''),
    ei.quantity,
    ei.unit_type,
    ei.rate,
    round(ei.quantity * ei.rate, 2),
    ei.is_optional,
    ei.tax_id,
    ei.tax_name,
    ei.tax_rate,
    ei.tax_amount,
    ei.sort_order,
    ei.document_currency,
    ei.original_currency,
    ei.original_rate,
    ei.converted_rate,
    ei.exchange_rate,
    ei.exchange_rate_source,
    ei.exchange_rate_updated_at
  from public.estimate_items ei
  where ei.estimate_id = v_estimate.id
    and ei.company_id = v_estimate.company_id
  order by ei.sort_order, ei.id;

  update public.estimates
  set status = 'Converted'
  where id = v_estimate.id
    and company_id = v_estimate.company_id;

  invoice_id := v_new_invoice_id;
  created := true;
  return next;
end;
$function$;;
