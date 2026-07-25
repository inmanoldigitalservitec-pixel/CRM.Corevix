-- Align only financial numeric columns whose current unconstrained
-- definitions conflict with the established monetary model.
--
-- Money: numeric(14,2)
-- Exchange rates: numeric(14,6)
-- Percentage rates: numeric(7,4)
--
-- invoice_items.quantity intentionally remains unconstrained because
-- fractional quantities may require domain-specific precision.

alter table public.invoice_items
  alter column unit_price
    type numeric(14,2)
    using round(unit_price, 2),

  alter column total
    type numeric(14,2)
    using round(total, 2),

  alter column original_unit_price
    type numeric(14,2)
    using round(original_unit_price, 2),

  alter column converted_unit_price
    type numeric(14,2)
    using round(converted_unit_price, 2),

  alter column tax_rate
    type numeric(7,4)
    using round(tax_rate, 4);

alter table public.payments
  alter column amount
    type numeric(14,2)
    using round(amount, 2);

alter table public.payment_movements
  alter column amount
    type numeric(14,2)
    using round(amount, 2),

  alter column amount_base
    type numeric(14,2)
    using round(amount_base, 2),

  alter column exchange_rate
    type numeric(14,6)
    using round(exchange_rate, 6);

alter table public.projects
  alter column exchange_rate
    type numeric(14,6)
    using round(exchange_rate, 6),

  alter column budget_base
    type numeric(14,2)
    using round(budget_base, 2);
