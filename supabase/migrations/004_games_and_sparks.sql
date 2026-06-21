-- =====================================================
-- Migration 004: In-Platform Games & Daily Sparks
--
-- Adds: Daily Spark (one gatekept random activity per day,
--       runs all year, can't skip ahead or stockpile),
--       Bingo Events + Squares + Claims (interactive bingo
--       boards employees play inside the portal).
--
-- Run AFTER migration 003.
-- =====================================================

-- ============ DAILY SPARKS ============

create table public.daily_sparks (
  id uuid primary key default gen_random_uuid(),
  day_of_year int not null unique check (day_of_year between 1 and 366),
  title text not null,
  prompt text not null,
  emoji text not null default '✨',
  color text not null default '#4ba3a3',
  points int not null default 5,
  proof_type text not null default 'screenshot' check (proof_type in ('screenshot', 'text', 'none')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table public.daily_spark_claims (
  id uuid primary key default gen_random_uuid(),
  spark_id uuid not null references public.daily_sparks(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null,
  proof_url text,
  proof_text text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  awarded_activity_id uuid references public.point_activities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, claim_date)
);

create index on public.daily_spark_claims (employee_id, claim_date desc);
create index on public.daily_spark_claims (status, created_at desc);

create trigger trg_spark_claims_updated before update on public.daily_spark_claims
  for each row execute function public.touch_updated_at();

alter table public.daily_sparks enable row level security;
alter table public.daily_spark_claims enable row level security;

create policy "read active sparks" on public.daily_sparks for select
  using (is_active = true or public.is_admin());
create policy "admins manage sparks" on public.daily_sparks for all
  using (public.is_admin()) with check (public.is_admin());

create policy "employees read own spark claims" on public.daily_spark_claims for select
  using (employee_id = auth.uid() or public.is_admin());
create policy "employees create own spark claims" on public.daily_spark_claims for insert
  with check (employee_id = auth.uid() and status = 'pending');
create policy "admins update spark claims" on public.daily_spark_claims for update
  using (public.is_admin()) with check (public.is_admin());
-- FEED: approved claims are public
create policy "anyone reads approved spark claims" on public.daily_spark_claims for select
  using (status = 'approved');


-- ============ BINGO ============

create table public.bingo_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  bonus_row_points int not null default 25,
  bonus_blackout_points int not null default 100,
  cover_color text not null default '#d97435',
  cover_emoji text not null default '🎯',
  created_at timestamptz default now()
);

create table public.bingo_squares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bingo_events(id) on delete cascade,
  position int not null check (position between 0 and 24),
  label text not null,
  prompt text,
  points int not null default 5,
  proof_type text not null default 'screenshot' check (proof_type in ('screenshot', 'text', 'none')),
  unique (event_id, position)
);

create table public.bingo_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.bingo_events(id) on delete cascade,
  square_id uuid not null references public.bingo_squares(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  proof_url text,
  proof_text text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  awarded_activity_id uuid references public.point_activities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, square_id)
);

create index on public.bingo_claims (employee_id, status);
create index on public.bingo_claims (event_id, status);

create trigger trg_bingo_claims_updated before update on public.bingo_claims
  for each row execute function public.touch_updated_at();

alter table public.bingo_events enable row level security;
alter table public.bingo_squares enable row level security;
alter table public.bingo_claims enable row level security;

create policy "read active bingo events" on public.bingo_events for select
  using (is_active = true or public.is_admin());
create policy "admins manage bingo events" on public.bingo_events for all
  using (public.is_admin()) with check (public.is_admin());

create policy "read bingo squares" on public.bingo_squares for select using (true);
create policy "admins manage bingo squares" on public.bingo_squares for all
  using (public.is_admin()) with check (public.is_admin());

create policy "employees read own bingo claims" on public.bingo_claims for select
  using (employee_id = auth.uid() or public.is_admin());
create policy "employees create own bingo claims" on public.bingo_claims for insert
  with check (employee_id = auth.uid() and status = 'pending');
create policy "admins update bingo claims" on public.bingo_claims for update
  using (public.is_admin()) with check (public.is_admin());
-- FEED: approved bingo claims are public
create policy "anyone reads approved bingo claims" on public.bingo_claims for select
  using (status = 'approved');


-- ============ SEED: 366 DAILY SPARKS ============

-- 366 daily sparks — one per day of year
insert into public.daily_sparks (day_of_year, title, prompt, emoji, color, points, proof_type) values
  (1, 'Color Hunt', 'Find something blue and photograph it', '🔵', '#4a7a9e', 10, 'screenshot'),
  (2, 'Random Object', 'Pick the closest random object and photograph it', '🎲', '#d65a5a', 10, 'screenshot'),
  (3, 'Reflection', 'Photograph your reflection in something other than a mirror', '✨', '#c95d8f', 10, 'screenshot'),
  (4, 'Behind You', 'Photo of what''s directly behind you right now', '🔄', '#7a9568', 10, 'screenshot'),
  (5, 'Dream Vacation', 'Where would you go tomorrow if money was no object?', '✈️', '#4ba3a3', 5, 'text'),
  (6, 'Stand Up', 'Stand and walk for 3 minutes — anywhere', '🚶', '#7a9568', 5, 'text'),
  (7, 'Today''s Look', 'What are you wearing? Just a quick OOTD shot (no faces needed)', '👕', '#4a7a9e', 10, 'screenshot'),
  (8, 'Podcast Pick', 'Recommend a podcast you''ve been into', '🎙️', '#a07050', 5, 'text'),
  (9, 'Sunset/Sunrise', 'Catch the sky during golden hour today', '🌇', '#d97435', 10, 'screenshot'),
  (10, 'Movie Tagline', 'Sum up your life right now as a movie tagline', '🎬', '#d97435', 5, 'text'),
  (11, 'Yesterday Lesson', 'One thing yesterday taught you', '💡', '#e8a635', 5, 'text'),
  (12, 'Best Snack', 'What''s the best snack in your kitchen right now?', '🍪', '#d97435', 5, 'text'),
  (13, 'Random Fact', 'Share a random fact you''ve memorized', '🧠', '#4a7a9e', 5, 'text'),
  (14, 'Mind Dump', 'Write down whatever''s on your mind for 90 seconds', '🧠', '#9b80b8', 5, 'text'),
  (15, 'Hydrate Now', 'Drink a full glass of water right now — share a pic of your glass', '💧', '#4ba3a3', 10, 'screenshot'),
  (16, 'Stretch Break', 'Stand up and stretch for 60 seconds. Done? Drop a ''done!'' below', '🧘', '#7a9568', 5, 'text'),
  (17, 'Morning Brew', 'What''s in your cup today? ☕', '☕', '#a07050', 10, 'screenshot'),
  (18, 'Recent Joy', 'Last thing that genuinely made you laugh out loud', '😂', '#e8a635', 5, 'text'),
  (19, 'Praise Specific', 'Tell a teammate exactly what they did well recently', '🌟', '#4ba3a3', 5, 'text'),
  (20, 'No-Phone Minute', 'Put your phone face-down for 1 minute. Resist!', '📵', '#d65a5a', 5, 'text'),
  (21, 'Made Me Smile', 'What made you smile today?', '😊', '#e8a635', 5, 'text'),
  (22, 'Mug Shot', 'The mug you''re using today (work-safe!)', '☕', '#9b80b8', 10, 'screenshot'),
  (23, 'Recommended Book', 'A book you''d recommend to anyone', '📖', '#7a9568', 5, 'text'),
  (24, 'Time Travel', 'If you could revisit any year for one day, which?', '⏳', '#4a7a9e', 5, 'text'),
  (25, 'Current Earworm', 'What song is stuck in your head right now?', '🎶', '#c95d8f', 5, 'text'),
  (26, 'Currently Reading', 'What are you reading or watching right now?', '📺', '#7a9568', 5, 'text'),
  (27, 'Random Check-in', 'Message a friend you haven''t talked to in 2+ weeks', '👋', '#e8a635', 5, 'text'),
  (28, 'Pocket Contents', 'Pull out what''s in your pocket/bag right now and photograph', '👜', '#a07050', 10, 'screenshot'),
  (29, 'Tab Cleanup', 'Close 5 tabs you don''t actually need', '🗂️', '#9b80b8', 5, 'text'),
  (30, 'Gratitude Pause', 'Name 3 things you''re thankful for right now', '🙏', '#c95d8f', 5, 'text'),
  (31, 'Posture Check', 'Sit up straight. Adjust your screen height. Done?', '💺', '#4a7a9e', 5, 'text'),
  (32, 'Self-Kindness', 'Say one nice thing to YOURSELF today. Share it', '💖', '#c95d8f', 5, 'text'),
  (33, 'Pet Peeve', 'One harmless pet peeve you have', '🤨', '#d65a5a', 5, 'text'),
  (34, 'Song of Today', 'What song are you playing on repeat lately?', '🎵', '#9b80b8', 5, 'text'),
  (35, 'Above You', 'Photo looking straight up', '⬆️', '#4ba3a3', 10, 'screenshot'),
  (36, 'Tiny Win', 'Share a small win from this week', '🏆', '#d97435', 5, 'text'),
  (37, 'Feet Check', 'Show us your feet — barefoot, sock, slipper, shoe — anything', '👟', '#a07050', 10, 'screenshot'),
  (38, 'Underrated Thing', 'Name something underrated that more people should know about', '💎', '#c95d8f', 5, 'text'),
  (39, 'Best Recipe', 'Share a recipe you''ve made recently — even just the name', '👩‍🍳', '#d65a5a', 5, 'text'),
  (40, 'Made-Up Word', 'Invent a new word and define it', '🔤', '#4a7a9e', 5, 'text'),
  (41, 'Tomorrow''s Goal', 'One small thing you want to do tomorrow', '🎯', '#d97435', 5, 'text'),
  (42, 'Pet Coworker', 'If you''ve got a pet, show us what they''re up to', '🐾', '#c95d8f', 10, 'screenshot'),
  (43, 'Favorite Quote', 'Share a quote that''s been living in your head', '💬', '#a07050', 5, 'text'),
  (44, 'Best Compliment', 'Best compliment you''ve ever received?', '💛', '#e8a635', 5, 'text'),
  (45, 'Skill Wishlist', 'A skill you wish you had', '✨', '#9b80b8', 5, 'text'),
  (46, 'Two Truths One Lie', 'Share 2 true things and 1 lie about yourself — we''ll guess', '🎲', '#4a7a9e', 5, 'text'),
  (47, 'Future Self', 'One thing future-you will thank present-you for', '🔮', '#9b80b8', 5, 'text'),
  (48, 'View From Here', 'Snap a photo from your current window or view', '🌅', '#e8a635', 10, 'screenshot'),
  (49, 'Tiny Joy', 'Share one tiny thing that consistently brings you joy', '💛', '#e8a635', 5, 'text'),
  (50, 'Eye Rest', 'Look at something 20ft away for 20 seconds. Confirm done!', '👀', '#4a7a9e', 5, 'text'),
  (51, 'Deep Breaths', 'Take 5 deep breaths. Count them out. Done? Tell us!', '🌬️', '#4ba3a3', 5, 'text'),
  (52, 'Today''s Word', 'Sum up today in one word', '📝', '#9b80b8', 5, 'text'),
  (53, 'Out the Window', 'Quick shot of what''s outside your nearest window', '🪟', '#e8a635', 10, 'screenshot'),
  (54, 'Gratitude Drop', 'One thing you''re grateful for today', '🙏', '#c95d8f', 5, 'text'),
  (55, 'Three Words', 'Describe today in exactly 3 words', '3️⃣', '#4a7a9e', 5, 'text'),
  (56, 'Thank a Helper', 'Thank someone who helped you recently — anyone in life', '🙏', '#9b80b8', 5, 'text'),
  (57, 'Door View', 'Photo of the door you walk through most', '🚪', '#4a7a9e', 10, 'screenshot'),
  (58, 'Bad Joke', 'Tell us the worst joke you know', '🤣', '#e8a635', 5, 'text'),
  (59, 'Productivity Hack', 'Share a small productivity trick that works for you', '⚡', '#e8a635', 5, 'text'),
  (60, 'Treat Yourself', 'What''s your little treat today? (food, drink, candy)', '🍫', '#d65a5a', 10, 'screenshot'),
  (61, 'Today''s Soundtrack', 'If your day had a soundtrack, what song?', '🎵', '#4ba3a3', 5, 'text'),
  (62, 'Plant Friend', 'Show us a plant in your home or one you walked past today', '🌱', '#7a9568', 10, 'screenshot'),
  (63, 'Outdoor Walk', 'If you stepped outside today, share one photo from your walk', '🚶', '#7a9568', 10, 'screenshot'),
  (64, 'Hidden Talent 2', 'Something small you can do that surprises people', '🎩', '#c95d8f', 5, 'text'),
  (65, 'Snack Attack', 'What are you snacking on today?', '🍿', '#d97435', 10, 'screenshot'),
  (66, 'Today''s Vibe', 'One photo that captures your mood today', '💫', '#c95d8f', 10, 'screenshot'),
  (67, 'Comfort Food', 'What''s your comfort food and why?', '🍲', '#d97435', 5, 'text'),
  (68, 'Hidden Talent', 'What''s something small you''re secretly good at?', '🎩', '#9b80b8', 5, 'text'),
  (69, 'Headphones On', 'Show your current headphones, earbuds, or whatever you''re listening on', '🎧', '#9b80b8', 10, 'screenshot'),
  (70, 'Best Concert', 'Best live show you''ve ever been to?', '🎤', '#d65a5a', 5, 'text'),
  (71, 'Game Pick', 'Recommend a game (video game, board, mobile, anything)', '🎮', '#9b80b8', 5, 'text'),
  (72, 'Quick Doodle', 'Doodle anything for 60 seconds. Photograph the result', '✏️', '#a07050', 10, 'screenshot'),
  (73, 'Snack Time', 'Eat something with actual nutrients (fruit, nuts, etc)', '🍎', '#d65a5a', 10, 'screenshot'),
  (74, 'WFH Hack', 'Share one trick that makes WFH life better', '🏠', '#4a7a9e', 5, 'text'),
  (75, 'Floor Tile', 'Photo of the floor beneath your feet right now', '🟦', '#9b80b8', 10, 'screenshot'),
  (76, 'Send Kudos', 'Send a teammate a thank you (in chat or in person). Tell us who', '💌', '#c95d8f', 5, 'text'),
  (77, 'Random Memory', 'Share a random childhood memory that popped into your head', '👶', '#a07050', 5, 'text'),
  (78, 'Best Purchase', 'Best thing you''ve bought under ₱500 recently', '🛍️', '#c95d8f', 5, 'text'),
  (79, 'Mirror Selfie', 'Take a quick mirror selfie (face optional!)', '🪞', '#c95d8f', 10, 'screenshot'),
  (80, 'Workspace Reveal', 'Show us your workspace right now — no cleanup allowed 👀', '💻', '#4a7a9e', 10, 'screenshot'),
  (81, 'If You Were', 'If you were a kitchen utensil, which one and why?', '🥄', '#e8a635', 5, 'text'),
  (82, 'Local Recommendation', 'Recommend a local spot near you (cafe, restaurant, etc.)', '📍', '#d97435', 5, 'text'),
  (83, 'Comfort Show', 'Your go-to comfort show or movie', '🎬', '#a07050', 5, 'text'),
  (84, 'Six Word Story', 'Tell us a story in exactly 6 words', '📖', '#c95d8f', 5, 'text'),
  (85, 'Childhood Show', 'TV show or cartoon you loved as a kid', '📺', '#9b80b8', 5, 'text'),
  (86, 'Hometown Fact', 'Share one cool fact about your hometown', '🏘️', '#7a9568', 5, 'text'),
  (87, 'Help Offer', 'Offer to help a teammate with something today', '🤝', '#7a9568', 5, 'text'),
  (88, 'Color Hunt', 'Find something red and photograph it', '🔴', '#d65a5a', 10, 'screenshot'),
  (89, 'Quick Tidy', 'Clean ONE small thing on your desk', '🧹', '#a07050', 10, 'screenshot'),
  (90, 'Random Wikipedia', 'Hit Wikipedia random — what''d you land on?', '📜', '#a07050', 5, 'text'),
  (91, 'Outside Time', 'Step outside for 5 minutes. Bonus: in sunlight', '☀️', '#e8a635', 5, 'text'),
  (92, 'Comfort Drink', 'Your go-to drink when you need a pick-me-up', '🥤', '#d65a5a', 5, 'text'),
  (93, 'Five Things', 'Group together 5 small items and photograph them', '5️⃣', '#9b80b8', 10, 'screenshot'),
  (94, 'Color Hunt', 'Find something yellow and photograph it', '🟡', '#e8a635', 10, 'screenshot'),
  (95, 'Movie Pick', 'What''s the last movie or show you actually finished?', '🎬', '#4ba3a3', 5, 'text'),
  (96, 'Limerick Time', 'Write a quick limerick about anything', '🎭', '#c95d8f', 5, 'text'),
  (97, 'Sky Check', 'Photo of the sky from where you are right now', '☁️', '#4ba3a3', 10, 'screenshot'),
  (98, 'First Job', 'Tell us about your first ever job', '💼', '#4a7a9e', 5, 'text'),
  (99, 'Wrist Stretch', 'Stretch your wrists. Roll your shoulders. Done!', '🤲', '#c95d8f', 5, 'text'),
  (100, 'Lunch Spot', 'Photo of what you ate or where you ate today', '🍱', '#e8a635', 10, 'screenshot'),
  (101, 'Window Time', 'Open a window or step outside for 2 minutes', '🌤️', '#e8a635', 5, 'text'),
  (102, 'Work Haiku', 'Write a haiku (5-7-5) about your job today', '📝', '#9b80b8', 5, 'text'),
  (103, 'Pay It Forward', 'Do one small unprompted kind act today. Tell us what', '✨', '#e8a635', 5, 'text'),
  (104, 'Screen Time', 'What''s on your screen right now? (work-friendly part)', '🖥️', '#4ba3a3', 10, 'screenshot'),
  (105, 'Theme Song', 'If you walked into work to a theme song, what would it be?', '🎵', '#9b80b8', 5, 'text'),
  (106, 'Notebook Page', 'Show us a page of your notes or planner (any redactions OK)', '📓', '#a07050', 10, 'screenshot'),
  (107, 'Color Hunt', 'Find something green and photograph it', '🟢', '#7a9568', 10, 'screenshot'),
  (108, 'Pattern Spot', 'Find an interesting pattern around you and capture it', '🔷', '#4ba3a3', 10, 'screenshot'),
  (109, 'One Good Thing', 'What was the best part of your day so far?', '🌟', '#e8a635', 5, 'text'),
  (110, 'Hidden Gem App', 'An app you love that not enough people know about', '📱', '#9b80b8', 5, 'text'),
  (111, 'Hands at Work', 'A quick pic of your hands on the keyboard, holding something, anything', '✋', '#c95d8f', 10, 'screenshot'),
  (112, 'Book Nearby', 'Any book within arm''s reach? Show us', '📚', '#a07050', 10, 'screenshot'),
  (113, 'Compliment Drop', 'Compliment someone in your life today. Tell us how it went', '🌷', '#d65a5a', 5, 'text'),
  (114, 'Productivity Hack', 'Share a small productivity trick that works for you', '⚡', '#e8a635', 5, 'text'),
  (115, 'Today''s Word', 'Sum up today in one word', '📝', '#9b80b8', 5, 'text'),
  (116, 'Color Hunt', 'Find something blue and photograph it', '🔵', '#4a7a9e', 10, 'screenshot'),
  (117, 'View From Here', 'Snap a photo from your current window or view', '🌅', '#e8a635', 10, 'screenshot'),
  (118, 'Hidden Talent', 'What''s something small you''re secretly good at?', '🎩', '#9b80b8', 5, 'text'),
  (119, 'Praise Specific', 'Tell a teammate exactly what they did well recently', '🌟', '#4ba3a3', 5, 'text'),
  (120, 'Game Pick', 'Recommend a game (video game, board, mobile, anything)', '🎮', '#9b80b8', 5, 'text'),
  (121, 'Yesterday Lesson', 'One thing yesterday taught you', '💡', '#e8a635', 5, 'text'),
  (122, 'Underrated Thing', 'Name something underrated that more people should know about', '💎', '#c95d8f', 5, 'text'),
  (123, 'Color Hunt', 'Find something red and photograph it', '🔴', '#d65a5a', 10, 'screenshot'),
  (124, 'Mind Dump', 'Write down whatever''s on your mind for 90 seconds', '🧠', '#9b80b8', 5, 'text'),
  (125, 'Best Recipe', 'Share a recipe you''ve made recently — even just the name', '👩‍🍳', '#d65a5a', 5, 'text'),
  (126, 'Theme Song', 'If you walked into work to a theme song, what would it be?', '🎵', '#9b80b8', 5, 'text'),
  (127, 'Two Truths One Lie', 'Share 2 true things and 1 lie about yourself — we''ll guess', '🎲', '#4a7a9e', 5, 'text'),
  (128, 'Work Haiku', 'Write a haiku (5-7-5) about your job today', '📝', '#9b80b8', 5, 'text'),
  (129, 'Best Purchase', 'Best thing you''ve bought under ₱500 recently', '🛍️', '#c95d8f', 5, 'text'),
  (130, 'Gratitude Drop', 'One thing you''re grateful for today', '🙏', '#c95d8f', 5, 'text'),
  (131, 'Tomorrow''s Goal', 'One small thing you want to do tomorrow', '🎯', '#d97435', 5, 'text'),
  (132, 'Screen Time', 'What''s on your screen right now? (work-friendly part)', '🖥️', '#4ba3a3', 10, 'screenshot'),
  (133, 'Comfort Food', 'What''s your comfort food and why?', '🍲', '#d97435', 5, 'text'),
  (134, 'Sunset/Sunrise', 'Catch the sky during golden hour today', '🌇', '#d97435', 10, 'screenshot'),
  (135, 'Help Offer', 'Offer to help a teammate with something today', '🤝', '#7a9568', 5, 'text'),
  (136, 'Tiny Joy', 'Share one tiny thing that consistently brings you joy', '💛', '#e8a635', 5, 'text'),
  (137, 'Five Things', 'Group together 5 small items and photograph them', '5️⃣', '#9b80b8', 10, 'screenshot'),
  (138, 'One Good Thing', 'What was the best part of your day so far?', '🌟', '#e8a635', 5, 'text'),
  (139, 'Behind You', 'Photo of what''s directly behind you right now', '🔄', '#7a9568', 10, 'screenshot'),
  (140, 'Color Hunt', 'Find something yellow and photograph it', '🟡', '#e8a635', 10, 'screenshot'),
  (141, 'Self-Kindness', 'Say one nice thing to YOURSELF today. Share it', '💖', '#c95d8f', 5, 'text'),
  (142, 'Reflection', 'Photograph your reflection in something other than a mirror', '✨', '#c95d8f', 10, 'screenshot'),
  (143, 'Hidden Gem App', 'An app you love that not enough people know about', '📱', '#9b80b8', 5, 'text'),
  (144, 'Treat Yourself', 'What''s your little treat today? (food, drink, candy)', '🍫', '#d65a5a', 10, 'screenshot'),
  (145, 'Sky Check', 'Photo of the sky from where you are right now', '☁️', '#4ba3a3', 10, 'screenshot'),
  (146, 'Future Self', 'One thing future-you will thank present-you for', '🔮', '#9b80b8', 5, 'text'),
  (147, 'Dream Vacation', 'Where would you go tomorrow if money was no object?', '✈️', '#4ba3a3', 5, 'text'),
  (148, 'Snack Attack', 'What are you snacking on today?', '🍿', '#d97435', 10, 'screenshot'),
  (149, 'Window Time', 'Open a window or step outside for 2 minutes', '🌤️', '#e8a635', 5, 'text'),
  (150, 'Hands at Work', 'A quick pic of your hands on the keyboard, holding something, anything', '✋', '#c95d8f', 10, 'screenshot'),
  (151, 'Random Object', 'Pick the closest random object and photograph it', '🎲', '#d65a5a', 10, 'screenshot'),
  (152, 'Comfort Show', 'Your go-to comfort show or movie', '🎬', '#a07050', 5, 'text'),
  (153, 'Bad Joke', 'Tell us the worst joke you know', '🤣', '#e8a635', 5, 'text'),
  (154, 'Plant Friend', 'Show us a plant in your home or one you walked past today', '🌱', '#7a9568', 10, 'screenshot'),
  (155, 'Wrist Stretch', 'Stretch your wrists. Roll your shoulders. Done!', '🤲', '#c95d8f', 5, 'text'),
  (156, 'Six Word Story', 'Tell us a story in exactly 6 words', '📖', '#c95d8f', 5, 'text'),
  (157, 'Gratitude Pause', 'Name 3 things you''re thankful for right now', '🙏', '#c95d8f', 5, 'text'),
  (158, 'Skill Wishlist', 'A skill you wish you had', '✨', '#9b80b8', 5, 'text'),
  (159, 'WFH Hack', 'Share one trick that makes WFH life better', '🏠', '#4a7a9e', 5, 'text'),
  (160, 'Comfort Drink', 'Your go-to drink when you need a pick-me-up', '🥤', '#d65a5a', 5, 'text'),
  (161, 'Tab Cleanup', 'Close 5 tabs you don''t actually need', '🗂️', '#9b80b8', 5, 'text'),
  (162, 'Feet Check', 'Show us your feet — barefoot, sock, slipper, shoe — anything', '👟', '#a07050', 10, 'screenshot'),
  (163, 'Compliment Drop', 'Compliment someone in your life today. Tell us how it went', '🌷', '#d65a5a', 5, 'text'),
  (164, 'Out the Window', 'Quick shot of what''s outside your nearest window', '🪟', '#e8a635', 10, 'screenshot'),
  (165, 'Today''s Look', 'What are you wearing? Just a quick OOTD shot (no faces needed)', '👕', '#4a7a9e', 10, 'screenshot'),
  (166, 'Headphones On', 'Show your current headphones, earbuds, or whatever you''re listening on', '🎧', '#9b80b8', 10, 'screenshot'),
  (167, 'Made Me Smile', 'What made you smile today?', '😊', '#e8a635', 5, 'text'),
  (168, 'Random Fact', 'Share a random fact you''ve memorized', '🧠', '#4a7a9e', 5, 'text'),
  (169, 'Currently Reading', 'What are you reading or watching right now?', '📺', '#7a9568', 5, 'text'),
  (170, 'Childhood Show', 'TV show or cartoon you loved as a kid', '📺', '#9b80b8', 5, 'text'),
  (171, 'Song of Today', 'What song are you playing on repeat lately?', '🎵', '#9b80b8', 5, 'text'),
  (172, 'Three Words', 'Describe today in exactly 3 words', '3️⃣', '#4a7a9e', 5, 'text'),
  (173, 'No-Phone Minute', 'Put your phone face-down for 1 minute. Resist!', '📵', '#d65a5a', 5, 'text'),
  (174, 'Best Snack', 'What''s the best snack in your kitchen right now?', '🍪', '#d97435', 5, 'text'),
  (175, 'Stretch Break', 'Stand up and stretch for 60 seconds. Done? Drop a ''done!'' below', '🧘', '#7a9568', 5, 'text'),
  (176, 'Outside Time', 'Step outside for 5 minutes. Bonus: in sunlight', '☀️', '#e8a635', 5, 'text'),
  (177, 'Above You', 'Photo looking straight up', '⬆️', '#4ba3a3', 10, 'screenshot'),
  (178, 'Current Earworm', 'What song is stuck in your head right now?', '🎶', '#c95d8f', 5, 'text'),
  (179, 'Workspace Reveal', 'Show us your workspace right now — no cleanup allowed 👀', '💻', '#4a7a9e', 10, 'screenshot'),
  (180, 'Limerick Time', 'Write a quick limerick about anything', '🎭', '#c95d8f', 5, 'text'),
  (181, 'Pay It Forward', 'Do one small unprompted kind act today. Tell us what', '✨', '#e8a635', 5, 'text'),
  (182, 'Pet Peeve', 'One harmless pet peeve you have', '🤨', '#d65a5a', 5, 'text'),
  (183, 'Tiny Win', 'Share a small win from this week', '🏆', '#d97435', 5, 'text'),
  (184, 'Local Recommendation', 'Recommend a local spot near you (cafe, restaurant, etc.)', '📍', '#d97435', 5, 'text'),
  (185, 'Random Memory', 'Share a random childhood memory that popped into your head', '👶', '#a07050', 5, 'text'),
  (186, 'Outdoor Walk', 'If you stepped outside today, share one photo from your walk', '🚶', '#7a9568', 10, 'screenshot'),
  (187, 'Quick Doodle', 'Doodle anything for 60 seconds. Photograph the result', '✏️', '#a07050', 10, 'screenshot'),
  (188, 'Podcast Pick', 'Recommend a podcast you''ve been into', '🎙️', '#a07050', 5, 'text'),
  (189, 'Morning Brew', 'What''s in your cup today? ☕', '☕', '#a07050', 10, 'screenshot'),
  (190, 'Stand Up', 'Stand and walk for 3 minutes — anywhere', '🚶', '#7a9568', 5, 'text'),
  (191, 'Pocket Contents', 'Pull out what''s in your pocket/bag right now and photograph', '👜', '#a07050', 10, 'screenshot'),
  (192, 'Eye Rest', 'Look at something 20ft away for 20 seconds. Confirm done!', '👀', '#4a7a9e', 5, 'text'),
  (193, 'Today''s Soundtrack', 'If your day had a soundtrack, what song?', '🎵', '#4ba3a3', 5, 'text'),
  (194, 'Thank a Helper', 'Thank someone who helped you recently — anyone in life', '🙏', '#9b80b8', 5, 'text'),
  (195, 'Best Concert', 'Best live show you''ve ever been to?', '🎤', '#d65a5a', 5, 'text'),
  (196, 'Favorite Quote', 'Share a quote that''s been living in your head', '💬', '#a07050', 5, 'text'),
  (197, 'Mug Shot', 'The mug you''re using today (work-safe!)', '☕', '#9b80b8', 10, 'screenshot'),
  (198, 'Snack Time', 'Eat something with actual nutrients (fruit, nuts, etc)', '🍎', '#d65a5a', 10, 'screenshot'),
  (199, 'Movie Pick', 'What''s the last movie or show you actually finished?', '🎬', '#4ba3a3', 5, 'text'),
  (200, 'Mirror Selfie', 'Take a quick mirror selfie (face optional!)', '🪞', '#c95d8f', 10, 'screenshot'),
  (201, 'Send Kudos', 'Send a teammate a thank you (in chat or in person). Tell us who', '💌', '#c95d8f', 5, 'text'),
  (202, 'Floor Tile', 'Photo of the floor beneath your feet right now', '🟦', '#9b80b8', 10, 'screenshot'),
  (203, 'Book Nearby', 'Any book within arm''s reach? Show us', '📚', '#a07050', 10, 'screenshot'),
  (204, 'Pet Coworker', 'If you''ve got a pet, show us what they''re up to', '🐾', '#c95d8f', 10, 'screenshot'),
  (205, 'Lunch Spot', 'Photo of what you ate or where you ate today', '🍱', '#e8a635', 10, 'screenshot'),
  (206, 'Best Compliment', 'Best compliment you''ve ever received?', '💛', '#e8a635', 5, 'text'),
  (207, 'Hydrate Now', 'Drink a full glass of water right now — share a pic of your glass', '💧', '#4ba3a3', 10, 'screenshot'),
  (208, 'Movie Tagline', 'Sum up your life right now as a movie tagline', '🎬', '#d97435', 5, 'text'),
  (209, 'Color Hunt', 'Find something green and photograph it', '🟢', '#7a9568', 10, 'screenshot'),
  (210, 'Time Travel', 'If you could revisit any year for one day, which?', '⏳', '#4a7a9e', 5, 'text'),
  (211, 'Recent Joy', 'Last thing that genuinely made you laugh out loud', '😂', '#e8a635', 5, 'text'),
  (212, 'Hometown Fact', 'Share one cool fact about your hometown', '🏘️', '#7a9568', 5, 'text'),
  (213, 'First Job', 'Tell us about your first ever job', '💼', '#4a7a9e', 5, 'text'),
  (214, 'Posture Check', 'Sit up straight. Adjust your screen height. Done?', '💺', '#4a7a9e', 5, 'text'),
  (215, 'Made-Up Word', 'Invent a new word and define it', '🔤', '#4a7a9e', 5, 'text'),
  (216, 'If You Were', 'If you were a kitchen utensil, which one and why?', '🥄', '#e8a635', 5, 'text'),
  (217, 'Deep Breaths', 'Take 5 deep breaths. Count them out. Done? Tell us!', '🌬️', '#4ba3a3', 5, 'text'),
  (218, 'Quick Tidy', 'Clean ONE small thing on your desk', '🧹', '#a07050', 10, 'screenshot'),
  (219, 'Random Wikipedia', 'Hit Wikipedia random — what''d you land on?', '📜', '#a07050', 5, 'text'),
  (220, 'Pattern Spot', 'Find an interesting pattern around you and capture it', '🔷', '#4ba3a3', 10, 'screenshot'),
  (221, 'Notebook Page', 'Show us a page of your notes or planner (any redactions OK)', '📓', '#a07050', 10, 'screenshot'),
  (222, 'Today''s Vibe', 'One photo that captures your mood today', '💫', '#c95d8f', 10, 'screenshot'),
  (223, 'Door View', 'Photo of the door you walk through most', '🚪', '#4a7a9e', 10, 'screenshot'),
  (224, 'Hidden Talent 2', 'Something small you can do that surprises people', '🎩', '#c95d8f', 5, 'text'),
  (225, 'Random Check-in', 'Message a friend you haven''t talked to in 2+ weeks', '👋', '#e8a635', 5, 'text'),
  (226, 'Recommended Book', 'A book you''d recommend to anyone', '📖', '#7a9568', 5, 'text'),
  (227, 'Mirror Selfie', 'Take a quick mirror selfie (face optional!)', '🪞', '#c95d8f', 10, 'screenshot'),
  (228, 'Gratitude Drop', 'One thing you''re grateful for today', '🙏', '#c95d8f', 5, 'text'),
  (229, 'Snack Time', 'Eat something with actual nutrients (fruit, nuts, etc)', '🍎', '#d65a5a', 10, 'screenshot'),
  (230, 'Dream Vacation', 'Where would you go tomorrow if money was no object?', '✈️', '#4ba3a3', 5, 'text'),
  (231, 'Favorite Quote', 'Share a quote that''s been living in your head', '💬', '#a07050', 5, 'text'),
  (232, 'Lunch Spot', 'Photo of what you ate or where you ate today', '🍱', '#e8a635', 10, 'screenshot'),
  (233, 'Today''s Vibe', 'One photo that captures your mood today', '💫', '#c95d8f', 10, 'screenshot'),
  (234, 'Recommended Book', 'A book you''d recommend to anyone', '📖', '#7a9568', 5, 'text'),
  (235, 'View From Here', 'Snap a photo from your current window or view', '🌅', '#e8a635', 10, 'screenshot'),
  (236, 'Childhood Show', 'TV show or cartoon you loved as a kid', '📺', '#9b80b8', 5, 'text'),
  (237, 'Work Haiku', 'Write a haiku (5-7-5) about your job today', '📝', '#9b80b8', 5, 'text'),
  (238, 'Bad Joke', 'Tell us the worst joke you know', '🤣', '#e8a635', 5, 'text'),
  (239, 'Comfort Food', 'What''s your comfort food and why?', '🍲', '#d97435', 5, 'text'),
  (240, 'Book Nearby', 'Any book within arm''s reach? Show us', '📚', '#a07050', 10, 'screenshot'),
  (241, 'Today''s Word', 'Sum up today in one word', '📝', '#9b80b8', 5, 'text'),
  (242, 'Made Me Smile', 'What made you smile today?', '😊', '#e8a635', 5, 'text'),
  (243, 'Floor Tile', 'Photo of the floor beneath your feet right now', '🟦', '#9b80b8', 10, 'screenshot'),
  (244, 'If You Were', 'If you were a kitchen utensil, which one and why?', '🥄', '#e8a635', 5, 'text'),
  (245, 'Pocket Contents', 'Pull out what''s in your pocket/bag right now and photograph', '👜', '#a07050', 10, 'screenshot'),
  (246, 'Morning Brew', 'What''s in your cup today? ☕', '☕', '#a07050', 10, 'screenshot'),
  (247, 'Eye Rest', 'Look at something 20ft away for 20 seconds. Confirm done!', '👀', '#4a7a9e', 5, 'text'),
  (248, 'Game Pick', 'Recommend a game (video game, board, mobile, anything)', '🎮', '#9b80b8', 5, 'text'),
  (249, 'Mind Dump', 'Write down whatever''s on your mind for 90 seconds', '🧠', '#9b80b8', 5, 'text'),
  (250, 'Hidden Talent 2', 'Something small you can do that surprises people', '🎩', '#c95d8f', 5, 'text'),
  (251, 'Time Travel', 'If you could revisit any year for one day, which?', '⏳', '#4a7a9e', 5, 'text'),
  (252, 'Current Earworm', 'What song is stuck in your head right now?', '🎶', '#c95d8f', 5, 'text'),
  (253, 'Behind You', 'Photo of what''s directly behind you right now', '🔄', '#7a9568', 10, 'screenshot'),
  (254, 'Stretch Break', 'Stand up and stretch for 60 seconds. Done? Drop a ''done!'' below', '🧘', '#7a9568', 5, 'text'),
  (255, 'Three Words', 'Describe today in exactly 3 words', '3️⃣', '#4a7a9e', 5, 'text'),
  (256, 'Comfort Drink', 'Your go-to drink when you need a pick-me-up', '🥤', '#d65a5a', 5, 'text'),
  (257, 'Above You', 'Photo looking straight up', '⬆️', '#4ba3a3', 10, 'screenshot'),
  (258, 'Random Wikipedia', 'Hit Wikipedia random — what''d you land on?', '📜', '#a07050', 5, 'text'),
  (259, 'Door View', 'Photo of the door you walk through most', '🚪', '#4a7a9e', 10, 'screenshot'),
  (260, 'Tiny Joy', 'Share one tiny thing that consistently brings you joy', '💛', '#e8a635', 5, 'text'),
  (261, 'WFH Hack', 'Share one trick that makes WFH life better', '🏠', '#4a7a9e', 5, 'text'),
  (262, 'Tiny Win', 'Share a small win from this week', '🏆', '#d97435', 5, 'text'),
  (263, 'Best Concert', 'Best live show you''ve ever been to?', '🎤', '#d65a5a', 5, 'text'),
  (264, 'Hidden Gem App', 'An app you love that not enough people know about', '📱', '#9b80b8', 5, 'text'),
  (265, 'Compliment Drop', 'Compliment someone in your life today. Tell us how it went', '🌷', '#d65a5a', 5, 'text'),
  (266, 'Skill Wishlist', 'A skill you wish you had', '✨', '#9b80b8', 5, 'text'),
  (267, 'Color Hunt', 'Find something red and photograph it', '🔴', '#d65a5a', 10, 'screenshot'),
  (268, 'Tab Cleanup', 'Close 5 tabs you don''t actually need', '🗂️', '#9b80b8', 5, 'text'),
  (269, 'Movie Pick', 'What''s the last movie or show you actually finished?', '🎬', '#4ba3a3', 5, 'text'),
  (270, 'Quick Tidy', 'Clean ONE small thing on your desk', '🧹', '#a07050', 10, 'screenshot'),
  (271, 'Color Hunt', 'Find something blue and photograph it', '🔵', '#4a7a9e', 10, 'screenshot'),
  (272, 'Feet Check', 'Show us your feet — barefoot, sock, slipper, shoe — anything', '👟', '#a07050', 10, 'screenshot'),
  (273, 'Currently Reading', 'What are you reading or watching right now?', '📺', '#7a9568', 5, 'text'),
  (274, 'Snack Attack', 'What are you snacking on today?', '🍿', '#d97435', 10, 'screenshot'),
  (275, 'Limerick Time', 'Write a quick limerick about anything', '🎭', '#c95d8f', 5, 'text'),
  (276, 'Outdoor Walk', 'If you stepped outside today, share one photo from your walk', '🚶', '#7a9568', 10, 'screenshot'),
  (277, 'Yesterday Lesson', 'One thing yesterday taught you', '💡', '#e8a635', 5, 'text'),
  (278, 'Hands at Work', 'A quick pic of your hands on the keyboard, holding something, anything', '✋', '#c95d8f', 10, 'screenshot'),
  (279, 'Outside Time', 'Step outside for 5 minutes. Bonus: in sunlight', '☀️', '#e8a635', 5, 'text'),
  (280, 'Best Compliment', 'Best compliment you''ve ever received?', '💛', '#e8a635', 5, 'text'),
  (281, 'Hometown Fact', 'Share one cool fact about your hometown', '🏘️', '#7a9568', 5, 'text'),
  (282, 'Praise Specific', 'Tell a teammate exactly what they did well recently', '🌟', '#4ba3a3', 5, 'text'),
  (283, 'Posture Check', 'Sit up straight. Adjust your screen height. Done?', '💺', '#4a7a9e', 5, 'text'),
  (284, 'Two Truths One Lie', 'Share 2 true things and 1 lie about yourself — we''ll guess', '🎲', '#4a7a9e', 5, 'text'),
  (285, 'Quick Doodle', 'Doodle anything for 60 seconds. Photograph the result', '✏️', '#a07050', 10, 'screenshot'),
  (286, 'Gratitude Pause', 'Name 3 things you''re thankful for right now', '🙏', '#c95d8f', 5, 'text'),
  (287, 'Random Check-in', 'Message a friend you haven''t talked to in 2+ weeks', '👋', '#e8a635', 5, 'text'),
  (288, 'Random Object', 'Pick the closest random object and photograph it', '🎲', '#d65a5a', 10, 'screenshot'),
  (289, 'Made-Up Word', 'Invent a new word and define it', '🔤', '#4a7a9e', 5, 'text'),
  (290, 'Local Recommendation', 'Recommend a local spot near you (cafe, restaurant, etc.)', '📍', '#d97435', 5, 'text'),
  (291, 'Out the Window', 'Quick shot of what''s outside your nearest window', '🪟', '#e8a635', 10, 'screenshot'),
  (292, 'Movie Tagline', 'Sum up your life right now as a movie tagline', '🎬', '#d97435', 5, 'text'),
  (293, 'Notebook Page', 'Show us a page of your notes or planner (any redactions OK)', '📓', '#a07050', 10, 'screenshot'),
  (294, 'Comfort Show', 'Your go-to comfort show or movie', '🎬', '#a07050', 5, 'text'),
  (295, 'Deep Breaths', 'Take 5 deep breaths. Count them out. Done? Tell us!', '🌬️', '#4ba3a3', 5, 'text'),
  (296, 'Stand Up', 'Stand and walk for 3 minutes — anywhere', '🚶', '#7a9568', 5, 'text'),
  (297, 'Best Purchase', 'Best thing you''ve bought under ₱500 recently', '🛍️', '#c95d8f', 5, 'text'),
  (298, 'Song of Today', 'What song are you playing on repeat lately?', '🎵', '#9b80b8', 5, 'text'),
  (299, 'Screen Time', 'What''s on your screen right now? (work-friendly part)', '🖥️', '#4ba3a3', 10, 'screenshot'),
  (300, 'Random Memory', 'Share a random childhood memory that popped into your head', '👶', '#a07050', 5, 'text'),
  (301, 'Recent Joy', 'Last thing that genuinely made you laugh out loud', '😂', '#e8a635', 5, 'text'),
  (302, 'Six Word Story', 'Tell us a story in exactly 6 words', '📖', '#c95d8f', 5, 'text'),
  (303, 'Help Offer', 'Offer to help a teammate with something today', '🤝', '#7a9568', 5, 'text'),
  (304, 'Pet Coworker', 'If you''ve got a pet, show us what they''re up to', '🐾', '#c95d8f', 10, 'screenshot'),
  (305, 'Today''s Soundtrack', 'If your day had a soundtrack, what song?', '🎵', '#4ba3a3', 5, 'text'),
  (306, 'Pay It Forward', 'Do one small unprompted kind act today. Tell us what', '✨', '#e8a635', 5, 'text'),
  (307, 'First Job', 'Tell us about your first ever job', '💼', '#4a7a9e', 5, 'text'),
  (308, 'Hidden Talent', 'What''s something small you''re secretly good at?', '🎩', '#9b80b8', 5, 'text'),
  (309, 'Pet Peeve', 'One harmless pet peeve you have', '🤨', '#d65a5a', 5, 'text'),
  (310, 'Thank a Helper', 'Thank someone who helped you recently — anyone in life', '🙏', '#9b80b8', 5, 'text'),
  (311, 'Headphones On', 'Show your current headphones, earbuds, or whatever you''re listening on', '🎧', '#9b80b8', 10, 'screenshot'),
  (312, 'Treat Yourself', 'What''s your little treat today? (food, drink, candy)', '🍫', '#d65a5a', 10, 'screenshot'),
  (313, 'Underrated Thing', 'Name something underrated that more people should know about', '💎', '#c95d8f', 5, 'text'),
  (314, 'Podcast Pick', 'Recommend a podcast you''ve been into', '🎙️', '#a07050', 5, 'text'),
  (315, 'Pattern Spot', 'Find an interesting pattern around you and capture it', '🔷', '#4ba3a3', 10, 'screenshot'),
  (316, 'Tomorrow''s Goal', 'One small thing you want to do tomorrow', '🎯', '#d97435', 5, 'text'),
  (317, 'Productivity Hack', 'Share a small productivity trick that works for you', '⚡', '#e8a635', 5, 'text'),
  (318, 'No-Phone Minute', 'Put your phone face-down for 1 minute. Resist!', '📵', '#d65a5a', 5, 'text'),
  (319, 'Best Recipe', 'Share a recipe you''ve made recently — even just the name', '👩‍🍳', '#d65a5a', 5, 'text'),
  (320, 'Sunset/Sunrise', 'Catch the sky during golden hour today', '🌇', '#d97435', 10, 'screenshot'),
  (321, 'Window Time', 'Open a window or step outside for 2 minutes', '🌤️', '#e8a635', 5, 'text'),
  (322, 'Color Hunt', 'Find something yellow and photograph it', '🟡', '#e8a635', 10, 'screenshot'),
  (323, 'Random Fact', 'Share a random fact you''ve memorized', '🧠', '#4a7a9e', 5, 'text'),
  (324, 'Self-Kindness', 'Say one nice thing to YOURSELF today. Share it', '💖', '#c95d8f', 5, 'text'),
  (325, 'One Good Thing', 'What was the best part of your day so far?', '🌟', '#e8a635', 5, 'text'),
  (326, 'Reflection', 'Photograph your reflection in something other than a mirror', '✨', '#c95d8f', 10, 'screenshot'),
  (327, 'Hydrate Now', 'Drink a full glass of water right now — share a pic of your glass', '💧', '#4ba3a3', 10, 'screenshot'),
  (328, 'Theme Song', 'If you walked into work to a theme song, what would it be?', '🎵', '#9b80b8', 5, 'text'),
  (329, 'Future Self', 'One thing future-you will thank present-you for', '🔮', '#9b80b8', 5, 'text'),
  (330, 'Sky Check', 'Photo of the sky from where you are right now', '☁️', '#4ba3a3', 10, 'screenshot'),
  (331, 'Mug Shot', 'The mug you''re using today (work-safe!)', '☕', '#9b80b8', 10, 'screenshot'),
  (332, 'Five Things', 'Group together 5 small items and photograph them', '5️⃣', '#9b80b8', 10, 'screenshot'),
  (333, 'Plant Friend', 'Show us a plant in your home or one you walked past today', '🌱', '#7a9568', 10, 'screenshot'),
  (334, 'Send Kudos', 'Send a teammate a thank you (in chat or in person). Tell us who', '💌', '#c95d8f', 5, 'text'),
  (335, 'Best Snack', 'What''s the best snack in your kitchen right now?', '🍪', '#d97435', 5, 'text'),
  (336, 'Today''s Look', 'What are you wearing? Just a quick OOTD shot (no faces needed)', '👕', '#4a7a9e', 10, 'screenshot'),
  (337, 'Workspace Reveal', 'Show us your workspace right now — no cleanup allowed 👀', '💻', '#4a7a9e', 10, 'screenshot'),
  (338, 'Color Hunt', 'Find something green and photograph it', '🟢', '#7a9568', 10, 'screenshot'),
  (339, 'Wrist Stretch', 'Stretch your wrists. Roll your shoulders. Done!', '🤲', '#c95d8f', 5, 'text'),
  (340, 'Window Time', 'Open a window or step outside for 2 minutes', '🌤️', '#e8a635', 5, 'text'),
  (341, 'Above You', 'Photo looking straight up', '⬆️', '#4ba3a3', 10, 'screenshot'),
  (342, 'Out the Window', 'Quick shot of what''s outside your nearest window', '🪟', '#e8a635', 10, 'screenshot'),
  (343, 'Tomorrow''s Goal', 'One small thing you want to do tomorrow', '🎯', '#d97435', 5, 'text'),
  (344, 'Favorite Quote', 'Share a quote that''s been living in your head', '💬', '#a07050', 5, 'text'),
  (345, 'Currently Reading', 'What are you reading or watching right now?', '📺', '#7a9568', 5, 'text'),
  (346, 'Pet Peeve', 'One harmless pet peeve you have', '🤨', '#d65a5a', 5, 'text'),
  (347, 'Work Haiku', 'Write a haiku (5-7-5) about your job today', '📝', '#9b80b8', 5, 'text'),
  (348, 'Praise Specific', 'Tell a teammate exactly what they did well recently', '🌟', '#4ba3a3', 5, 'text'),
  (349, 'If You Were', 'If you were a kitchen utensil, which one and why?', '🥄', '#e8a635', 5, 'text'),
  (350, 'Tiny Win', 'Share a small win from this week', '🏆', '#d97435', 5, 'text'),
  (351, 'Podcast Pick', 'Recommend a podcast you''ve been into', '🎙️', '#a07050', 5, 'text'),
  (352, 'Lunch Spot', 'Photo of what you ate or where you ate today', '🍱', '#e8a635', 10, 'screenshot'),
  (353, 'Compliment Drop', 'Compliment someone in your life today. Tell us how it went', '🌷', '#d65a5a', 5, 'text'),
  (354, 'Color Hunt', 'Find something red and photograph it', '🔴', '#d65a5a', 10, 'screenshot'),
  (355, 'Treat Yourself', 'What''s your little treat today? (food, drink, candy)', '🍫', '#d65a5a', 10, 'screenshot'),
  (356, 'Color Hunt', 'Find something green and photograph it', '🟢', '#7a9568', 10, 'screenshot'),
  (357, 'Best Compliment', 'Best compliment you''ve ever received?', '💛', '#e8a635', 5, 'text'),
  (358, 'Book Nearby', 'Any book within arm''s reach? Show us', '📚', '#a07050', 10, 'screenshot'),
  (359, 'Quick Doodle', 'Doodle anything for 60 seconds. Photograph the result', '✏️', '#a07050', 10, 'screenshot'),
  (360, 'No-Phone Minute', 'Put your phone face-down for 1 minute. Resist!', '📵', '#d65a5a', 5, 'text'),
  (361, 'Five Things', 'Group together 5 small items and photograph them', '5️⃣', '#9b80b8', 10, 'screenshot'),
  (362, 'Sky Check', 'Photo of the sky from where you are right now', '☁️', '#4ba3a3', 10, 'screenshot'),
  (363, 'Game Pick', 'Recommend a game (video game, board, mobile, anything)', '🎮', '#9b80b8', 5, 'text'),
  (364, 'First Job', 'Tell us about your first ever job', '💼', '#4a7a9e', 5, 'text'),
  (365, 'Current Earworm', 'What song is stuck in your head right now?', '🎶', '#c95d8f', 5, 'text'),
  (366, 'Tiny Joy', 'Share one tiny thing that consistently brings you joy', '💛', '#e8a635', 5, 'text');


-- ============ SEED: Starter Bingo Board (for January launch) ============
-- Admin can edit/replace this anytime. Inactive by default — flip is_active when ready.

do $$
declare
  new_event_id uuid;
begin
  insert into public.bingo_events (title, description, start_date, end_date, is_active, cover_color, cover_emoji)
  values (
    '5-Day Bingo Week: New Year, New Us',
    'Mon–Fri kickoff for 2027. Mark squares by submitting proof. 5-in-a-row wins a small prize. Full Blackout wins the grand prize.',
    '2027-01-05', '2027-01-09', false, '#d97435', '🎯'
  )
  returning id into new_event_id;

  insert into public.bingo_squares (event_id, position, label, prompt, points) values
    (new_event_id, 0,  'Desk Yoga',           'Do a 5-minute yoga stretch at your desk — share a 5s video or photo of your mat', 5),
    (new_event_id, 1,  'Hydration Hero',      'Drink 4 glasses of water today. Photo of your last empty glass', 5),
    (new_event_id, 2,  'Morning Sunlight',    'Get outdoor sunlight for 10 min — photo of the sky or your shoes outside', 5),
    (new_event_id, 3,  'No Phone Lunch',      'Eat lunch without your phone. Tell us what you noticed', 5),
    (new_event_id, 4,  'Send Kudos',          'Send a thank-you kudos to a teammate. Screenshot the message', 5),
    (new_event_id, 5,  'Cook Something New',  'Try a new recipe or dish — photo of the result', 5),
    (new_event_id, 6,  'Walk Break',          '15-min walk break. Share a photo from your walk', 5),
    (new_event_id, 7,  'Tidy One Thing',      'Clean/organize ONE small area in your space. Before & after pic', 5),
    (new_event_id, 8,  'Read a Page',         'Read at least 5 pages of a book (any). Photo of the book', 5),
    (new_event_id, 9,  'Stretch Break',       'Take 3 stretch breaks today. Share a quick description', 5),
    (new_event_id, 10, 'Compliment Friend',   'Compliment someone outside work today. Share how it went', 5),
    (new_event_id, 11, 'Try a New App',       'Discover a new useful app/tool. Share what you found', 5),
    (new_event_id, 12, 'FREE',                'Free square! Auto-marked when bingo starts', 0),
    (new_event_id, 13, 'Plan Tomorrow',       'Write tomorrow''s top 3 priorities. Photo of your list', 5),
    (new_event_id, 14, 'Healthy Snack',       'Eat a healthy snack instead of junk. Photo of it', 5),
    (new_event_id, 15, 'Early Sleep',         'Get to bed before 11pm. Just confirm done', 5),
    (new_event_id, 16, 'Learn a Word',        'Learn one new word in any language. Share it', 5),
    (new_event_id, 17, 'Family Hello',        'Send a "thinking of you" to a family member. Share their response if cute', 5),
    (new_event_id, 18, 'Mindful Minute',      'Sit silently for 1 minute. No phone, no screen. Confirm done', 5),
    (new_event_id, 19, 'Workspace Refresh',   'Refresh your workspace — new plant, new layout, anything. Photo!', 5),
    (new_event_id, 20, 'Help Someone',        'Help a teammate with something they''re stuck on. Share what', 5),
    (new_event_id, 21, 'Listen to New Song',  'Listen to a song from a genre you don''t usually pick. Share title', 5),
    (new_event_id, 22, 'Note to Self',        'Write a kind note to yourself. Photo or text', 5),
    (new_event_id, 23, 'Step Goal',           'Hit 5,000 steps today. Share screenshot of step counter', 5),
    (new_event_id, 24, 'Bingo Boast',         'You finished! Share what you''re most proud of from this week', 5);
end$$;

