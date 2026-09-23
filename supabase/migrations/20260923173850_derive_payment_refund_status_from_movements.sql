-- Refund state is derived from immutable payment_movements. A payment cannot
-- be created or manually changed into a refund state without a real movement.

create or replace function public.reject_manual_payment_refund_status()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.status in ('Refunded', 'Partially Refunded', 'Reversed') then
    raise exception
      'El estado de reembolso se deriva de los movimientos; registra el reembolso desde la acción correspondiente.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_reject_manual_refund_status
on public.payments;

create trigger payments_reject_manual_refund_status
before insert or update of status
on public.payments
for each row
execute function public.reject_manual_payment_refund_status();

revoke all
on function public.reject_manual_payment_refund_status()
from public, anon, authenticated;

comment on function public.reject_manual_payment_refund_status()
is 'Prevents manually setting payment refund states; those are derived from immutable payment movements.';
