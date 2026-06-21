-- =====================================================
-- Migration 005: Slot Machine (Y2K Edition)
--
-- Adds spin token economy + slot machine game.
-- Spins are EARNED by completing activities, not bought.
-- Server-side weighted RNG via SECURITY DEFINER function.
--
-- Run AFTER migration 004.
-- =====================================================

-- ============ SPIN TOKEN LEDGER ============

create table public.spin_tokens_ledger (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null check (delta != 0),
  source text not null, -- 'spark_approved' | 'bingo_approved' | 'mission_approved' | 'spin_used' | 'admin_grant'
  source_id uuid,
  source_note text,
  created_at timestamptz not null default now()
);
create index on public.spin_tokens_ledger (employee_id, created_at desc);

-- View: current spin balance per employee
create or replace view public.employee_spin_balance as
  select
    p.id as employee_id,
    p.name,
    coalesce(sum(l.delta), 0)::int as balance,
    coalesce(sum(case when l.delta > 0 then l.delta else 0 end), 0)::int as total_earned,
    coalesce(sum(case when l.delta < 0 then -l.delta else 0 end), 0)::int as total_spent
  from public.profiles p
  left join public.spin_tokens_ledger l on l.employee_id = p.id
  group by p.id, p.name;

-- ============ SLOT SPINS LOG ============

create table public.slot_spins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  reel_1 text not null,
  reel_2 text not null,
  reel_3 text not null,
  win_type text not null check (win_type in ('jackpot', 'three_of_kind', 'pair', 'none')),
  win_label text,
  payout_points int not null default 0,
  awarded_activity_id uuid references public.point_activities(id),
  created_at timestamptz not null default now()
);
create index on public.slot_spins (employee_id, created_at desc);
create index on public.slot_spins (win_type, created_at desc) where win_type in ('jackpot', 'three_of_kind');

-- ============ RLS ============

alter table public.spin_tokens_ledger enable row level security;
alter table public.slot_spins enable row level security;

create policy "employees read own ledger" on public.spin_tokens_ledger for select
  using (employee_id = auth.uid() or public.is_admin());
-- No direct insert policy — only the SECURITY DEFINER functions can write

create policy "employees read own spins" on public.slot_spins for select
  using (employee_id = auth.uid() or public.is_admin());
-- FEED: big wins (jackpot or 3-of-a-kind ≥ 30 pts) are public
create policy "anyone reads big wins" on public.slot_spins for select
  using (win_type = 'jackpot' or (win_type = 'three_of_kind' and payout_points >= 30));

-- ============ SPIN GRANT TRIGGERS ============

-- Grant +1 spin when a daily spark claim is approved
create or replace function public.grant_spin_on_approve_spark()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    insert into public.spin_tokens_ledger (employee_id, delta, source, source_id, source_note)
    values (new.employee_id, 1, 'spark_approved', new.id, 'Daily Spark approved');
  end if;
  return new;
end$$;

drop trigger if exists trg_grant_spin_spark on public.daily_spark_claims;
create trigger trg_grant_spin_spark
  after update on public.daily_spark_claims
  for each row execute function public.grant_spin_on_approve_spark();

-- Grant +1 spin when a bingo claim is approved
create or replace function public.grant_spin_on_approve_bingo()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    insert into public.spin_tokens_ledger (employee_id, delta, source, source_id, source_note)
    values (new.employee_id, 1, 'bingo_approved', new.id, 'Bingo square approved');
  end if;
  return new;
end$$;

drop trigger if exists trg_grant_spin_bingo on public.bingo_claims;
create trigger trg_grant_spin_bingo
  after update on public.bingo_claims
  for each row execute function public.grant_spin_on_approve_bingo();

-- Grant +2 spins when a mission submission is approved (missions are bigger commitment)
create or replace function public.grant_spin_on_approve_mission()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    insert into public.spin_tokens_ledger (employee_id, delta, source, source_id, source_note)
    values (new.employee_id, 2, 'mission_approved', new.id, 'Mission approved');
  end if;
  return new;
end$$;

drop trigger if exists trg_grant_spin_mission on public.mission_submissions;
create trigger trg_grant_spin_mission
  after update on public.mission_submissions
  for each row execute function public.grant_spin_on_approve_mission();

-- ============ THE SLOT MACHINE FUNCTION ============
-- Server-side weighted RNG + atomic deduct/award via SECURITY DEFINER

create or replace function public.pick_slot_symbol()
returns text language plpgsql as $$
declare r int;
begin
  r := floor(random() * 100)::int;
  if r < 30 then return '🍒';
  elsif r < 55 then return '🍋';
  elsif r < 75 then return '🔔';
  elsif r < 90 then return '⭐';
  elsif r < 97 then return '💎';
  else return '💰';
  end if;
end$$;

create or replace function public.pull_slot_machine()
returns table (
  spin_id uuid,
  reel_1 text,
  reel_2 text,
  reel_3 text,
  win_type text,
  win_label text,
  payout_points int,
  new_balance int
)
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_employee_id uuid;
  current_balance int;
  r1 text;
  r2 text;
  r3 text;
  v_win_type text;
  v_win_label text;
  v_payout int;
  v_activity_id uuid;
  v_spin_id uuid;
  v_new_balance int;
begin
  -- Identify caller
  v_employee_id := auth.uid();
  if v_employee_id is null then
    raise exception 'Not signed in';
  end if;

  -- Check balance
  select coalesce(sum(delta), 0)::int into current_balance
  from public.spin_tokens_ledger
  where employee_id = v_employee_id;

  if current_balance < 1 then
    raise exception 'No spins available';
  end if;

  -- Spin the reels
  r1 := pick_slot_symbol();
  r2 := pick_slot_symbol();
  r3 := pick_slot_symbol();

  -- Determine outcome
  if r1 = r2 and r2 = r3 then
    case r1
      when '🍒' then v_win_type := 'three_of_kind'; v_win_label := '3× 🍒 — Cherry Pop!'; v_payout := 2;
      when '🍋' then v_win_type := 'three_of_kind'; v_win_label := '3× 🍋 — Sour Win!'; v_payout := 3;
      when '🔔' then v_win_type := 'three_of_kind'; v_win_label := '3× 🔔 — Ring Ring!'; v_payout := 5;
      when '⭐' then v_win_type := 'three_of_kind'; v_win_label := '3× ⭐ — Star Burst!'; v_payout := 10;
      when '💎' then v_win_type := 'three_of_kind'; v_win_label := '3× 💎 — DIAMOND HIT!'; v_payout := 30;
      when '💰' then v_win_type := 'jackpot';       v_win_label := '🎰 JACKPOT! 💰💰💰'; v_payout := 150;
      else            v_win_type := 'three_of_kind'; v_win_label := '3 of a kind!'; v_payout := 1;
    end case;
  elsif r1 = r2 or r2 = r3 or r1 = r3 then
    v_win_type := 'pair';
    v_win_label := 'Pair — nice try!';
    v_payout := 1;
  else
    v_win_type := 'none';
    v_win_label := 'No match';
    v_payout := 0;
  end if;

  -- Deduct one spin token (atomic)
  insert into public.spin_tokens_ledger (employee_id, delta, source, source_note)
  values (v_employee_id, -1, 'spin_used', v_win_label);

  -- Award points if won
  if v_payout > 0 then
    insert into public.point_activities (employee_id, category_id, points, note, awarded_by)
    values (v_employee_id, 'engagement', v_payout, 'Slot: ' || v_win_label, v_employee_id)
    returning id into v_activity_id;
  end if;

  -- Log the spin
  insert into public.slot_spins (employee_id, reel_1, reel_2, reel_3, win_type, win_label, payout_points, awarded_activity_id)
  values (v_employee_id, r1, r2, r3, v_win_type, v_win_label, v_payout, v_activity_id)
  returning id into v_spin_id;

  -- New balance
  select coalesce(sum(delta), 0)::int into v_new_balance
  from public.spin_tokens_ledger
  where employee_id = v_employee_id;

  return query select v_spin_id, r1, r2, r3, v_win_type, v_win_label, v_payout, v_new_balance;
end$$;

grant execute on function public.pull_slot_machine() to authenticated;

-- ============ ADMIN GRANT FUNCTION (optional bonus spins) ============

create or replace function public.grant_bonus_spins(target_employee_id uuid, amount int, reason text default 'Admin bonus')
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.is_admin() then
    raise exception 'Permission denied';
  end if;
  if amount = 0 then
    raise exception 'Amount must be non-zero';
  end if;
  insert into public.spin_tokens_ledger (employee_id, delta, source, source_note)
  values (target_employee_id, amount, 'admin_grant', reason);
end$$;

grant execute on function public.grant_bonus_spins(uuid, int, text) to authenticated;
