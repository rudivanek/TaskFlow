-- message_reminders table
create table message_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references chat_messages(id) on delete cascade,
  comment_id uuid references project_comments(id) on delete cascade,
  message_preview text not null,
  message_author text not null,
  remind_at timestamptz not null,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (message_id is not null and comment_id is null) or
    (message_id is null and comment_id is not null)
  )
);

alter table message_reminders enable row level security;

create policy "reminders_select_own" on message_reminders for select
  to authenticated using (auth.uid() = user_id);
create policy "reminders_insert_own" on message_reminders for insert
  to authenticated with check (auth.uid() = user_id);
create policy "reminders_update_own" on message_reminders for update
  to authenticated using (auth.uid() = user_id);
create policy "reminders_delete_own" on message_reminders for delete
  to authenticated using (auth.uid() = user_id);

-- sound preference on profiles
alter table profiles add column if not exists sound_enabled boolean not null default true;

-- allow users to update their own profile
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_insert_own" on profiles for insert
  to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update
  to authenticated using (auth.uid() = id);
