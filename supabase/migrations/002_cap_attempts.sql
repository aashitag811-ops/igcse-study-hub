-- ============================================================
-- 002_cap_attempts.sql
-- Run in Supabase SQL Editor after 001_mcq_tracking.sql
-- Keeps only the last 5 attempts per (user_id, paper_id).
-- Wrong questions are NOT capped — they accumulate forever.
-- ============================================================

create or replace function public.cap_mcq_attempts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Delete all attempts for this (user, paper) beyond the 5 most recent
  delete from public.mcq_attempts
  where id in (
    select id
    from public.mcq_attempts
    where user_id  = new.user_id
      and paper_id = new.paper_id
    order by created_at desc
    offset 5   -- keep rows 1-5, delete anything after
  );
  return new;
end;
$$;

drop trigger if exists cap_mcq_attempts_trigger on public.mcq_attempts;
create trigger cap_mcq_attempts_trigger
  after insert on public.mcq_attempts
  for each row execute procedure public.cap_mcq_attempts();
