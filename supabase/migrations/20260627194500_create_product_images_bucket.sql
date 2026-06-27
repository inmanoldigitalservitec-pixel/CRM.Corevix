insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload product images'
  ) then
    create policy "Authenticated users can upload product images"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can update product images'
  ) then
    create policy "Authenticated users can update product images"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'product-images')
    with check (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can delete product images'
  ) then
    create policy "Authenticated users can delete product images"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read product images'
  ) then
    create policy "Public can read product images"
    on storage.objects
    for select
    to public
    using (bucket_id = 'product-images');
  end if;
end $$;
