-- Create password reset codes table for text-based password reset
create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  email text not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for fast lookups
create index if not exists password_reset_codes_user_id_idx on public.password_reset_codes(user_id);
create index if not exists password_reset_codes_code_idx on public.password_reset_codes(code);
create index if not exists password_reset_codes_email_idx on public.password_reset_codes(email);

-- Allow users to view and update their own reset codes
alter table public.password_reset_codes enable row level security;

create policy "Users can view their own reset codes" on public.password_reset_codes
  for select using (email = auth.jwt() ->> 'email');

create policy "Anyone can insert reset codes" on public.password_reset_codes
  for insert with check (true);

create policy "Users can update their own reset codes" on public.password_reset_codes
  for update using (email = auth.jwt() ->> 'email');
