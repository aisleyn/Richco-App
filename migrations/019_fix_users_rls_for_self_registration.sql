-- Fix RLS policy to allow users to register themselves
-- Drop the old restrictive policy
drop policy if exists "Admin can insert users" on public.users;

-- Create new policy that allows:
-- 1. Users to insert their own profile (for self-registration)
-- 2. Admins to insert any user profile
drop policy if exists "Users can insert own profile or admin can insert users" on public.users;
create policy "Users can insert own profile or admin can insert users" on public.users
  for insert with check (
    -- Allow user to insert their own profile using their auth ID
    (id = auth.uid())
    OR
    -- Allow admins to insert any user
    (exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    ))
  );
