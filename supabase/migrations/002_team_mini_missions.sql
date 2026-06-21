-- =====================================================
-- Migration 002: Team-created mini-missions
-- Adds Pet Coworker, WFH Funny Story, DSV Checkpoint as
-- year-round repeatable missions.
--
-- Run AFTER 001_missions_and_catalog_source.sql
-- If you ran the full schema.sql recently, these are
-- already included — skip this migration.
-- =====================================================

insert into public.missions (title, description, points, mission_type, platform, proof_type, cover_color, cover_emoji, instructions, is_pinned, is_active, max_per_user, sort_order) values
  (
    '🐾 Pet Coworker Photo',
    'Snap your fur, feathered, or scaly coworker doing their thing. Team-created mini-mission — repeatable.',
    10, 'custom', null, 'screenshot', '#c95d8f', '🐾',
    'Take a photo of your pet (or any animal companion) at your workspace. Upload to Google Drive or Imgur, set sharing to "anyone with link", paste the link here. Caption optional but encouraged!',
    false, true, 12, 100
  ),
  (
    '😂 WFH Funny Story',
    'The neighbor''s rooster crashed your client call? The cat sat on the keyboard? Share a quick story. Team-created mini-mission.',
    15, 'custom', null, 'text', '#e8a635', '😂',
    'Type a short funny story (1-3 sentences) about your WFH life. Anything from quirky moments to small disasters that ended up okay.',
    false, true, 6, 110
  ),
  (
    '📸 DSV Checkpoint',
    'Take a picture of something right in front of you now and tell us about it. That''s the whole mission. Team-created mini-mission.',
    5, 'custom', null, 'screenshot', '#4ba3a3', '📸',
    'Look up from your screen. Take a quick photo of something on your desk, in your room, or out your window. Upload (Drive/Imgur) and paste the link + one sentence about what it is.',
    false, true, 0, 120
  );
