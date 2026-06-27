-- =====================================================
-- Migration 012: Habits + Tasks RLS, habit reflections
--
-- Wires up Row-Level Security on the habits, habit_completions,
-- and personal_tasks tables (created in migration 006 without
-- policies). Also adds a habit_reflections table for the
-- "every 7 days" journal prompt.
-- =====================================================

-- ============ habits ============
alter table public.habits enable row level security;

drop policy if exists "habits_own_select" on public.habits;
create policy "habits_own_select" on public.habits for select
  using (employee_id = auth.uid());

drop policy if exists "habits_own_insert" on public.habits;
create policy "habits_own_insert" on public.habits for insert
  with check (employee_id = auth.uid());

drop policy if exists "habits_own_update" on public.habits;
create policy "habits_own_update" on public.habits for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

drop policy if exists "habits_own_delete" on public.habits;
create policy "habits_own_delete" on public.habits for delete
  using (employee_id = auth.uid());

-- ============ habit_completions ============
alter table public.habit_completions enable row level security;

drop policy if exists "habit_completions_own_select" on public.habit_completions;
create policy "habit_completions_own_select" on public.habit_completions for select
  using (employee_id = auth.uid());

drop policy if exists "habit_completions_own_insert" on public.habit_completions;
create policy "habit_completions_own_insert" on public.habit_completions for insert
  with check (employee_id = auth.uid());

drop policy if exists "habit_completions_own_delete" on public.habit_completions;
create policy "habit_completions_own_delete" on public.habit_completions for delete
  using (employee_id = auth.uid());

-- ============ habit_reflections ============
create table if not exists public.habit_reflections (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  streak_count int not null,       -- which streak milestone this reflects on (7, 14, 21…)
  what_works text,
  what_is_hard text,
  created_at timestamptz not null default now(),
  unique (habit_id, streak_count)
);

create index if not exists idx_habit_reflections_employee
  on public.habit_reflections (employee_id, created_at desc);

alter table public.habit_reflections enable row level security;

drop policy if exists "habit_reflections_own_select" on public.habit_reflections;
create policy "habit_reflections_own_select" on public.habit_reflections for select
  using (employee_id = auth.uid());

drop policy if exists "habit_reflections_own_insert" on public.habit_reflections;
create policy "habit_reflections_own_insert" on public.habit_reflections for insert
  with check (employee_id = auth.uid());

drop policy if exists "habit_reflections_own_update" on public.habit_reflections;
create policy "habit_reflections_own_update" on public.habit_reflections for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

drop policy if exists "habit_reflections_own_delete" on public.habit_reflections;
create policy "habit_reflections_own_delete" on public.habit_reflections for delete
  using (employee_id = auth.uid());

-- ============ personal_tasks ============
alter table public.personal_tasks enable row level security;

drop policy if exists "personal_tasks_own_select" on public.personal_tasks;
create policy "personal_tasks_own_select" on public.personal_tasks for select
  using (employee_id = auth.uid());

drop policy if exists "personal_tasks_own_insert" on public.personal_tasks;
create policy "personal_tasks_own_insert" on public.personal_tasks for insert
  with check (employee_id = auth.uid());

drop policy if exists "personal_tasks_own_update" on public.personal_tasks;
create policy "personal_tasks_own_update" on public.personal_tasks for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

drop policy if exists "personal_tasks_own_delete" on public.personal_tasks;
create policy "personal_tasks_own_delete" on public.personal_tasks for delete
  using (employee_id = auth.uid());
