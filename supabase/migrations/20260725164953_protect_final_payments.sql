-- Protect final payment states from direct UPDATE and DELETE operations.
--
-- Financial corrections must happen through dedicated RPCs, not by mutating
-- or deleting finalized payment records directly.

create or replace function public.protect_final_payment_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
begin
  v_old_status := coalesce(old.status, '');

  if v_old_status in (
    'Completed',
    'Refunded',
    'Reversed',
    'Failed'
  ) then
    if tg_op = 'DELETE' then
      raise exception
        'Los pagos con estado % son inmutables y no pueden eliminarse.',
        v_old_status
        using errcode = '55000';
    end if;

    if tg_op = 'UPDATE' then
      raise exception
        'Los pagos con estado % son inmutables y no pueden editarse directamente.',
        v_old_status
        using errcode = '55000';
    end if;
  end if;

  -- Pending payments remain editable for now.
  -- Their allowed field transitions will be restricted through dedicated RPCs
  -- and RLS policies in the next migration.
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists
  payments_protect_final_mutations
on public.payments;

create trigger payments_protect_final_mutations
before update or delete
on public.payments
for each row
execute function public.protect_final_payment_mutations();

revoke all
on function public.protect_final_payment_mutations()
from public, anon, authenticated;

grant execute
on function public.protect_final_payment_mutations()
to service_role;

comment on function public.protect_final_payment_mutations()
is
'Prevents direct updates and deletes of Completed, Refunded, Reversed and Failed payments.';
