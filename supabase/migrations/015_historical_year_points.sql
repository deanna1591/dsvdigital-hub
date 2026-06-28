-- =====================================================
-- Migration 015: Historical year-end point snapshots
--
-- The portal tracks individual point_activities for the current
-- year (2026) and going forward. For prior years (2023-2025), we
-- just need the per-employee yearly totals to display in the
-- admin Summary view.
--
-- This separate table avoids inflating the current spendable
-- balance with historical totals — those years are read-only
-- snapshots, not redeemable points.
-- =====================================================

create table if not exists public.historical_year_points (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  year int not null check (year >= 2020 and year <= 2099),
  points int not null default 0 check (points >= 0),
  notes text,
  created_at timestamptz not null default now(),
  primary key (employee_id, year)
);

-- Admins can read/write everything. Employees can read their own
-- snapshots if we ever expose them in /profile, but not write.
alter table public.historical_year_points enable row level security;

drop policy if exists "admins manage historical_year_points" on public.historical_year_points;
create policy "admins manage historical_year_points"
  on public.historical_year_points
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "employees read own historical_year_points" on public.historical_year_points;
create policy "employees read own historical_year_points"
  on public.historical_year_points
  for select
  using (employee_id = auth.uid());

comment on table public.historical_year_points is
  'Per-employee yearly point totals for prior years (2023-2025 etc). Display-only, not part of the spendable balance.';
