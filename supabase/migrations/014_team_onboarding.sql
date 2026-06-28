-- =====================================================
-- Migration 014: Team onboarding fields + photo storage
--
-- Extends the profiles table with the columns admins need
-- when inviting people:
--   email, photo_url, company_client, employment_status,
--   phone, member_since
--
-- Adds an 'employee-photos' Storage bucket and a self-update
-- RLS policy so employees can change their own photo and phone.
-- =====================================================

-- ============ Extend profiles ============
alter table public.profiles
  add column if not exists email text,
  add column if not exists photo_url text,
  add column if not exists company_client text,
  add column if not exists employment_status text,
  add column if not exists phone text,
  add column if not exists member_since date;

-- Constrain employment_status to a known set (drop and recreate to be idempotent)
alter table public.profiles
  drop constraint if exists profiles_employment_status_check;
alter table public.profiles
  add constraint profiles_employment_status_check
  check (employment_status is null or employment_status in (
    'fulltime', 'parttime', 'contractor', 'intern', 'leave', 'former'
  ));

-- Self-update RLS: employees can update their own profile rows.
-- Server actions enforce which columns they can actually change
-- (photo_url, phone) — RLS just gates the row.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============ Employee photos bucket ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-photos',
  'employee-photos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: public read, own-folder write, admin override
drop policy if exists "employee_photos_public_read" on storage.objects;
create policy "employee_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'employee-photos');

drop policy if exists "employee_photos_own_insert" on storage.objects;
create policy "employee_photos_own_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'employee-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "employee_photos_own_update" on storage.objects;
create policy "employee_photos_own_update"
  on storage.objects for update
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "employee_photos_own_delete" on storage.objects;
create policy "employee_photos_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'employee-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "employee_photos_admin_all" on storage.objects;
create policy "employee_photos_admin_all"
  on storage.objects for all
  using (
    bucket_id = 'employee-photos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    bucket_id = 'employee-photos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
