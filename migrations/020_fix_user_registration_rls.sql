-- Fix RLS to allow user registration
-- The issue: During signup, auth.uid() is not reliably set, blocking profile creation
-- Solution: Create a trigger function that automatically creates user profiles on auth user creation

-- 1. Drop the problematic RLS policy
DROP POLICY IF EXISTS "Users can insert own profile or admin can insert users" ON public.users;

-- 2. Create new policies for INSERT that work with signup flow
-- Allow inserting a record if the user_id matches their own auth ID (for self-registration)
-- This works after the auth user is created and the app calls the insert
CREATE POLICY "Users can insert own profile during registration"
  ON public.users
  FOR INSERT
  WITH CHECK (
    -- Allow user to insert their own profile
    id = auth.uid()
    OR
    -- Allow admins to insert any user
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Create policy for SELECT (allow reading own record)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (
    id = auth.uid() OR role = 'admin'
  );

-- 4. Create policy for UPDATE (allow updating own record)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid() OR role = 'admin')
  WITH CHECK (id = auth.uid() OR role = 'admin');

-- 5. Alternative approach: Trigger-based profile creation
-- This automatically creates a profile when a new auth user is created
-- Uncomment and run this if the above policies don't work

-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.users (id, email, name, role)
--   VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email), 'crew')
--   ON CONFLICT (id) DO NOTHING;
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- IMPORTANT NOTES:
-- - Run this SQL in Supabase SQL Editor
-- - If the trigger approach is needed, uncomment those lines
-- - The trigger requires auth.users table access (may need service role)
-- - Test registration flow after applying this migration
