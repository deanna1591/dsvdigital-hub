-- =====================================================
-- Migration 007: Initial seed data (idempotent)
--
-- Populates:
--   - 12 point categories matching the team's Google Sheet matrix
--   - 50 daily sparks (curated micro-activities, spread across the year)
--   - 8 catalog items (Grab, ShopeePay, swag, etc)
--   - 5 starter missions
--   - 1 active bingo board for current week (June 2026 Hump Day Edition)
--     + 25 squares
--
-- Safe to re-run — uses ON CONFLICT DO NOTHING throughout.
-- =====================================================

-- ============ POINT CATEGORIES (12) ============
-- Matches your existing sheet matrix.

insert into public.point_categories (id, name, default_points, description, max_per_year, is_active) values
  ('internal_checkin',     'Internal Check-In',        5,   'Joining the weekly internal team check-in',                    null, true),
  ('kickoff_meeting',      'Kick-Off Meeting',         5,   'Participating in a project kick-off meeting',                  null, true),
  ('commendation_client',  'Commendation from Client', 20,  'A client explicitly praised your work',                        12, true),
  ('peer_to_peer',         'Peer-to-Peer Recognition', 5,   'A teammate recognized something you did',                      10, true),
  ('staff_anniversary',    'Staff Anniversary',        100, 'Annual work anniversary at DSV',                               null, true),
  ('innovative_ideas',     'Innovative Ideas',         5,   'You suggested a new process / tool / improvement we adopted',  10, true),
  ('employee_referral',    'Employee Referral',        10,  'You referred a teammate who got hired',                        12, true),
  ('company_review',       'Company Review',           60,  'You wrote a public review (Glassdoor, Google, etc.)',          2, true),
  ('hubstaff_hotstreak',   'Hubstaff Hotstreak 40%+',  40,  'Maintained 40%+ activity score for the full month',            null, true),
  ('mandatory_leave_5day', '5-Day Mandatory Leave',    100, 'You took your annual 5-day mandatory leave',                   1, true),
  ('monthly_attendance',   'Monthly Attendance',       30,  'Zero unplanned absences for the month',                        null, true),
  ('birthday',             'Birthday',                 100, 'Annual birthday gift',                                         1, true)
on conflict (id) do nothing;

-- ============ DAILY SPARKS (50 curated) ============
-- One spark per day_of_year. We seed days 1-50 with a rotation of themes.
-- Categories: creative, mindful, move, connect, learn.
-- All sparks default to 10 points and screenshot proof.

insert into public.daily_sparks (day_of_year, title, prompt, emoji, color, points, proof_type) values
  -- Connect (warm openers)
  (1,  'Reach out to someone',       'Send a message to a teammate you haven''t talked to in 2+ weeks. Screenshot the convo (blur sensitive bits).', '💌', '#E6ABE1', 10, 'screenshot'),
  (2,  'Share a small win',          'Post one thing — work or life — you''re proud of from this week.',                                             '✨', '#E8B044', 10, 'text'),
  (3,  'Voice note check-in',        'Send a 30-sec voice note to a friend or family member just to say hi.',                                        '🎙️', '#F8D5F3', 10, 'text'),
  (4,  'Compliment a stranger',      'Give a genuine compliment to someone you don''t know. Restaurant staff, barista, anyone.',                     '😊', '#E8B044', 10, 'text'),
  (5,  'Thank a teammate',           'Write a 2-sentence thank-you to someone on the team. Screenshot or paste.',                                    '🙏', '#E6ABE1', 10, 'screenshot'),

  -- Mindful (breath, reflection)
  (6,  'Three deep breaths',         'Stop what you''re doing. Take 3 long deep breaths. Note how you feel in one word.',                            '🫁', '#F8D5F3', 10, 'text'),
  (7,  'Gratitude list',             'Write 3 things you''re grateful for right now. Big or small.',                                                 '📝', '#E6ABE1', 10, 'text'),
  (8,  'Phone-free meal',            'Eat one meal today with your phone in another room. Tell us what came up.',                                    '🍽️', '#E8B044', 10, 'text'),
  (9,  'Box breathing',              '4 sec in, 4 hold, 4 out, 4 hold. Repeat for 2 minutes.',                                                       '🧘', '#F8D5F3', 10, 'text'),
  (10, 'Sky check',                  'Look at the sky for 60 seconds. Take a photo.',                                                                '☁️', '#E6ABE1', 10, 'screenshot'),

  -- Move (low-friction movement)
  (11, 'Stretch break',              'Stand up and stretch for 90 seconds right now. No excuses.',                                                   '🤸', '#E8B044', 10, 'text'),
  (12, '15-min walk',                'Take a 15-minute walk outside. Phone in pocket. Photo of where you went.',                                     '🚶', '#5C8C5A', 10, 'screenshot'),
  (13, 'Posture check',              'Sit up straight for one hour. Set a timer.',                                                                   '💺', '#E6ABE1', 10, 'text'),
  (14, 'Take the stairs',            'Skip the elevator today, every floor. Brag about it.',                                                         '🪜', '#E8B044', 10, 'text'),
  (15, 'Dance break',                'Put on one song and dance like nobody''s watching. Video or just say yes.',                                    '💃', '#F8D5F3', 10, 'text'),

  -- Create (small acts of making)
  (16, 'Doodle anything',            'Spend 5 minutes doodling — anything. Photo of the result.',                                                    '✏️', '#E6ABE1', 10, 'screenshot'),
  (17, 'Cook something new',         'Make one thing you''ve never cooked before. Photo of the result.',                                             '🍳', '#E8B044', 10, 'screenshot'),
  (18, 'Take a sunset photo',        'Find the best sunset view today. Take a photo.',                                                               '🌇', '#F8D5F3', 10, 'screenshot'),
  (19, 'Rearrange your desk',        'Move things around. Take a before/after photo or just describe what changed.',                                 '🪴', '#5C8C5A', 10, 'screenshot'),
  (20, 'Write one paragraph',        'Write about your morning in one paragraph. Casual. Send it to us.',                                            '✍️', '#E6ABE1', 10, 'text'),

  -- Learn (curiosity)
  (21, 'Read 10 mins',               'Read anything that''s not work for 10 mins. What did you read?',                                               '📚', '#E8B044', 10, 'text'),
  (22, 'Watch a TED talk',           'Find a TED talk under 15 mins. Watch it. One sentence about what you learned.',                                '🎬', '#F8D5F3', 10, 'text'),
  (23, 'Learn a word',               'Find one new word today and use it in a sentence.',                                                            '📖', '#E6ABE1', 10, 'text'),
  (24, 'Listen to a podcast',        'Pick a 20-min podcast on a topic you know nothing about.',                                                     '🎧', '#925F3A', 10, 'text'),
  (25, 'Wikipedia rabbit hole',      'Pick a random article on Wikipedia and follow links for 10 mins. What did you end up at?',                    '🔍', '#E8B044', 10, 'text'),

  -- Connect (deeper)
  (26, 'Tell someone something',     'Tell someone you appreciate something specific about them. Voice note or text.',                               '❤️', '#F8D5F3', 10, 'text'),
  (27, 'Reach out to old friend',    'Message a friend you haven''t talked to in 6+ months.',                                                        '📞', '#E6ABE1', 10, 'text'),
  (28, 'Cross-team hello',           'Send a hi to someone on a different team. Just because.',                                                      '👋', '#E8B044', 10, 'screenshot'),
  (29, 'Compliment a teammate',      'Find one specific thing to praise in someone''s recent work. Tell them directly.',                             '⭐', '#F8D5F3', 10, 'text'),
  (30, 'Ask a thoughtful question',  'Ask someone a question that goes deeper than "how are you". Note what they said.',                             '💭', '#E6ABE1', 10, 'text'),

  -- Mindful (deeper reflection)
  (31, 'What''s draining you',       'Write down one thing in your life that drains your energy. Just notice it.',                                   '🌫️', '#925F3A', 10, 'text'),
  (32, 'Where do you feel it',       'Notice where stress lives in your body today. Shoulders? Jaw? Belly? Just observe.',                           '🧠', '#F8D5F3', 10, 'text'),
  (33, 'No-input hour',              'Spend 1 hour with no inputs — no music, podcast, video, phone. Notice the noise.',                             '🤫', '#E6ABE1', 10, 'text'),
  (34, 'Slow your morning',          'Take 50% more time on your morning routine. Notice the difference.',                                           '🌅', '#E8B044', 10, 'text'),
  (35, 'One mindful meal',           'Eat one meal slowly. Notice texture, flavor, temperature. Phone away.',                                        '🍴', '#F8D5F3', 10, 'text'),

  -- Create (more substantial)
  (36, 'Photo of something blue',    'Find something interesting that''s blue. Photo it.',                                                           '💙', '#E6ABE1', 10, 'screenshot'),
  (37, 'Make a playlist',            'Build a 30-min playlist for someone specific. Tell us the vibe.',                                              '🎵', '#E8B044', 10, 'text'),
  (38, 'Write a haiku',              '5-7-5. About anything. Share it.',                                                                             '🌸', '#F8D5F3', 10, 'text'),
  (39, 'Plant something',            'Plant a seed, a cutting, anything. Even a sprouting kalabasa.',                                                '🌱', '#5C8C5A', 10, 'screenshot'),
  (40, 'Write a recipe',             'Document one thing you cook from memory in proper recipe format.',                                             '📝', '#E6ABE1', 10, 'text'),

  -- Move (more variety)
  (41, '50 jumping jacks',           'Right now. 50 jumping jacks. Just send a confirmation.',                                                       '🤸‍♀️', '#E8B044', 10, 'text'),
  (42, 'Sun salutation',             'One round of sun salutation (or 5 mins of yoga).',                                                             '🧘‍♀️', '#F8D5F3', 10, 'text'),
  (43, 'Walking call',               'Take one phone call today while walking.',                                                                     '📞', '#E6ABE1', 10, 'text'),
  (44, 'Hydration check',            'Drink one full glass of water right now. And then another.',                                                   '💧', '#E8B044', 10, 'text'),
  (45, 'Run, even briefly',          'Run for 60 seconds. Doesn''t matter where. Just do it.',                                                       '🏃', '#5C8C5A', 10, 'text'),

  -- Learn (do something)
  (46, 'Watch a tutorial',           'Watch a 10-min tutorial on something you''ve been meaning to learn.',                                          '🎬', '#E6ABE1', 10, 'text'),
  (47, 'Cook a new recipe',          'Try a recipe from a cuisine you don''t usually cook. Photo!',                                                  '🍜', '#E8B044', 10, 'screenshot'),
  (48, 'Read about a hero',          'Read about someone you admire for 15 mins. Share one quote.',                                                  '👑', '#F8D5F3', 10, 'text'),
  (49, 'Documentary fragment',       'Watch 30 mins of any documentary. One thing that surprised you.',                                              '📺', '#925F3A', 10, 'text'),
  (50, 'Find the perfect word',      'Look up a feeling you''ve had — find a word that captures it exactly.',                                        '🔤', '#E6ABE1', 10, 'text')
on conflict (day_of_year) do nothing;

-- ============ CATALOG ITEMS (8) ============

insert into public.catalog_items (name, icon, points, peso_value, sort_order, is_active) values
  ('Cash out',                    '💵', 50,   250,   1,  true),
  ('Grab voucher ₱500',           '🛵', 100,  500,   10, true),
  ('ShopeePay credit ₱500',       '🛒', 100,  500,   20, true),
  ('Foodpanda ₱1000',             '🍔', 200,  1000,  30, true),
  ('DSV swag pack (shirt + tote)','👕', 200,  1000,  40, true),
  ('Lunch with founder',          '🍽️', 300,  null,  50, true),
  ('Udemy course (any)',          '🎓', 500,  2500,  60, true),
  ('PTO / Day off',               '🌴', 1000, null,  70, true)
on conflict do nothing;

-- ============ MISSIONS (5 starter) ============

insert into public.missions (title, description, points, mission_type, platform, proof_type, cover_color, cover_emoji, external_link, instructions, is_pinned, is_active, max_per_user) values
  ('Post about DSV on Instagram',
    'Share something positive about working at DSV Digital on your IG story or feed.',
    30, 'social-post', 'instagram', 'screenshot', '#E6ABE1', '📸',
    null,
    '1. Take a photo of your workspace, a teammate, or anything DSV-related.\n2. Post on your IG story or feed.\n3. Tag @dsvdigital.\n4. Screenshot and share the link here.',
    true, true, 3),

  ('Write a Glassdoor review',
    'Honest review of working at DSV. Helps us hire great people.',
    60, 'review', 'glassdoor', 'url', '#E8B044', '⭐',
    'https://www.glassdoor.com',
    '1. Go to Glassdoor and search for DSV Digital.\n2. Write an honest review.\n3. Paste the URL when published.',
    true, true, 1),

  ('Refer a teammate',
    'Refer someone from your network who would crush it at DSV.',
    100, 'referral', null, 'text', '#F8D5F3', '🤝',
    null,
    '1. Send the referral form to your friend.\n2. They apply and get hired.\n3. You get 100 pts on their start date.',
    false, true, 12),

  ('LinkedIn post about us',
    'Write a LinkedIn post mentioning DSV. Anything genuine.',
    30, 'social-post', 'linkedin', 'url', '#925F3A', '💼',
    null,
    '1. Write a LinkedIn post about your work at DSV.\n2. Tag the DSV company page.\n3. Paste the post URL here.',
    false, true, 3),

  ('Suggest an improvement',
    'Tell us what we should improve. Process, tool, culture, anything. Adopted suggestions get bonus pts.',
    5, 'custom', null, 'text', '#5C8C5A', '💡',
    null,
    '1. Write your suggestion clearly.\n2. Include the problem it solves.\n3. Tell us how we''d know it''s working.\n\nIf we adopt it, we''ll bump the award.',
    false, true, 10)
on conflict do nothing;

-- ============ BINGO BOARD (active for current week) ============

do $$
declare
  v_board_id uuid;
begin
  -- Insert board only if no live board exists yet
  if not exists (select 1 from public.bingo_boards where status = 'live') then
    insert into public.bingo_boards (title, month, start_date, end_date, status, theme)
    values (
      current_date::text || ' — Hump Day Edition',
      to_char(current_date, 'YYYY-MM'),
      current_date - extract(dow from current_date)::int + 1, -- Monday of this week
      current_date - extract(dow from current_date)::int + 7, -- Sunday of this week
      'live',
      'Hump Day Edition'
    )
    returning id into v_board_id;

    -- 25 squares for the 5x5 grid
    -- Column 0 = B (Body)
    insert into public.bingo_board_squares (board_id, col, row, name, emoji, prompt, is_free, is_lucky) values
      (v_board_id, 0, 0, 'Morning Walk',   '🌅', '15-min walk before 9am. Sky photo', false, false),
      (v_board_id, 0, 1, 'Yoga Pose',      '🧘', 'Hold any pose for 1 min. Photo or video', false, false),
      (v_board_id, 0, 2, 'Stretch Twice',  '🤸', 'Two stretch breaks during work hours', false, false),
      (v_board_id, 0, 3, 'Hike 30min',     '⛰️', '30-min hike anywhere outdoors', false, false),
      (v_board_id, 0, 4, 'Dance Workout',  '💃', 'A full song of dance/workout', false, false),
      -- Column 1 = I (Inside)
      (v_board_id, 1, 0, 'Box Breathing',  '🫁', '4-4-4-4 box breathing for 2 min', false, false),
      (v_board_id, 1, 1, 'No-Screen Dinner','🍽️', 'Dinner with no screens', false, false),
      (v_board_id, 1, 2, 'Gratitude List', '📝', 'Write 5 things you''re grateful for today', false, false),
      (v_board_id, 1, 3, 'Meditation 5min','🧠', '5-min guided meditation. Share app/link', false, false),
      (v_board_id, 1, 4, 'Read 20min',     '📚', '20 mins reading anything offline', false, false),
      -- Column 2 = N (Nice — center has FREE)
      (v_board_id, 2, 0, 'Voice Note Mom', '💌', 'Send a voice note to a parent/sibling', false, false),
      (v_board_id, 2, 1, 'Compliment Stranger', '😊', 'Compliment a stranger today', false, false),
      (v_board_id, 2, 2, '★ FREE ★',       '⭐', '', true,  false),
      (v_board_id, 2, 3, 'Volunteer 30min','🤲', 'Do 30 mins of volunteering or helping a neighbor', false, true),
      (v_board_id, 2, 4, 'Care Package',   '📦', 'Send a care package or small gift to someone', false, false),
      -- Column 3 = G (Goofy)
      (v_board_id, 3, 0, 'Pirate Talk',    '🏴‍☠️', 'Talk like a pirate for an hour. Voice memo proof', false, false),
      (v_board_id, 3, 1, 'Indoor Shades',  '😎', 'Wear sunglasses inside for a meeting', false, false),
      (v_board_id, 3, 2, 'Solo Karaoke',   '🎤', 'Sing a whole song alone. Audio clip', false, false),
      (v_board_id, 3, 3, 'New Accent',     '🎭', 'Use a new accent in a real conversation', false, false),
      (v_board_id, 3, 4, 'Dance in Public','💃', 'Dance in a public space (even briefly!)', false, false),
      -- Column 4 = O (Outside)
      (v_board_id, 4, 0, 'Bird Watch',     '🦜', '5-min bird watching. Photo or count', false, false),
      (v_board_id, 4, 1, 'Hug a Tree',     '🌳', 'Yes, literally. Photo of you and a tree', false, false),
      (v_board_id, 4, 2, 'Sunset Photo',   '🌇', 'Catch a sunset. Photo', false, false),
      (v_board_id, 4, 3, 'Beach/Park',     '🏖️', 'Spend 30 mins at a beach or park', false, false),
      (v_board_id, 4, 4, 'Stargaze',       '⭐', 'Look at stars for 10 mins. Sky photo', false, false);
  end if;
end $$;
