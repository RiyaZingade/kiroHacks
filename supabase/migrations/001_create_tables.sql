-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Projects table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Untitled Circuit',
  circuit jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat messages table
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Index for fast message loading
create index if not exists idx_chat_messages_project on chat_messages(project_id, created_at);

-- Auto-update updated_at on projects
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- Enable RLS but allow all for now (no auth)
alter table projects enable row level security;
alter table chat_messages enable row level security;

create policy "Allow all on projects" on projects for all using (true) with check (true);
create policy "Allow all on chat_messages" on chat_messages for all using (true) with check (true);
