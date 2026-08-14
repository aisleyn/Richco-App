-- Create users table to store crew member profiles
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'crew')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Policy: Users can read their own profile
drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile" on public.users
  for select using (auth.uid() = id);

-- Policy: Users can read all crew members (for messaging, crew list)
drop policy if exists "Users can read all crew members" on public.users;
create policy "Users can read all crew members" on public.users
  for select using (true);

-- Policy: Admin can insert new users
drop policy if exists "Admin can insert users" on public.users;
create policy "Admin can insert users" on public.users
  for insert with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admin can update users
drop policy if exists "Admin can update users" on public.users;
create policy "Admin can update users" on public.users
  for update using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admin can delete users
drop policy if exists "Admin can delete users" on public.users;
create policy "Admin can delete users" on public.users
  for delete using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Create index for email lookups
create index if not exists users_email_idx on public.users(email);

-- Create index for role lookups
create index if not exists users_role_idx on public.users(role);
