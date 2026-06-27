-- =====================================================
-- Migration 011: Photobooth storage bucket + policies
--
-- Creates the 'photobooth-strips' bucket where users upload
-- their composited PNG strips. Public read (so they can be
-- shared in the feed without signed URLs), authenticated
-- write restricted to one's own folder.
--
-- Object path convention: {employee_id}/{strip_id}.png
-- =====================================================

-- Create the bucket if missing
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photobooth-strips',
  'photobooth-strips',
  true,
  5242880, -- 5 MB max per strip
  array['image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read: public (anyone can view strips by URL)
drop policy if exists "photobooth_strips_public_read" on storage.objects;
create policy "photobooth_strips_public_read"
  on storage.objects for select
  using (bucket_id = 'photobooth-strips');

-- Write: authenticated users, restricted to their own folder
drop policy if exists "photobooth_strips_own_insert" on storage.objects;
create policy "photobooth_strips_own_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'photobooth-strips'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only own files
drop policy if exists "photobooth_strips_own_delete" on storage.objects;
create policy "photobooth_strips_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'photobooth-strips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update RLS on the photobooth_strips table (from migration 006):
-- Users can see all strips marked share_to_feed = true,
-- and all their own strips regardless.
alter table public.photobooth_strips enable row level security;

drop policy if exists "photobooth_strips_select" on public.photobooth_strips;
create policy "photobooth_strips_select"
  on public.photobooth_strips for select
  using (
    employee_id = auth.uid()
    or share_to_feed = true
  );

drop policy if exists "photobooth_strips_insert" on public.photobooth_strips;
create policy "photobooth_strips_insert"
  on public.photobooth_strips for insert
  with check (employee_id = auth.uid());

drop policy if exists "photobooth_strips_update" on public.photobooth_strips;
create policy "photobooth_strips_update"
  on public.photobooth_strips for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

drop policy if exists "photobooth_strips_delete" on public.photobooth_strips;
create policy "photobooth_strips_delete"
  on public.photobooth_strips for delete
  using (employee_id = auth.uid());
