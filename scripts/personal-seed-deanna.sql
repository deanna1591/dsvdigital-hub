-- PERSONAL SEED for Deanna's account
-- Run this manually in Supabase SQL Editor, ONCE.

insert into public.point_activities (employee_id, category_id, points, note, created_at) values
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'internal_checkin',     5,  'Joined Monday team check-in',          now() - interval '6 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'kickoff_meeting',      5,  'Q3 planning kick-off',                 now() - interval '5 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'peer_to_peer',         5,  'Recognized by Marvin',                 now() - interval '4 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'innovative_ideas',     5,  'Suggested the new portal!',            now() - interval '3 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'monthly_attendance',   30, 'May attendance bonus',                 now() - interval '20 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'commendation_client',  20, 'Client praised your design work',      now() - interval '10 days');

insert into public.notifications (user_id, type, icon, text, link_url, created_at) values
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'welcome',     '🎉', '<strong>Welcome to DSV Portal!</strong> Your account is now active. Claim today''s spark to start your streak.', '/today', now() - interval '1 hour'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'points',      '💰', 'You earned <strong>+20 pts</strong> from a client commendation. Nice work!', null, now() - interval '10 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'spark',       '✨', 'A new daily spark is waiting for you — <strong>claim it before midnight</strong> to keep your streak.', '/today', now() - interval '30 minutes'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'announcement','📺', '<strong>New bingo board this week:</strong> Hump Day Edition. Stamp 5 squares for +25 pts!', '/achievements/bingo', now() - interval '2 days');

select 'Done. You should now have 70 points and 4 notifications.' as result;
