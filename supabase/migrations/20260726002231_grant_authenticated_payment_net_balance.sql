-- Permiso aplicado previamente en producción.

grant execute on function public.get_payment_net_balance(uuid)
to authenticated;
