-- =====================================================
-- PERSONAL SEED for Deanna's account
--
-- Run this manually in Supabase SQL Editor, ONCE.
-- Not a migration because it's user-specific.
--
-- What it does:
--   - Gives you 90 starting points (from 4 sample approved sparks +
--     a peer-to-peer + an internal check-in) so the dashboard is alive
--   - Pushes 4 sample notifications so the bell has content
--
-- Safe to re-run — uses unique constraints / duplicates.
-- =====================================================

-- 90 starting points across 6 approved point_activities
insert into public.point_activities (employee_id, category_key, points, note, status, created_at) values
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'internal_checkin', 5,  'Joined Monday team check-in', 'approved', now() - interval '6 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'kickoff_meeting',  5,  'Q3 planning kick-off',         'approved', now() - interval '5 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'peer_to_peer',     5,  'Recognized by Marvin',          'approved', now() - interval '4 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'innovative_ideas', 5,  'Suggested the new portal!',     'approved', now() - interval '3 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'monthly_attendance', 30, 'May attendance bonus',         'approved', now() - interval '20 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'commendation_client', 20, 'Client praised your design work', 'approved', now() - interval '10 days')
on conflict do nothing;

-- Recent notifications
insert into public.notifications (user_id, type, icon, text, link_url, created_at) values
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'welcome',     '🎉', '<strong>Welcome to DSV Portal!</strong> Your account is now active. Claim today''s spark to start your streak.', '/today', now() - interval '1 hour'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'points',      '💰', 'You earned <strong>+20 pts</strong> from a client commendation. Nice work!', null, now() - interval '10 days'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'spark',       '✨', 'A new daily spark is waiting for you — <strong>claim it before midnight</strong> to keep your streak.', '/today', now() - interval '30 minutes'),
  ('de6c6903-2795-4275-8a76-0f88b5ab7cc4', 'announcement','📺', '<strong>New bingo board this week:</strong> Hump Day Edition. Stamp 5 squares for +25 pts!', '/achievements/bingo', now() - interval '2 days');

select 'Done. You should now have 70 points and 4 notifications.' as result;
