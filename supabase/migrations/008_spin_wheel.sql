-- =====================================================
-- Migration 008: Spin Wheel
--
-- NOTE: This table was applied via the Supabase SQL editor during
-- the initial build and is already live in production. This file is
-- a reconstruction committed for repo completeness so the schema can
-- be rebuilt from migrations if ever needed. It is idempotent and
-- safe to re-run against the live database.
-- =====================================================

create table if not exists public.spin_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  activity_day int not null,
  activity_title text not null,
  activity_instr text,
  reflection_prompt text,
  reflection_notice text,
  reflection_feel text,
  reflection_else text,
  reflected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists spin_wheel_spins_employee_idx
  on public.spin_wheel_spins (employee_id, created_at desc);

alter table public.spin_wheel_spins enable row level security;

drop policy if exists "employees manage own spins" on public.spin_wheel_spins;
create policy "employees manage own spins"
  on public.spin_wheel_spins
  for all
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

drop policy if exists "admins read all spins" on public.spin_wheel_spins;
create policy "admins read all spins"
  on public.spin_wheel_spins
  for select
  using (public.is_admin());

comment on table public.spin_wheel_spins is
  'Each spin of the daily activity wheel, plus optional post-spin reflection. Reconstructed migration — table already live.';
