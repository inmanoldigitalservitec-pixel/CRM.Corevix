-- Normalize existing payment numbers chronologically per company,
-- prevent duplicates, and advance the identity sequence safely.

begin;

lock table public.payments in access exclusive mode;

alter table public.payments disable trigger user;

with ranked as (
  select
    id,
    row_number() over (
      partition by company_id
      order by created_at asc, id asc
    )::bigint as new_payment_number
  from public.payments
)
update public.payments p
set payment_number = ranked.new_payment_number
from ranked
where ranked.id = p.id
  and p.payment_number is distinct from ranked.new_payment_number;

alter table public.payments enable trigger user;

create unique index if not exists payments_company_payment_number_uidx
  on public.payments (company_id, payment_number);

do $$
declare
  v_sequence text;
  v_max bigint;
begin
  v_sequence := pg_get_serial_sequence('public.payments', 'payment_number');
  select coalesce(max(payment_number), 0) into v_max from public.payments;

  if v_sequence is not null then
    if v_max > 0 then
      perform setval(v_sequence::regclass, v_max, true);
    else
      perform setval(v_sequence::regclass, 1, false);
    end if;
  end if;
end;
$$;

commit;
