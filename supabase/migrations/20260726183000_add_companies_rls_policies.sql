-- Permite que cada usuario autenticado consulte únicamente
-- la empresa asociada con su perfil.

create policy "Users can view their company"
on public.companies
for select
to authenticated
using (
  id = (
    select p.company_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  )
);

-- Permite actualizar únicamente la empresa asociada con el usuario.

create policy "Users can update their company"
on public.companies
for update
to authenticated
using (
  id = (
    select p.company_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  )
)
with check (
  id = (
    select p.company_id
    from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  )
);
