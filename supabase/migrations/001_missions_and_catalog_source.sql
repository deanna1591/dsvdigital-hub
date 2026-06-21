-- =====================================================
-- Migration 001: Missions feature + Catalog source URL
-- Apply AFTER initial schema.sql has been run.
-- Run in Supabase SQL Editor.
-- =====================================================

-- ============ CATALOG: source_url for admin sourcing ============

alter table public.catalog_items
  add column if not exists source_url text;

-- ============ MISSIONS ============

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  points int not null check (points > 0),
  mission_type text not null check (mission_type in ('social-post', 'review', 'survey', 'video', 'referral', 'custom')),
  platform text, -- 'instagram' | 'linkedin' | 'glassdoor' | 'trustpilot' | 'tiktok' | 'x' | 'facebook' | null
  proof_type text not null default 'url' check (proof_type in ('url', 'screenshot', 'text', 'none')),
  cover_color text not null default '#4ba3a3',
  cover_emoji text not null default '🎯',
  external_link text, -- optional — the post/page they should engage with
  instructions text, -- step-by-step what to do
  is_pinned boolean not null default false,
  is_active boolean not null default true,
  max_per_user int not null default 1, -- 1 = one-time, >1 = repeatable, 0 = unlimited
  expires_at timestamptz,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists idx_missions_active on public.missions (is_active, is_pinned desc, sort_order);

-- Mission submissions: when an employee completes a mission and submits proof
create table if not exists public.mission_submissions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  proof_url text,
  proof_text text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  awarded_activity_id uuid references public.point_activities(id), -- the activity row created when approved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_submissions_status on public.mission_submissions (status, created_at desc);
create index if not exists idx_submissions_employee on public.mission_submissions (employee_id, created_at desc);

-- Trigger: keep updated_at fresh on submissions
drop trigger if exists trg_submissions_updated on public.mission_submissions;
create trigger trg_submissions_updated before update on public.mission_submissions
  for each row execute function public.touch_updated_at();

-- ============ RLS ============

alter table public.missions enable row level security;
alter table public.mission_submissions enable row level security;

-- Missions: everyone can read active ones; admins manage
drop policy if exists "read active missions" on public.missions;
create policy "read active missions" on public.missions
  for select using (is_active = true or public.is_admin());

drop policy if exists "admins manage missions" on public.missions;
create policy "admins manage missions" on public.missions
  for all using (public.is_admin()) with check (public.is_admin());

-- Submissions: employees see their own; admins see all
drop policy if exists "employees read own submissions" on public.mission_submissions;
create policy "employees read own submissions" on public.mission_submissions
  for select using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "employees create own submissions" on public.mission_submissions;
create policy "employees create own submissions" on public.mission_submissions
  for insert with check (employee_id = auth.uid() and status = 'pending');

drop policy if exists "admins update submissions" on public.mission_submissions;
create policy "admins update submissions" on public.mission_submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- ============ SEED DATA: Starter missions for DSV ============

insert into public.missions (title, description, points, mission_type, platform, proof_type, cover_color, cover_emoji, instructions, is_pinned, sort_order, external_link) values
  (
    'Leave a 5-star Glassdoor review',
    'Help future teammates discover DSV — share an honest review of what it''s like working here. Takes 5 minutes.',
    100,
    'review',
    'glassdoor',
    'url',
    '#0caa41',
    '🚪',
    'Go to Glassdoor → find DSV Digital → write a review → submit. Paste the link to your review here once published.',
    true,
    10,
    'https://www.glassdoor.com'
  ),
  (
    'Leave a 5-star Trustpilot review',
    'Boost our reputation with clients. Honest 5-star review on Trustpilot.',
    100,
    'review',
    'trustpilot',
    'url',
    '#00b67a',
    '⭐',
    'Visit Trustpilot → search for DSV Digital → leave your review. Paste the URL of your review here.',
    true,
    20,
    'https://www.trustpilot.com'
  ),
  (
    'Like + comment on our latest Instagram post',
    'Quick engagement that boosts our reach. Find our latest post on @dsvdigital and drop a thoughtful comment.',
    5,
    'social-post',
    'instagram',
    'screenshot',
    '#e1306c',
    '📷',
    'Open Instagram → @dsvdigital → like + comment on the latest post → submit a screenshot here.',
    false,
    30,
    null
  ),
  (
    'Share our LinkedIn post with your network',
    'Amplify our LinkedIn presence — share our latest post (with a personal note if you want).',
    15,
    'social-post',
    'linkedin',
    'url',
    '#0a66c2',
    '💼',
    'Find our latest LinkedIn post → click Share → post to your network → paste the URL of your share here.',
    false,
    40,
    null
  ),
  (
    'Refer a friend who joins DSV',
    'You already know the best people. Refer someone who joins the team — get 100 pts when they pass probation.',
    100,
    'referral',
    null,
    'text',
    '#d97435',
    '👥',
    'Tell HR about your referral or submit their name here. Points awarded after they''re hired + pass probation.',
    false,
    50,
    null
  ),
  (
    'Record a 30-second testimonial video',
    'A short video about what you love about working at DSV. We use it for recruiting + social.',
    150,
    'video',
    null,
    'url',
    '#9b80b8',
    '🎬',
    'Record a 30-60 second selfie video about your experience at DSV. Upload to Google Drive (set sharing to "anyone with link") → paste link here.',
    false,
    60,
    null
  ),
  (
    'Tag DSV in a behind-the-scenes post',
    'Show your WFH setup, your workspace mood, or a "day in the life" moment. Tag @dsvdigital.',
    25,
    'social-post',
    'instagram',
    'url',
    '#c95d8f',
    '📸',
    'Post a behind-the-scenes shot to your IG (Story or Feed). Tag @dsvdigital. Paste the post URL here.',
    false,
    70,
    null
  ),
  (
    '🐾 Pet Coworker Photo',
    'Snap your fur, feathered, or scaly coworker doing their thing. Team-created mini-mission — repeatable.',
    10,
    'custom',
    null,
    'screenshot',
    '#c95d8f',
    '🐾',
    'Take a photo of your pet (or any animal companion) at your workspace. Upload to Google Drive or Imgur, set sharing to "anyone with link", paste the link here.',
    false,
    100,
    null
  ),
  (
    '😂 WFH Funny Story',
    'The neighbor''s rooster crashed your client call? The cat sat on the keyboard? Share a quick story. Team-created mini-mission.',
    15,
    'custom',
    null,
    'text',
    '#e8a635',
    '😂',
    'Type a short funny story (1-3 sentences) about your WFH life. Anything from quirky moments to small disasters that ended up okay.',
    false,
    110,
    null
  ),
  (
    '📸 DSV Checkpoint',
    'Take a picture of something right in front of you now and tell us about it. That''s the whole mission. Team-created mini-mission.',
    5,
    'custom',
    null,
    'screenshot',
    '#4ba3a3',
    '📸',
    'Look up from your screen. Take a quick photo of something on your desk, in your room, or out your window. Upload (Drive/Imgur) and paste the link + one sentence about what it is.',
    false,
    120,
    null
  );

-- Set higher per-user caps for repeatable mini-missions (team-created)
update public.missions set max_per_user = 12 where cover_emoji = '🐾';
update public.missions set max_per_user = 6  where cover_emoji = '😂';
update public.missions set max_per_user = 0  where cover_emoji = '📸' and title like '%DSV Checkpoint%';
update public.missions set max_per_user = 5  where mission_type = 'social-post' and platform = 'linkedin';
update public.missions set max_per_user = 12 where mission_type = 'social-post' and platform = 'instagram' and cover_emoji = '📷';
