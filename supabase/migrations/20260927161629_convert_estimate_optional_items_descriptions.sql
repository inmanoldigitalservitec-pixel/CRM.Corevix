create or replace function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns table(invoice_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.estimates%rowtype;
  current_profile public.profiles%rowtype;
  v_invoice_id uuid;
  v_discount numeric := 0;
  v_discount_base numeric;
  v_item record;
  v_unit_price numeric;
  v_line_total numeric;
  v_expected_amount numeric;
  v_total numeric;
begin
  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null or current_profile.company_id is null then
    raise exception 'No active profile found';
  end if;

  select * into e
  from public.estimates
  where id = p_estimate_id
    and company_id = current_profile.company_id
  for update;

  if not found then
    raise exception 'Estimate not found';
  end if;

  select i.id into v_invoice_id
  from public.invoices i
  where i.estimate_id = e.id
    and i.company_id = e.company_id
  limit 1;

  if v_invoice_id is not null then
    invoice_id := v_invoice_id;
    created := false;
    return next;
    return;
  end if;

  if coalesce(e.discount_type, 'none') = 'fixed' then
    v_discount := greatest(coalesce(e.discount_value, 0), 0);
  elsif coalesce(e.discount_type, 'none') = 'percent' then
    v_discount := round(
      greatest(coalesce(e.subtotal, 0), 0)
      * least(greatest(coalesce(e.discount_value, 0), 0), 100) / 100,
      2
    );
  end if;

  v_discount := least(v_discount, greatest(coalesce(e.subtotal, 0) + coalesce(e.tax, 0), 0));
  v_discount_base := case
    when e.exchange_rate is not null then round(v_discount * e.exchange_rate, 2)
    else null
  end;
  v_total := greatest(
    coalesce(e.subtotal, 0) + coalesce(e.tax, 0) + coalesce(e.adjustment, 0) - v_discount,
    0
  );

  insert into public.invoices (
    company_id, number, client_id, subtotal, tax, discount, total,
    currency, base_currency, exchange_rate, exchange_rate_source,
    exchange_rate_updated_at, subtotal_base, tax_base, discount_base,
    total_base, status, date_issued, due_date, notes, invoice_data,
    created_by, estimate_id
  ) values (
    e.company_id,
    'INV-EST-' || e.number::text,
    e.client_id,
    coalesce(e.subtotal, 0),
    coalesce(e.tax, 0),
    v_discount,
    v_total,
    e.currency,
    e.base_currency,
    e.exchange_rate,
    e.exchange_rate_source,
    e.exchange_rate_updated_at,
    e.subtotal_base,
    e.tax_base,
    v_discount_base,
    case when e.exchange_rate is not null then round(v_total * e.exchange_rate, 2) else e.total_base end,
    'Draft',
    current_date,
    current_date + 30,
    e.notes,
    jsonb_strip_nulls(jsonb_build_object(
      'currency', e.currency,
      'estimate_id', e.id,
      'adjustment', coalesce(e.adjustment, 0),
      'discount_type', coalesce(e.discount_type, 'none'),
      'discount_value', coalesce(e.discount_value, 0)
    )),
    current_profile.id,
    e.id
  ) returning id into v_invoice_id;

  for v_item in
    select ei.*
    from public.estimate_items ei
    where ei.company_id = e.company_id
      and ei.estimate_id = e.id
    order by ei.sort_order, ei.created_at, ei.id
  loop
    v_unit_price := coalesce(v_item.converted_rate, v_item.rate, 0);
    v_line_total := case
      when coalesce(v_item.is_optional, false) then 0
      else round(v_item.quantity * v_unit_price, 2)
    end;
    v_expected_amount := round(v_item.quantity * v_unit_price, 2);

    if not coalesce(v_item.is_optional, false)
      and abs(round(coalesce(v_item.amount, 0) - coalesce(v_item.tax_amount, 0), 2) - v_expected_amount) > 0.02
    then
      raise exception 'Estimate line amount does not match its quantity and rate (estimate item %).', v_item.id;
    end if;

    insert into public.invoice_items (
      company_id, invoice_id, product_id, item_name, description,
      quantity, unit_type, unit_price, total, is_optional, tax_id,
      tax_name, tax_rate, tax_amount, sort_order, document_currency,
      original_currency, original_unit_price, converted_unit_price,
      exchange_rate, exchange_rate_source, exchange_rate_updated_at
    ) values (
      e.company_id, v_invoice_id, v_item.product_id,
      coalesce(
        nullif(btrim(v_item.item_name), ''),
        nullif(btrim(v_item.description), ''),
        'Artículo'
      ),
      coalesce(
        nullif(btrim(v_item.description), ''),
        nullif(btrim(v_item.item_name), ''),
        'Artículo'
      ),
      v_item.quantity, v_item.unit_type, v_unit_price,
      v_line_total, coalesce(v_item.is_optional, false), v_item.tax_id,
      v_item.tax_name, v_item.tax_rate,
      case when coalesce(v_item.is_optional, false) then 0 else v_item.tax_amount end,
      v_item.sort_order, coalesce(v_item.document_currency, e.currency),
      coalesce(v_item.original_currency, v_item.document_currency, e.currency),
      coalesce(v_item.original_rate, v_item.rate), v_unit_price,
      v_item.exchange_rate, v_item.exchange_rate_source, v_item.exchange_rate_updated_at
    );
  end loop;

  update public.estimates
  set status = 'Converted'
  where id = e.id and company_id = e.company_id;

  invoice_id := v_invoice_id;
  created := true;
  return next;
end;
$$;

revoke all on function public.convert_estimate_to_invoice(uuid) from public;
grant execute on function public.convert_estimate_to_invoice(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';

-- Invoice item descriptions are required by the table, while estimate item
-- descriptions may be blank. Fill that gap at the persistence boundary so
-- estimate conversion can insert every line without changing its totals.
create or replace function public.ensure_invoice_item_description()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.description := coalesce(
    nullif(btrim(new.description), ''),
    nullif(btrim(new.item_name), ''),
    'Artículo'
  );
  return new;
end;
$$;

drop trigger if exists invoice_items_default_description on public.invoice_items;
create trigger invoice_items_default_description
before insert or update on public.invoice_items
for each row
execute function public.ensure_invoice_item_description();;
