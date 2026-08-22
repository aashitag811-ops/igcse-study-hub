-- Notifications table
-- Admins post short messages (bug fixes, updates) visible to all users.
-- Each user can dismiss/read notifications; unread count shows on the bell.

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  type        text not null default 'update',   -- 'update' | 'bugfix' | 'announcement'
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

-- Tracks which notifications each user has read/dismissed
create table if not exists notification_reads (
  user_id         uuid references auth.users(id) on delete cascade,
  notification_id uuid references notifications(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, notification_id)
);

-- Public read access for all authenticated users
alter table notifications enable row level security;
alter table notification_reads enable row level security;

create policy "Anyone can read notifications"
  on notifications for select
  using (true);

create policy "Admins can insert notifications"
  on notifications for insert
  with check (
    auth.email() in ('arinjaysaha2010@gmail.com', 'aashitag811@gmail.com')
  );

create policy "Admins can delete notifications"
  on notifications for delete
  using (
    auth.email() in ('arinjaysaha2010@gmail.com', 'aashitag811@gmail.com')
  );

create policy "Users can read their own reads"
  on notification_reads for select
  using (auth.uid() = user_id);

create policy "Users can mark their own reads"
  on notification_reads for insert
  with check (auth.uid() = user_id);
