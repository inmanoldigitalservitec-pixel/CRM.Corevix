create or replace function public.get_invoice_financial_balance(p_invoice_id uuid)
returns table(
  invoice_id uuid,
  company_id uuid,
  currency text,
  base_currency text,
  exchange_rate numeric,
  total_amount numeric,
  total_base numeric,
  completed_payments numeric,
  completed_payments_base numeric,
  valid_credits numeric,
  valid_credits_base numeric,
  balance_due numeric,
  balance_due_base numeric
)
language sql
stable
security definer
set search_path = public
as $function$
  with invoice_row as (
    select
      i.id,
      i.company_id,
      upper(coalesce(i.currency, 'USD')) as currency,
      upper(coalesce(i.base_currency, i.currency, 'USD')) as base_currency,
      coalesce(nullif(i.exchange_rate, 0), 1) as exchange_rate,
      coalesce(i.total, 0) as total,
      coalesce(i.total_base, i.total, 0) as total_base
    from public.invoices i
    where i.id = p_invoice_id
  ),
  payment_totals as (
    select
      p.invoice_id,
      coalesce(
        sum(coalesce(p.amount_base, p.amount))
          filter (where p.status = 'Completed'),
        0
      ) as gross_payments_base
    from public.payments p
    where p.invoice_id = p_invoice_id
    group by p.invoice_id
  ),
  movement_totals as (
    select
      pm.invoice_id,
      coalesce(sum(coalesce(pm.amount_base, pm.amount)), 0) as movements_base
    from public.payment_movements pm
    where pm.invoice_id = p_invoice_id
    group by pm.invoice_id
  ),
  credit_totals as (
    select
      cn.invoice_id,
      coalesce(
        sum(coalesce(cn.amount_base, cn.amount))
          filter (where cn.status in ('Issued', 'Applied')),
        0
      ) as credits_base
    from public.credit_notes cn
    where cn.invoice_id = p_invoice_id
    group by cn.invoice_id
  ),
  calculated as (
    select
      i.*,
      greatest(
        coalesce(pt.gross_payments_base, 0)
          - coalesce(mt.movements_base, 0),
        0
      ) as completed_base,
      greatest(coalesce(ct.credits_base, 0), 0) as credits_base
    from invoice_row i
    left join payment_totals pt on pt.invoice_id = i.id
    left join movement_totals mt on mt.invoice_id = i.id
    left join credit_totals ct on ct.invoice_id = i.id
  )
  select
    c.id as invoice_id,
    c.company_id,
    c.currency,
    c.base_currency,
    c.exchange_rate,
    c.total as total_amount,
    c.total_base,
    public.crm_convert_currency_amount(
      c.completed_base,
      c.base_currency,
      c.currency,
      c.exchange_rate
    ) as completed_payments,
    c.completed_base as completed_payments_base,
    public.crm_convert_currency_amount(
      c.credits_base,
      c.base_currency,
      c.currency,
      c.exchange_rate
    ) as valid_credits,
    c.credits_base as valid_credits_base,
    public.crm_convert_currency_amount(
      greatest(c.total_base - c.completed_base - c.credits_base, 0),
      c.base_currency,
      c.currency,
      c.exchange_rate
    ) as balance_due,
    greatest(c.total_base - c.completed_base - c.credits_base, 0) as balance_due_base
  from calculated c;
$function$;

do $$
declare
  v_invoice_id uuid;
begin
  for v_invoice_id in
    select id from public.invoices
  loop
    perform public.refresh_invoice_finance_status(v_invoice_id);
  end loop;
end;
$$;
