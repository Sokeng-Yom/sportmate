-- Buckets: public read, size and type limits. Safe to re-run.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',      'avatars',      true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('venue-photos', 'venue-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Is the signed-in user the owner of the venue whose id is the first folder of the file path?
create or replace function public.owns_venue_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (select 1 from public.venues v where v.id = p_folder::uuid and v.owner_id = auth.uid());
exception when others then
  return false;  -- the folder name was not a valid uuid
end;
$$;
revoke all on function public.owns_venue_folder(text) from public;
grant execute on function public.owns_venue_folder(text) to authenticated;

-- Remove our previous policies, then recreate them
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and policyname like 'sportmate:%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end
$$;

-- avatars/<user id>/<file>: users manage only their own folder
create policy "sportmate: avatars select own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sportmate: avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sportmate: avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sportmate: avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- venue-photos/<venue id>/<file>: only that venue's owner
create policy "sportmate: venue photos select owner" on storage.objects for select to authenticated
  using (bucket_id = 'venue-photos' and public.owns_venue_folder((storage.foldername(name))[1]));
create policy "sportmate: venue photos insert owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-photos' and public.owns_venue_folder((storage.foldername(name))[1]));
create policy "sportmate: venue photos update owner" on storage.objects for update to authenticated
  using (bucket_id = 'venue-photos' and public.owns_venue_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'venue-photos' and public.owns_venue_folder((storage.foldername(name))[1]));
create policy "sportmate: venue photos delete owner" on storage.objects for delete to authenticated
  using (bucket_id = 'venue-photos' and public.owns_venue_folder((storage.foldername(name))[1]));
