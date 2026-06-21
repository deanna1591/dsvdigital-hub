-- =====================================================
-- Storage buckets — run once, after migrations
-- Or set up via Supabase dashboard if you prefer
-- =====================================================

insert into storage.buckets (id, name, public) values
  ('digests',      'digests',      true)   -- weekly digest PDFs (public so iframe embed works)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values
  ('strips',       'strips',       false)  -- photobooth strips (private, signed URLs only)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values
  ('bingo_claims', 'bingo_claims', false)  -- bingo proof photos (private)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values
  ('avatars',      'avatars',      true)   -- profile pictures (public)
  on conflict (id) do nothing;

-- =====================================================
-- Storage policies (folder-per-user pattern)
-- Path format: {bucket}/{user_id}/{filename}
-- =====================================================

-- STRIPS: users can only upload to their own folder
create policy "users upload own strips" on storage.objects
  for insert with check (
    bucket_id = 'strips'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users read own strips" on storage.objects
  for select using (
    bucket_id = 'strips'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users delete own strips" on storage.objects
  for delete using (
    bucket_id = 'strips'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- BINGO CLAIMS: users upload own, admins read all (for review queue)
create policy "users upload own bingo proof" on storage.objects
  for insert with check (
    bucket_id = 'bingo_claims'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users read own bingo proof" on storage.objects
  for select using (
    bucket_id = 'bingo_claims'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "admins read all bingo proofs" on storage.objects
  for select using (
    bucket_id = 'bingo_claims'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- AVATARS: anyone reads, users write own
create policy "anyone reads avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- DIGESTS: anyone reads (public bucket), only admins upload
create policy "admins upload digests" on storage.objects
  for insert with check (
    bucket_id = 'digests'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
