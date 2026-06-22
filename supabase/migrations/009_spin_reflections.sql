-- =====================================================
-- Migration 009: Add reflection fields to spin_wheel_spins
--
-- After a user spins, they can journal three prompts from the
-- un.shaped guide:
--   - WHAT DID YOU NOTICE?
--   - WHAT DID YOU FEEL?
--   - ANYTHING ELSE?
--
-- All optional — a spin without reflection is still a valid record.
-- reflected_at is set when the user submits their journal entry.
-- =====================================================

alter table public.spin_wheel_spins
  add column if not exists reflection_prompt text,
  add column if not exists reflection_notice text,
  add column if not exists reflection_feel text,
  add column if not exists reflection_else text,
  add column if not exists reflected_at timestamptz;

-- Allow updates to one's own spin row (for adding/editing reflection)
drop policy if exists "spin_wheel_spins_own_update" on public.spin_wheel_spins;
create policy "spin_wheel_spins_own_update"
  on public.spin_wheel_spins for update
  using (auth.uid() = employee_id)
  with check (auth.uid() = employee_id);
