insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own profile avatars'
  ) then
    create policy "Users can upload own profile avatars"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own profile avatars'
  ) then
    create policy "Users can update own profile avatars"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    )
    with check (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own profile avatars'
  ) then
    create policy "Users can delete own profile avatars"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read profile avatars'
  ) then
    create policy "Public can read profile avatars"
    on storage.objects
    for select
    to public
    using (bucket_id = 'profile-avatars');
  end if;
end $$;
