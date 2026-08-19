-- ============================================================
-- 001_mcq_tracking.sql
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. Auto-create profile on new auth user ──────────────────
-- Fires for both email sign-up AND Google OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'preferred_username',
             split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;   -- idempotent: safe to re-run
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. mcq_attempts ──────────────────────────────────────────
create table if not exists public.mcq_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  paper_id            text not null,
  subject_code        text not null,
  score               smallint not null,          -- correct answers
  total               smallint not null,          -- total scorable questions
  percentage          numeric(5,2) not null,      -- 0-100
  time_taken_seconds  int not null default 0,
  is_practice         boolean not null default false,
  created_at          timestamptz not null default now()
);

-- RLS
alter table public.mcq_attempts enable row level security;

drop policy if exists "Users can insert own attempts" on public.mcq_attempts;
create policy "Users can insert own attempts"
  on public.mcq_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own attempts" on public.mcq_attempts;
create policy "Users can read own attempts"
  on public.mcq_attempts for select
  using (auth.uid() = user_id);


-- ── 3. mcq_wrong_questions ───────────────────────────────────
create table if not exists public.mcq_wrong_questions (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.mcq_attempts(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  paper_id         text not null,
  subject_code     text not null,
  question_number  smallint not null,
  user_answer      text,             -- A/B/C/D or null (unanswered)
  correct_answer   text not null,    -- A/B/C/D
  created_at       timestamptz not null default now()
);

-- RLS
alter table public.mcq_wrong_questions enable row level security;

drop policy if exists "Users can insert own wrong questions" on public.mcq_wrong_questions;
create policy "Users can insert own wrong questions"
  on public.mcq_wrong_questions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own wrong questions" on public.mcq_wrong_questions;
create policy "Users can read own wrong questions"
  on public.mcq_wrong_questions for select
  using (auth.uid() = user_id);


-- ── 4. Indexes for fast profile queries ──────────────────────
create index if not exists mcq_attempts_user_id_idx
  on public.mcq_attempts(user_id, created_at desc);

create index if not exists mcq_wrong_questions_user_id_idx
  on public.mcq_wrong_questions(user_id, subject_code);
