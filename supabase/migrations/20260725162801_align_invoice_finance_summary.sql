-- Align invoice_finance_summary with the centralized financial balance rule.
--
-- This preserves the existing view contract:
-- same columns, same order and compatible numeric types.
--
-- Authoritative amounts now come from:
-- public.get_invoice_financial_balance(uuid)

create or replace view public.invoice_finance_summary as
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

  b.total_base::numeric(14,2)
    as total_base,

  i.date_issued,
  i.due_date,

  b.completed_payments::numeric(14,2)
    as paid_amount,

  b.completed_payments_base::numeric(14,2)
    as paid_amount_base,

  b.valid_credits::numeric(14,2)
    as credit_amount,

  b.valid_credits_base::numeric(14,2)
    as credit_amount_base,

  b.balance_due::numeric(14,2)
    as balance_due,

  b.balance_due_base::numeric(14,2)
    as balance_due_base,

  case
    when b.total_base <= 0
      then i.status::text

    when (
      b.completed_payments_base
      + b.valid_credits_base
    ) >= b.total_base
      then 'Paid'::text

    when (
      b.completed_payments_base
      + b.valid_credits_base
    ) > 0
      then 'Partial'::text

    when i.due_date < current_date
      and i.status not in (
        'Paid',
        'Cancelled'
      )
      then 'Overdue'::text

    else i.status::text
  end as finance_status

from public.invoices i

cross join lateral
  public.get_invoice_financial_balance(i.id) b;
