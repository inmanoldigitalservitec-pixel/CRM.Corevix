-- Central financial balance calculation for one invoice.
--
-- Authoritative rule:
-- invoice total
-- - completed payments
-- - valid issued/applied credit notes
-- = available invoice balance
--
-- Calculations are provided both in the invoice currency and base currency.

create or replace function public.get_invoice_financial_balance(
  p_invoice_id uuid
)
returns table (
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
as $$
  select
    i.id as invoice_id,
    i.company_id,
    i.currency,
    i.base_currency,
    i.exchange_rate,

    coalesce(i.total, 0)::numeric
      as total_amount,

    coalesce(i.total_base, i.total, 0)::numeric
      as total_base,

    coalesce(p.completed_payments, 0)::numeric
      as completed_payments,

    coalesce(
      p.completed_payments_base,
      p.completed_payments,
      0
    )::numeric
      as completed_payments_base,

    coalesce(c.valid_credits, 0)::numeric
      as valid_credits,

    coalesce(
      c.valid_credits_base,
      c.valid_credits,
      0
    )::numeric
      as valid_credits_base,

    greatest(
      coalesce(i.total, 0)
      - coalesce(p.completed_payments, 0)
      - coalesce(c.valid_credits, 0),
      0
    )::numeric
      as balance_due,

    greatest(
      coalesce(i.total_base, i.total, 0)
      - coalesce(
          p.completed_payments_base,
          p.completed_payments,
          0
        )
      - coalesce(
          c.valid_credits_base,
          c.valid_credits,
          0
        ),
      0
    )::numeric
      as balance_due_base

  from public.invoices i

  left join lateral (
    select
      coalesce(sum(pay.amount), 0)::numeric
        as completed_payments,

      coalesce(
        sum(coalesce(pay.amount_base, pay.amount)),
        0
      )::numeric
        as completed_payments_base

    from public.payments pay
    where pay.invoice_id = i.id
      and pay.company_id = i.company_id
      and pay.status = 'Completed'
  ) p on true

  left join lateral (
    select
      coalesce(sum(cn.amount), 0)::numeric
        as valid_credits,

      coalesce(
        sum(coalesce(cn.amount_base, cn.amount)),
        0
      )::numeric
        as valid_credits_base

    from public.credit_notes cn
    where cn.invoice_id = i.id
      and cn.company_id = i.company_id
      and cn.status in ('Issued', 'Applied')
  ) c on true

  where i.id = p_invoice_id;
$$;

comment on function public.get_invoice_financial_balance(uuid)
is
'Returns the authoritative financial balance for an invoice using completed payments and Issued/Applied credit notes.';

-- Internal financial-domain helper.
-- RPCs and owner-executed database objects may call it, but clients should use
-- the public finance views and payment RPCs instead of calling it directly.
revoke all
on function public.get_invoice_financial_balance(uuid)
from public, anon, authenticated;

grant execute
on function public.get_invoice_financial_balance(uuid)
to authenticated, service_role;
