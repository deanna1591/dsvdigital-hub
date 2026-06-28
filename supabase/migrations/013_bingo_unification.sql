-- =====================================================
-- Migration 013: Bingo schema unification
--
-- Move all bingo data from the OLD tables (bingo_events,
-- bingo_squares, bingo_claims — created in 004) into the NEW
-- tables (bingo_boards, bingo_board_squares, bingo_board_claims
-- — created in 006).
--
-- Idempotent: existing rows are skipped via NOT EXISTS guards.
-- Old tables are NOT dropped here — they stay for safety until
-- a future migration removes them, after we've verified the
-- new tables drive the app.
-- =====================================================

-- ============ COPY bingo_events → bingo_boards ============
insert into public.bingo_boards (id, title, month, start_date, end_date, status, theme, created_at)
select
  e.id,
  e.title,
  to_char(e.start_date, 'YYYY-MM') as month,
  e.start_date,
  e.end_date,
  case when e.is_active then 'live' else 'past' end as status,
  coalesce(e.cover_emoji, '🎲') as theme,
  e.created_at
from public.bingo_events e
where not exists (select 1 from public.bingo_boards b where b.id = e.id);

-- ============ COPY bingo_squares → bingo_board_squares ============
-- Position 0-24 maps to (row, col): row = position / 5, col = position % 5
-- Position 12 (center of 5x5) becomes is_free=true
insert into public.bingo_board_squares (id, board_id, col, row, name, emoji, prompt, is_free, is_lucky, created_at)
select
  s.id,
  s.event_id as board_id,
  (s.position % 5) as col,
  (s.position / 5) as row,
  s.label as name,
  case
    -- pick a sensible emoji from the prompt if we can guess
    when s.prompt ilike '%walk%' or s.prompt ilike '%hike%' then '🚶'
    when s.prompt ilike '%breath%' or s.prompt ilike '%meditat%' then '🫁'
    when s.prompt ilike '%dance%' then '💃'
    when s.prompt ilike '%photo%' or s.prompt ilike '%sunset%' then '📸'
    when s.prompt ilike '%read%' then '📚'
    when s.prompt ilike '%cook%' or s.prompt ilike '%recipe%' then '🍳'
    when s.prompt ilike '%write%' or s.prompt ilike '%journal%' then '✍️'
    when s.prompt ilike '%sing%' or s.prompt ilike '%karaoke%' then '🎤'
    when s.prompt ilike '%volunteer%' then '🤲'
    when s.prompt ilike '%hug%' or s.prompt ilike '%care%' then '💝'
    when s.label ilike 'free%' then '⭐'
    else '✨'
  end as emoji,
  s.prompt,
  (s.position = 12 or s.label ilike 'FREE%') as is_free,
  -- Lucky square: pick the highest-points square (old schema had +10 lucky squares)
  (s.points > 5) as is_lucky,
  now() as created_at
from public.bingo_squares s
where not exists (
  select 1 from public.bingo_board_squares bs where bs.id = s.id
);

-- ============ ADD missing column to bingo_board_claims ============
-- The old schema had proof_text alongside proof_url. Keep it on the new table.
alter table public.bingo_board_claims
  add column if not exists proof_text text;

-- ============ COPY bingo_claims → bingo_board_claims ============
insert into public.bingo_board_claims (id, square_id, employee_id, photo_url, proof_text, share_to_feed, status, reviewed_by, rejection_note, created_at)
select
  c.id,
  c.square_id,
  c.employee_id,
  c.proof_url as photo_url,
  c.proof_text,
  false as share_to_feed,
  c.status,
  c.reviewed_by,
  c.review_note as rejection_note,
  c.created_at
from public.bingo_claims c
where not exists (
  select 1 from public.bingo_board_claims bc where bc.id = c.id
);

-- ============ ENABLE RLS on new tables (if not already) ============

alter table public.bingo_boards enable row level security;

drop policy if exists "bingo_boards_read_all" on public.bingo_boards;
create policy "bingo_boards_read_all" on public.bingo_boards for select
  using (true);  -- everyone can see boards

drop policy if exists "bingo_boards_admin_write" on public.bingo_boards;
create policy "bingo_boards_admin_write" on public.bingo_boards for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.bingo_board_squares enable row level security;

drop policy if exists "bingo_board_squares_read_all" on public.bingo_board_squares;
create policy "bingo_board_squares_read_all" on public.bingo_board_squares for select
  using (true);

drop policy if exists "bingo_board_squares_admin_write" on public.bingo_board_squares;
create policy "bingo_board_squares_admin_write" on public.bingo_board_squares for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.bingo_board_claims enable row level security;

drop policy if exists "bingo_board_claims_select" on public.bingo_board_claims;
create policy "bingo_board_claims_select" on public.bingo_board_claims for select
  using (
    employee_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "bingo_board_claims_insert" on public.bingo_board_claims;
create policy "bingo_board_claims_insert" on public.bingo_board_claims for insert
  with check (employee_id = auth.uid());

drop policy if exists "bingo_board_claims_admin_update" on public.bingo_board_claims;
create policy "bingo_board_claims_admin_update" on public.bingo_board_claims for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
