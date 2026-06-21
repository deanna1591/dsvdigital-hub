-- =====================================================
-- DSV Digital Portal — Supabase Schema
-- Paste this into the Supabase SQL Editor and run.
-- =====================================================

-- ============ TABLES ============

-- Employee profiles, extends auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Categories (mirrors your existing matrix; admins can add more later)
create table public.point_categories (
  id text primary key,
  name text not null,
  default_points int not null,
  is_active boolean not null default true,
  description text,
  max_per_year int
);

-- Point earning history (every time an employee earns points)
create table public.point_activities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  category_id text not null references public.point_categories(id),
  points int not null,
  note text,
  awarded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.point_activities (employee_id, created_at desc);

-- Catalog of redeemable items (admins can edit; seeded below)
create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🎁',
  points int not null,
  peso_value int not null,
  source_url text, -- optional: where admin sources/buys this item (Lazada, Amazon, supplier doc, etc.)
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Redemption orders
create table public.redemption_orders (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id),
  item_name text not null,
  item_icon text not null,
  points_spent int not null,
  peso_value int not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'rejected')),
  admin_note text,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.redemption_orders (employee_id, created_at desc);
create index on public.redemption_orders (status, created_at desc);

-- Missions: tasks that benefit the company (reviews, social engagement, referrals)
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  points int not null check (points > 0),
  mission_type text not null check (mission_type in ('social-post', 'review', 'survey', 'video', 'referral', 'custom')),
  platform text, -- 'instagram' | 'linkedin' | 'glassdoor' | 'trustpilot' | 'tiktok' | 'x' | 'facebook' | null
  proof_type text not null default 'url' check (proof_type in ('url', 'screenshot', 'text', 'none')),
  cover_color text not null default '#4ba3a3',
  cover_emoji text not null default '🎯',
  external_link text,
  instructions text,
  is_pinned boolean not null default false,
  is_active boolean not null default true,
  max_per_user int not null default 1,
  expires_at timestamptz,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create index on public.missions (is_active, is_pinned desc, sort_order);

-- Mission submissions: employee submits proof, admin approves to award points
create table public.mission_submissions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  proof_url text,
  proof_text text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  awarded_activity_id uuid references public.point_activities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.mission_submissions (status, created_at desc);
create index on public.mission_submissions (employee_id, created_at desc);

-- ============ VIEW: computed balances ============

create or replace view public.employee_balances as
select
  p.id,
  p.name,
  p.role,
  p.is_active,
  coalesce((select sum(points) from point_activities where employee_id = p.id), 0) as earned_total,
  coalesce((select sum(points_spent) from redemption_orders where employee_id = p.id and status != 'rejected'), 0) as redeemed_total,
  coalesce((select sum(points) from point_activities where employee_id = p.id), 0)
    - coalesce((select sum(points_spent) from redemption_orders where employee_id = p.id and status != 'rejected'), 0) as balance
from public.profiles p;

-- ============ FUNCTIONS ============

-- Auto-create a profile when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'employee');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on order changes
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_orders_updated before update on public.redemption_orders
  for each row execute function public.touch_updated_at();
create trigger trg_submissions_updated before update on public.mission_submissions
  for each row execute function public.touch_updated_at();

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.point_categories enable row level security;
alter table public.point_activities enable row level security;
alter table public.catalog_items enable row level security;
alter table public.redemption_orders enable row level security;
alter table public.missions enable row level security;
alter table public.mission_submissions enable row level security;

-- profiles: everyone can read all profiles (so admin views work + name lookups)
create policy "read all profiles" on public.profiles for select using (true);
-- profiles: only admins can update (e.g., change role or deactivate)
create policy "admins update profiles" on public.profiles for update using (public.is_admin());

-- point_categories: everyone can read
create policy "read categories" on public.point_categories for select using (true);
-- only admins can modify
create policy "admins manage categories" on public.point_categories for all using (public.is_admin()) with check (public.is_admin());

-- point_activities: employees see their own, admins see all
create policy "employees read own activities" on public.point_activities for select
  using (employee_id = auth.uid() or public.is_admin());
create policy "admins create activities" on public.point_activities for insert
  with check (public.is_admin());
-- FEED: anyone can read birthday/anniversary milestones
create policy "anyone reads milestones" on public.point_activities for select
  using (category_id in ('birthday', 'anniversary'));

-- catalog_items: everyone can read active items
create policy "read active catalog" on public.catalog_items for select using (is_active = true or public.is_admin());
create policy "admins manage catalog" on public.catalog_items for all
  using (public.is_admin()) with check (public.is_admin());

-- redemption_orders: employees see their own, admins see all
create policy "employees read own orders" on public.redemption_orders for select
  using (employee_id = auth.uid() or public.is_admin());
create policy "employees create own orders" on public.redemption_orders for insert
  with check (employee_id = auth.uid() and status = 'pending');
create policy "admins update orders" on public.redemption_orders for update
  using (public.is_admin()) with check (public.is_admin());
-- FEED: anyone can read non-pending orders (celebrate the win)
create policy "anyone reads delivered orders" on public.redemption_orders for select
  using (status in ('processing', 'delivered'));

-- missions: anyone reads active; admins manage
create policy "read active missions" on public.missions for select
  using (is_active = true or public.is_admin());
create policy "admins manage missions" on public.missions for all
  using (public.is_admin()) with check (public.is_admin());

-- mission_submissions: employees see/create own, admins see/manage all
create policy "employees read own submissions" on public.mission_submissions for select
  using (employee_id = auth.uid() or public.is_admin());
create policy "employees create own submissions" on public.mission_submissions for insert
  with check (employee_id = auth.uid() and status = 'pending');
create policy "admins update submissions" on public.mission_submissions for update
  using (public.is_admin()) with check (public.is_admin());
-- FEED: anyone can read approved submissions
create policy "anyone reads approved submissions" on public.mission_submissions for select
  using (status = 'approved');

-- ============ SEED DATA ============

-- Point categories (mirrors your current matrix + new Engagement Bonus)
insert into public.point_categories (id, name, default_points, description, max_per_year) values
  ('attendance', 'Complete Monthly Attendance', 30, 'Awarded monthly for full attendance', 12),
  ('birthday', 'Birthday', 100, 'Annual birthday bonus', 1),
  ('anniversary', 'Staff Anniversary', 100, 'Annual work anniversary', 1),
  ('hubstaff', 'Hubstaff Hotstreak', 40, 'Attained 40% or more on Hubstaff', 12),
  ('check-in', 'Internal Check-In', 5, '5-pt micro-recognition', null),
  ('kickoff', 'Kick-Off Meeting', 5, 'Attended kick-off', null),
  ('commendation', 'Client Commendation', 20, 'Max 1 per month', 12),
  ('peer', 'Peer-to-Peer Recognition', 5, 'Max 20/year (lifted from 10)', 20),
  ('idea', 'Innovative Ideas', 5, 'Max 10/year', 10),
  ('referral', 'Employee Referral', 10, 'Max 12/year', 12),
  ('review', 'Company Review', 60, 'Max 2/year', 2),
  ('mandatory-leave', 'Use of 5-day Mandatory Leave', 100, 'Annual', 1),
  ('engagement', 'Engagement Bonus', 5, 'NEW — uncapped fun calendar activities', null);

-- Catalog items (based on your actual 2026 redemption history)
insert into public.catalog_items (name, icon, points, peso_value, sort_order) values
  ('Grab Voucher ₱500', '🛵', 100, 500, 10),
  ('Grab Voucher ₱1,000', '🛵', 200, 1000, 11),
  ('Grab Voucher ₱2,000', '🛵', 400, 2000, 12),
  ('SM Gift Card ₱500', '🎁', 100, 500, 20),
  ('Bluetooth Speaker', '🔊', 125, 625, 30),
  ('Powerbank 10000mAh', '🔋', 140, 700, 31),
  ('Coffee Maker', '☕', 280, 1400, 40),
  ('Takoyaki Maker', '🥟', 200, 1000, 41),
  ('Waffle Maker', '🧇', 210, 1050, 42),
  ('Air Fryer', '🍟', 390, 1950, 43),
  ('Handheld Vacuum', '🧹', 340, 1700, 50),
  ('Air Bed', '🛏️', 500, 2500, 51);

-- Starter missions (tasks that benefit DSV — reviews, social engagement, referrals)
insert into public.missions (title, description, points, mission_type, platform, proof_type, cover_color, cover_emoji, instructions, is_pinned, sort_order, external_link) values
  ('Leave a 5-star Glassdoor review',
   'Help future teammates discover DSV — share an honest review of what it''s like working here.',
   100, 'review', 'glassdoor', 'url', '#0caa41', '🚪',
   'Go to Glassdoor → find DSV Digital → write a review → submit. Paste the link to your review here once published.',
   true, 10, 'https://www.glassdoor.com'),
  ('Leave a 5-star Trustpilot review',
   'Boost our reputation with clients. Honest 5-star review on Trustpilot.',
   100, 'review', 'trustpilot', 'url', '#00b67a', '⭐',
   'Visit Trustpilot → search for DSV Digital → leave your review. Paste the URL of your review here.',
   true, 20, 'https://www.trustpilot.com'),
  ('Like + comment on our latest Instagram post',
   'Quick engagement that boosts our reach. Find our latest post on @dsvdigital and drop a thoughtful comment.',
   5, 'social-post', 'instagram', 'screenshot', '#e1306c', '📷',
   'Open Instagram → @dsvdigital → like + comment on the latest post → submit a screenshot here.',
   false, 30, null),
  ('Share our LinkedIn post with your network',
   'Amplify our LinkedIn presence — share our latest post with your network.',
   15, 'social-post', 'linkedin', 'url', '#0a66c2', '💼',
   'Find our latest LinkedIn post → click Share → post to your network → paste the URL of your share here.',
   false, 40, null),
  ('Refer a friend who joins DSV',
   'You already know the best people. Refer someone who joins the team — get 100 pts when they pass probation.',
   100, 'referral', null, 'text', '#d97435', '👥',
   'Tell HR about your referral or submit their name here. Points awarded after they''re hired + pass probation.',
   false, 50, null),
  ('Record a 30-second testimonial video',
   'A short video about what you love about working at DSV. We use it for recruiting + social.',
   150, 'video', null, 'url', '#9b80b8', '🎬',
   'Record a 30-60 second selfie video about your experience at DSV. Upload to Google Drive (sharing: anyone with link) → paste link here.',
   false, 60, null),
  ('Tag DSV in a behind-the-scenes post',
   'Show your WFH setup, your workspace mood, or a day-in-the-life moment. Tag @dsvdigital.',
   25, 'social-post', 'instagram', 'url', '#c95d8f', '📸',
   'Post a behind-the-scenes shot to your IG (Story or Feed). Tag @dsvdigital. Paste the post URL here.',
   false, 70, null),
  ('🐾 Pet Coworker Photo',
   'Snap your fur, feathered, or scaly coworker doing their thing. Team-created mini-mission — repeatable.',
   10, 'custom', null, 'screenshot', '#c95d8f', '🐾',
   'Take a photo of your pet (or any animal companion) at your workspace. Upload to Google Drive or Imgur, set sharing to "anyone with link", paste the link here. Caption optional but encouraged!',
   false, 100, null),
  ('😂 WFH Funny Story',
   'The neighbor''s rooster crashed your client call? The cat sat on the keyboard? Share a quick story. Team-created mini-mission.',
   15, 'custom', null, 'text', '#e8a635', '😂',
   'Type a short funny story (1-3 sentences) about your WFH life. Anything from quirky moments to small disasters that ended up okay.',
   false, 110, null),
  ('📸 DSV Checkpoint',
   'Take a picture of something right in front of you now and tell us about it. That''s the whole mission. Team-created mini-mission.',
   5, 'custom', null, 'screenshot', '#4ba3a3', '📸',
   'Look up from your screen. Take a quick photo of something on your desk, in your room, or out your window. Upload (Drive/Imgur) and paste the link + one sentence about what it is.',
   false, 120, null);

-- Set higher per-user caps for repeatable mini-missions (team-created)
update public.missions set max_per_user = 12 where cover_emoji = '🐾'; -- Pet Coworker: 12×/year
update public.missions set max_per_user = 6  where cover_emoji = '😂'; -- WFH Story: 6×/year
update public.missions set max_per_user = 0  where cover_emoji = '📸' and title like '%DSV Checkpoint%'; -- DSV Checkpoint: unlimited
update public.missions set max_per_user = 5  where mission_type = 'social-post' and platform = 'linkedin'; -- LinkedIn shares: 5×/year
update public.missions set max_per_user = 12 where mission_type = 'social-post' and platform = 'instagram' and cover_emoji = '📷'; -- IG like+comment: monthly

-- ============ MAKE YOURSELF ADMIN ============
-- After you sign up the first time, run this with your email:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL@dsvdigital.com');
