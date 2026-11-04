insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('venue-payment-proofs', 'venue-payment-proofs', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sportmate: payment proofs insert owner" on storage.objects;
drop policy if exists "sportmate: payment proofs update owner" on storage.objects;
drop policy if exists "sportmate: payment proofs select owner or admin" on storage.objects;

create policy "sportmate: payment proofs insert owner" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'venue-payment-proofs'
    and public.owns_venue_folder((storage.foldername(name))[1])
  );
create policy "sportmate: payment proofs update owner" on storage.objects for update to authenticated
  using (
    bucket_id = 'venue-payment-proofs'
    and public.owns_venue_folder((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'venue-payment-proofs'
    and public.owns_venue_folder((storage.foldername(name))[1])
  );
create policy "sportmate: payment proofs select owner or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'venue-payment-proofs'
    and (
      public.owns_venue_folder((storage.foldername(name))[1])
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = 'ADMIN'
      )
    )
  );
