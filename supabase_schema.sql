-- Create a table for users
create table public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  verification_code text,
  generation_count int default 0,
  last_reset_time timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  last_login timestamp with time zone
);

-- Establish security policies (optional, if RLS is enabled)
alter table public.users enable row level security;

-- Allow service role full access (since we use service role key in API)
create policy "Enable access for service role" on public.users
    for all
    using (true)
    with check (true);
