create or replace function public.get_payment_net_balance(p_payment_id uuid)
returns table(
  payment_id uuid,
  company_id uuid,
  invoice_id uuid,
  original_amount numeric,
  original_amount_base numeric,
  movement_amount numeric,
  movement_amount_base numeric,
  net_amount numeric,
  net_amount_base numeric
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p.id as payment_id,
    p.company_id,
    p.invoice_id,
    p.amount as original_amount,
    coalesce(p.amount_base, p.amount) as original_amount_base,
    coalesce(m.movement_amount, 0) as movement_amount,
    coalesce(m.movement_amount_base, 0) as movement_amount_base,
    case
      when p.status = 'Completed' then greatest(
        p.amount - coalesce(m.movement_amount, 0),
        0
      )
      else 0
    end as net_amount,
    case
      when p.status = 'Completed' then greatest(
        coalesce(p.amount_base, p.amount)
          - coalesce(m.movement_amount_base, 0),
        0
      )
      else 0
    end as net_amount_base
  from public.payments p
  left join lateral (
    select
      sum(pm.amount) as movement_amount,
      sum(pm.amount_base) as movement_amount_base
    from public.payment_movements pm
    where pm.original_payment_id = p.id
  ) m on true
  where p.id = p_payment_id;
$function$;
