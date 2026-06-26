-- Chat channels (General + project-linked)
create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('general', 'project')),
  project_id uuid references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id)
);

insert into chat_channels (name, type) values ('General', 'general');

-- Direct message conversations (between two users)
create table chat_direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a_id, user_b_id)
);

-- Messages (shared by channels and DMs)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  conversation_id uuid references chat_direct_conversations(id) on delete cascade,
  parent_id uuid references chat_messages(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  content text not null default '',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (
    (channel_id is not null and conversation_id is null) or
    (channel_id is null and conversation_id is not null)
  )
);

-- Read receipts for unread badge
create table chat_read_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid references chat_channels(id) on delete cascade,
  conversation_id uuid references chat_direct_conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  check (
    (channel_id is not null and conversation_id is null) or
    (channel_id is null and conversation_id is not null)
  )
);
create unique index crr_channel_uniq on chat_read_receipts (user_id, channel_id) where channel_id is not null;
create unique index crr_conv_uniq on chat_read_receipts (user_id, conversation_id) where conversation_id is not null;

-- Add include_in_chat to projects
alter table projects add column if not exists include_in_chat boolean not null default false;

-- RLS
alter table chat_channels enable row level security;
alter table chat_direct_conversations enable row level security;
alter table chat_messages enable row level security;
alter table chat_read_receipts enable row level security;

create policy "auth_read_channels" on chat_channels for select to authenticated using (auth.uid() is not null);
create policy "auth_insert_channels" on chat_channels for insert to authenticated with check (auth.uid() is not null);
create policy "auth_delete_channels" on chat_channels for delete to authenticated using (auth.uid() is not null);

create policy "auth_read_messages" on chat_messages for select to authenticated using (auth.uid() is not null);
create policy "auth_insert_messages" on chat_messages for insert to authenticated with check (auth.uid() = author_id);
create policy "auth_delete_own_messages" on chat_messages for delete to authenticated using (auth.uid() = author_id);

create policy "auth_read_dm_convs" on chat_direct_conversations for select to authenticated using (auth.uid() = user_a_id or auth.uid() = user_b_id);
create policy "auth_insert_dm_convs" on chat_direct_conversations for insert to authenticated with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "auth_select_receipts" on chat_read_receipts for select to authenticated using (auth.uid() = user_id);
create policy "auth_insert_receipts" on chat_read_receipts for insert to authenticated with check (auth.uid() = user_id);
create policy "auth_update_receipts" on chat_read_receipts for update to authenticated using (auth.uid() = user_id);
create policy "auth_delete_receipts" on chat_read_receipts for delete to authenticated using (auth.uid() = user_id);
