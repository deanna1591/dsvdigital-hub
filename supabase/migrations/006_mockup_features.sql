-- =====================================================
-- Migration 006: Mockup-era feature additions
--
-- Adds tables for everything we built in the HTML mockup
-- after the original 005 migration:
--   - Monthly bingo boards (admin-editable)
--   - Per-day sparks schedule overrides
--   - Weekly digest PDFs
--   - Per-user notifications
--   - Mood check-ins (no points)
--   - Habits + completions
--   - Personal tasks (kanban)
--   - Photobooth strips with privacy
--   - Activity engine settings
--   - Challenges (X-out-of-Y monthly goals)
--   - Workspace SSO settings
--
-- Run AFTER migration 005.
-- =====================================================

-- ============ BINGO BOARDS (monthly admin-managed) ============
-- Supersedes the older bingo_events approach. Each board is a full
-- 5x5 card with 25 squares; status drives whether teammates see it.

create table public.bingo_boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  month text not null,              -- 'YYYY-MM' for grouping
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'past')),
  theme text,                       -- optional flavor name ("Wellness Week")
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bingo_boards_live_per_month
  on public.bingo_boards (month) where status = 'live';

create table public.bingo_board_squares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.bingo_boards(id) on delete cascade,
  col smallint not null check (col between 0 and 4),
  row smallint not null check (row between 0 and 4),
  name text not null,
  emoji text not null default '✨',
  prompt text,
  is_free boolean not null default false,
  is_lucky boolean not null default false,
  unique (board_id, col, row)
);

-- Per-board claims (replaces bingo_claims pointing at events)
create table public.bingo_board_claims (
  id uuid primary key default gen_random_uuid(),
  square_id uuid not null references public.bingo_board_squares(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  photo_url text,
  share_to_feed boolean default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_note text,
  created_at timestamptz not null default now(),
  unique (square_id, employee_id)
);

-- ============ SPARKS SCHEDULE (date overrides) ============
-- The daily_sparks table already has 366 evergreen entries. This table
-- lets admins schedule specific sparks for specific dates and override
-- points (including disabling points for fun-only days).

create table public.sparks_schedule (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  title text not null,
  prompt text not null,
  emoji text not null default '✨',
  points_enabled boolean not null default true,
  points int not null default 10,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============ WEEKLY DIGEST (PDF) ============

create table public.weekly_digests (
  id uuid primary key default gen_random_uuid(),
  week_number int not null,                   -- ISO week
  year int not null,
  title text not null,
  teaser text not null,
  pdf_url text,                                -- Supabase Storage public URL
  pdf_size_bytes bigint,
  pdf_filename text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (year, week_number)
);

create table public.weekly_digest_views (
  id uuid primary key default gen_random_uuid(),
  digest_id uuid not null references public.weekly_digests(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (digest_id, employee_id)
);

-- ============ NOTIFICATIONS ============

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                          -- 'spark_reminder' | 'points_awarded' | 'order_delivered' | etc
  icon text not null default '🔔',
  text text not null,                          -- HTML allowed (sanitized client-side)
  link_url text,                               -- optional deep link
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_recent_idx on public.notifications (user_id, created_at desc);

-- ============ MOOD CHECK-INS (no points, multi-per-day) ============

create table public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null,                          -- 'happy' | 'sad' | 'angry' | etc
  submood text,                                -- 'content' | 'amused' | etc
  note text,
  share_to_feed boolean default false,
  created_at timestamptz not null default now()
);

create index mood_checkins_employee_idx on public.mood_checkins (employee_id, created_at desc);

-- ============ HABITS ============

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '🌱',
  target_per_day int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

-- ============ PERSONAL TASKS (kanban) ============

create table public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  bucket text not null default 'today' check (bucket in ('today', 'tomorrow', 'someday', 'brain_dump')),
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ PHOTOBOOTH STRIPS ============

create table public.photobooth_strips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,                     -- Supabase Storage URL
  thumbnail_url text,
  share_to_feed boolean default false,
  created_at timestamptz not null default now()
);

-- ============ ACTIVITY ENGINE SETTINGS ============
-- Admin toggles + per-activity point rules. Inserted with defaults seeded below.

create table public.activity_settings (
  activity_type text primary key,             -- 'spark' | 'bingo' | 'mission' | 'slot' | 'habit' | 'mood' | 'wheel' | 'photobooth'
  enabled boolean not null default true,
  default_points int not null default 0,
  custom_per_item boolean not null default false,
  lock_no_points boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.activity_settings (activity_type, enabled, default_points, custom_per_item, lock_no_points) values
  ('spark',      true,  10, false, false),
  ('bingo',      true,   5, false, false),
  ('mission',    true,   0, true,  false),
  ('slot',       true,   0, true,  false),
  ('habit',      false,  0, false, false),
  ('mood',       false,  0, false, true),
  ('wheel',      false,  0, false, true),
  ('photobooth', false,  0, false, true);

-- ============ CHALLENGES ============

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  activity_type text not null,                -- references activity_settings(activity_type)
  target int not null,                         -- "do X of these to win"
  target_outof int,                            -- optional "out of Y"
  reward_points int not null,
  start_date date not null,
  end_date date not null,
  participation text not null default 'all' check (participation in ('all', 'opt_in')),
  status text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  progress int not null default 0,
  completed_at timestamptz,                    -- set when target hit + reward awarded
  unique (challenge_id, employee_id)
);

-- ============ WORKSPACE / AUTH SETTINGS ============

create table public.workspace_settings (
  id int primary key default 1 check (id = 1),  -- singleton row
  allowed_domain text not null default '@dsvdigital.com',
  default_role text not null default 'employee' check (default_role in ('employee', 'manager', 'admin')),
  admin_emails text[] not null default array[]::text[],
  google_workspace_id text,
  updated_at timestamptz not null default now()
);

insert into public.workspace_settings (id, allowed_domain, default_role, admin_emails)
values (1, '@dsvdigital.com', 'employee', array['hr@dsvdigital.com', 'cheruby@dsvdigital.com'])
on conflict (id) do nothing;

-- ============ STORAGE BUCKETS ============
-- These need to be created via the dashboard or supabase CLI separately.
-- See README.md "Storage Setup" section for: digests, strips, bingo_claims.

-- ============ RLS POLICIES ============

alter table public.bingo_boards            enable row level security;
alter table public.bingo_board_squares     enable row level security;
alter table public.bingo_board_claims      enable row level security;
alter table public.sparks_schedule         enable row level security;
alter table public.weekly_digests          enable row level security;
alter table public.weekly_digest_views     enable row level security;
alter table public.notifications           enable row level security;
alter table public.mood_checkins           enable row level security;
alter table public.habits                  enable row level security;
alter table public.habit_completions       enable row level security;
alter table public.personal_tasks          enable row level security;
alter table public.photobooth_strips       enable row level security;
alter table public.activity_settings       enable row level security;
alter table public.challenges              enable row level security;
alter table public.challenge_participants  enable row level security;
alter table public.workspace_settings      enable row level security;

-- Helper: is_admin (matches earlier migrations' pattern)
-- Assumes profiles.role column exists ('employee' | 'admin' | 'manager') from migration 001.

-- Bingo boards: anyone reads live boards; admins read/write all
create policy "live_bingo_boards_readable" on public.bingo_boards
  for select using (status = 'live' or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "admin_full_bingo_boards" on public.bingo_boards
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "bingo_squares_follow_board" on public.bingo_board_squares
  for select using (exists (
    select 1 from public.bingo_boards b
    where b.id = bingo_board_squares.board_id
      and (b.status = 'live' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));
create policy "admin_full_bingo_squares" on public.bingo_board_squares
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "own_bingo_claims_rw" on public.bingo_board_claims
  for all using (employee_id = auth.uid());
create policy "admin_all_bingo_claims" on public.bingo_board_claims
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Sparks schedule: anyone reads (so portal can show today's spark), admins write
create policy "anyone_reads_sparks_schedule" on public.sparks_schedule
  for select using (true);
create policy "admins_write_sparks_schedule" on public.sparks_schedule
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Weekly digests: anyone reads published, admins everything
create policy "published_digests_readable" on public.weekly_digests
  for select using (status = 'published' or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "admin_full_digests" on public.weekly_digests
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "own_digest_views" on public.weekly_digest_views
  for all using (employee_id = auth.uid());

-- Notifications: only the recipient reads/marks their own
create policy "own_notifications" on public.notifications
  for all using (user_id = auth.uid());

-- Mood: own only (private by default, public via share_to_feed)
create policy "own_mood" on public.mood_checkins
  for all using (employee_id = auth.uid());
create policy "shared_moods_readable" on public.mood_checkins
  for select using (share_to_feed = true);

-- Habits: own only
create policy "own_habits" on public.habits
  for all using (employee_id = auth.uid());
create policy "own_habit_completions" on public.habit_completions
  for all using (employee_id = auth.uid());

-- Personal tasks: own only
create policy "own_tasks" on public.personal_tasks
  for all using (employee_id = auth.uid());

-- Photobooth: own + shared
create policy "own_strips" on public.photobooth_strips
  for all using (employee_id = auth.uid());
create policy "shared_strips_readable" on public.photobooth_strips
  for select using (share_to_feed = true);

-- Activity settings: anyone reads (employee view needs to know what awards points), admins write
create policy "anyone_reads_activity_settings" on public.activity_settings
  for select using (true);
create policy "admins_write_activity_settings" on public.activity_settings
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Challenges: anyone reads active, admins write
create policy "active_challenges_readable" on public.challenges
  for select using (status = 'active' or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "admins_write_challenges" on public.challenges
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "own_challenge_participation" on public.challenge_participants
  for all using (employee_id = auth.uid());
create policy "admin_all_challenge_participants" on public.challenge_participants
  for select using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Workspace settings: anyone reads, admins write
create policy "anyone_reads_workspace_settings" on public.workspace_settings
  for select using (true);
create policy "admins_write_workspace_settings" on public.workspace_settings
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- ============ HELPER: line-detection trigger for bingo ============
-- When a bingo_board_claim is approved, check if it completes any line(s).
-- Server function returns array of completed lines; caller awards bonus.

create or replace function public.check_bingo_lines(p_board_id uuid, p_employee_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_claimed_positions int[];
  v_lines jsonb := '[]'::jsonb;
  v_line int[];
  v_letters text[] := array['B', 'I', 'N', 'G', 'O'];
  c int;
  r int;
  cnt int;
begin
  -- All approved + free squares for this employee on this board (as col*5+row position)
  select array_agg(s.col * 5 + s.row)
    into v_claimed_positions
  from public.bingo_board_squares s
  left join public.bingo_board_claims cl
    on cl.square_id = s.id and cl.employee_id = p_employee_id and cl.status = 'approved'
  where s.board_id = p_board_id
    and (s.is_free = true or cl.id is not null);

  -- Check 5 rows
  for r in 0..4 loop
    select count(*) into cnt from unnest(v_claimed_positions) p where (p % 5) = r;
    if cnt = 5 then
      v_lines := v_lines || jsonb_build_object('type', 'row', 'name', 'Row ' || (r+1));
    end if;
  end loop;

  -- Check 5 columns
  for c in 0..4 loop
    select count(*) into cnt from unnest(v_claimed_positions) p where (p / 5) = c;
    if cnt = 5 then
      v_lines := v_lines || jsonb_build_object('type', 'col', 'name', 'Column ' || v_letters[c+1]);
    end if;
  end loop;

  -- Check diagonals
  if (select count(*) from unnest(v_claimed_positions) p where (p / 5) = (p % 5)) = 5 then
    v_lines := v_lines || jsonb_build_object('type', 'diag', 'name', 'Diagonal down');
  end if;
  if (select count(*) from unnest(v_claimed_positions) p where (p / 5) + (p % 5) = 4) = 5 then
    v_lines := v_lines || jsonb_build_object('type', 'diag', 'name', 'Diagonal up');
  end if;

  return v_lines;
end;
$$;

grant execute on function public.check_bingo_lines(uuid, uuid) to authenticated;
