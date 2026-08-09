insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their profile avatars'
  ) then
    create policy "Users can upload their profile avatars"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = (select auth.uid())
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their profile avatars'
  ) then
    create policy "Users can update their profile avatars"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = (select auth.uid())
      )
    )
    with check (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = (select auth.uid())
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their profile avatars'
  ) then
    create policy "Users can delete their profile avatars"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and p.user_id = (select auth.uid())
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
