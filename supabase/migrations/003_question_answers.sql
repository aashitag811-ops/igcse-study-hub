-- ============================================================
-- 003_question_answers.sql
-- Run in Supabase SQL Editor after 002_cap_attempts.sql
-- Stores ALL answers (right + wrong) per attempt so the user
-- can re-open a past attempt in Review Mode.
-- ============================================================

create table if not exists public.mcq_question_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.mcq_attempts(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  paper_id         text not null,
  question_number  smallint not null,
  user_answer      text,             -- A/B/C/D or null (unanswered)
  correct_answer   text not null,    -- A/B/C/D or 'DISCOUNTED'
  is_correct       boolean not null, -- true if user_answer = correct_answer or DISCOUNTED
  created_at       timestamptz not null default now(),

  unique (attempt_id, question_number)
);

-- RLS
alter table public.mcq_question_answers enable row level security;

drop policy if exists "Users can insert own question answers" on public.mcq_question_answers;
create policy "Users can insert own question answers"
  on public.mcq_question_answers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own question answers" on public.mcq_question_answers;
create policy "Users can read own question answers"
  on public.mcq_question_answers for select
  using (auth.uid() = user_id);

-- Index for fast per-attempt lookups
create index if not exists mcq_question_answers_attempt_idx
  on public.mcq_question_answers(attempt_id);
