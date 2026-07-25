-- ============================================================
-- Bloquear cambios financieros en facturas emitidas
-- ============================================================

create or replace function public.protect_issued_invoice_financial_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Draft es el único estado editable financieramente.
  if old.status::text <> 'Draft'
    and (
      new.company_id is distinct from old.company_id
      or new.number is distinct from old.number
      or new.client_id is distinct from old.client_id
      or new.proposal_id is distinct from old.proposal_id
      or new.product_id is distinct from old.product_id
      or new.estimate_id is distinct from old.estimate_id
      or new.date_issued is distinct from old.date_issued
      or new.due_date is distinct from old.due_date
      or new.subtotal is distinct from old.subtotal
      or new.tax is distinct from old.tax
      or new.discount is distinct from old.discount
      or new.total is distinct from old.total
      or new.invoice_data is distinct from old.invoice_data
      or new.currency is distinct from old.currency
      or new.base_currency is distinct from old.base_currency
      or new.exchange_rate is distinct from old.exchange_rate
      or new.exchange_rate_source
           is distinct from old.exchange_rate_source
      or new.exchange_rate_updated_at
           is distinct from old.exchange_rate_updated_at
      or new.subtotal_base is distinct from old.subtotal_base
      or new.tax_base is distinct from old.tax_base
      or new.discount_base is distinct from old.discount_base
      or new.total_base is distinct from old.total_base
    )
  then
    raise exception
      'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists aaa_invoices_protect_issued_financial_fields
  on public.invoices;

create trigger aaa_invoices_protect_issued_financial_fields
before update on public.invoices
for each row
execute function public.protect_issued_invoice_financial_fields();


-- ============================================================
-- Bloquear cambios en líneas de facturas no Draft
-- ============================================================

create or replace function public.protect_issued_invoice_items()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_status text;
  v_new_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select i.status::text
    into v_old_status
    from public.invoices i
    where i.id = old.invoice_id;

    if v_old_status is null then
      raise exception
        'No se encontró la factura asociada a la línea.'
        using errcode = '23503';
    end if;

    if v_old_status <> 'Draft' then
      raise exception
        'Las líneas de una factura emitida no pueden modificarse ni eliminarse.'
        using errcode = '55000';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select i.status::text
    into v_new_status
    from public.invoices i
    where i.id = new.invoice_id;

    if v_new_status is null then
      raise exception
        'No se encontró la factura asociada a la línea.'
        using errcode = '23503';
    end if;

    if v_new_status <> 'Draft' then
      raise exception
        'No pueden agregarse líneas a una factura emitida.'
        using errcode = '55000';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists invoice_items_protect_issued_documents
  on public.invoice_items;

create trigger invoice_items_protect_issued_documents
before insert or update or delete on public.invoice_items
for each row
execute function public.protect_issued_invoice_items();


revoke all
on function public.protect_issued_invoice_financial_fields()
from public, anon, authenticated;

revoke all
on function public.protect_issued_invoice_items()
from public, anon, authenticated;

comment on function public.protect_issued_invoice_financial_fields()
is 'Impide modificar campos financieros cuando una factura ya no está en Draft.';

comment on function public.protect_issued_invoice_items()
is 'Impide insertar, modificar o eliminar líneas de facturas que ya no están en Draft.';
