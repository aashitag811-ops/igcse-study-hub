-- ============================================================
-- 004_resource_moderation.sql
-- Run in Supabase SQL Editor after 003_question_answers.sql
-- Adds moderation status to resources table.
-- Creators (arinjaysaha2010@gmail.com, aashitag811@gmail.com)
-- can upload directly; everyone else is 'pending' until approved.
-- ============================================================

-- Add status column (default 'approved' so existing resources stay visible)
alter table public.resources
  add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- Index for fast pending queue lookups
create index if not exists resources_status_idx
  on public.resources(status, created_at desc);

-- RLS: Allow creators to update status (approve/reject)
-- The existing policies allow any authenticated user to insert —
-- the upload code sets status='pending' for non-creators server-side.

-- Allow the resource owner OR any signed-in user to read pending
-- resources they uploaded themselves (so they can see "awaiting approval")
drop policy if exists "Users can read own pending resources" on public.resources;
create policy "Users can read own pending resources"
  on public.resources for select
  using (
    status = 'approved'
    or uploader_id = auth.uid()
  );
