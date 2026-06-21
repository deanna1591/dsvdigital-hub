-- =====================================================
-- Migration 003: Feed RLS — allow reading public events
-- 
-- Adds policies so employees can see APPROVED mission submissions,
-- DELIVERED/PROCESSING orders, and BIRTHDAY/ANNIVERSARY milestones
-- from other employees (for the newsfeed).
-- 
-- Private data (pending orders, your point history, etc.) still
-- requires owning the row or being an admin.
--
-- Run AFTER 001_missions_and_catalog_source.sql
-- =====================================================

-- Mission submissions: anyone can read approved ones (for feed)
drop policy if exists "anyone reads approved submissions" on public.mission_submissions;
create policy "anyone reads approved submissions" on public.mission_submissions
  for select using (status = 'approved');

-- Redemption orders: anyone can read non-pending ones (celebrate the win!)
drop policy if exists "anyone reads delivered orders" on public.redemption_orders;
create policy "anyone reads delivered orders" on public.redemption_orders
  for select using (status in ('processing', 'delivered'));

-- Point activities: anyone can read birthday/anniversary milestones
drop policy if exists "anyone reads milestones" on public.point_activities;
create policy "anyone reads milestones" on public.point_activities
  for select using (category_id in ('birthday', 'anniversary'));
