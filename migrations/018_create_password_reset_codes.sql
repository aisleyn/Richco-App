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

-- Anyone can insert (for initiating password reset)
create policy "Anyone can insert reset codes" on public.password_reset_codes
  for insert with check (true);

-- Allow viewing by code for verification (password reset flow)
-- Also allow users to view their own codes by email
create policy "Allow password reset code verification" on public.password_reset_codes
  for select using (true);

-- Users can update their own codes (mark as used)
create policy "Users can update their own reset codes" on public.password_reset_codes
  for update using (email = auth.jwt() ->> 'email');
