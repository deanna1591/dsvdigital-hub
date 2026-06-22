-- =====================================================
-- Migration 008: Spin Wheel persistence
--
-- Stores each spin a user makes on the Spin Wheel for:
--   - User's personal spin history
--   - Admin reports (what's popular, who's engaged)
--
-- Activities are NOT FK'd — they live in the TS constants file
-- (lib/data/spin-activities.ts). We store the day_of_year and a
-- snapshot of the title at spin time, so the record stays
-- meaningful even if we re-curate the activity pool later.
-- =====================================================

create table if not exists public.spin_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  activity_day int not null check (activity_day between 1 and 200),
  activity_title text not null,
  activity_instr text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_spin_wheel_spins_employee
  on public.spin_wheel_spins (employee_id, created_at desc);

create index if not exists idx_spin_wheel_spins_day
  on public.spin_wheel_spins (activity_day);

-- Row-level security
alter table public.spin_wheel_spins enable row level security;

-- Users can see their own spins
drop policy if exists "spin_wheel_spins_own_select" on public.spin_wheel_spins;
create policy "spin_wheel_spins_own_select"
  on public.spin_wheel_spins for select
  using (auth.uid() = employee_id);

-- Users can insert their own spins
drop policy if exists "spin_wheel_spins_own_insert" on public.spin_wheel_spins;
create policy "spin_wheel_spins_own_insert"
  on public.spin_wheel_spins for insert
  with check (auth.uid() = employee_id);

-- Admins can see everyone's spins (for reports)
drop policy if exists "spin_wheel_spins_admin_select" on public.spin_wheel_spins;
create policy "spin_wheel_spins_admin_select"
  on public.spin_wheel_spins for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
