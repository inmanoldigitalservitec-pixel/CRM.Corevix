insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-documents',
  'contract-documents',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf'];

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can upload contract documents'
  ) then
    create policy "Company members can upload contract documents"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'contract-documents'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can read contract documents'
  ) then
    create policy "Company members can read contract documents"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'contract-documents'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can delete contract documents'
  ) then
    create policy "Company members can delete contract documents"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'contract-documents'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;
end $$;
