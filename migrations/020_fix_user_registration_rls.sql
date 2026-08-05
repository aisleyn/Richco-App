-- Fix RLS to allow user registration
-- The issue: During signup, auth.uid() is not reliably set, blocking profile creation
-- Solution: Create a trigger function that automatically creates user profiles on auth user creation

-- 1. Drop all existing policies on users table to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile or admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read all crew members" ON public.users;
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Admin can update users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;

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

-- 3. Create policy for SELECT (allow reading own record and all crew)
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (
    id = auth.uid() OR role = 'admin'
  );

CREATE POLICY "Users can read all crew members"
  ON public.users
  FOR SELECT
  USING (true);

-- 4. Create policy for UPDATE (allow updating own record)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid() OR role = 'admin')
  WITH CHECK (id = auth.uid() OR role = 'admin');

-- 5. Create automatic profile creation trigger
-- This automatically creates a profile when a new auth user is created
-- Uses SECURITY DEFINER to bypass RLS - this is the recommended Supabase pattern

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email), 'crew')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- IMPORTANT NOTES:
-- - This trigger automatically creates profiles for new signup users
-- - SECURITY DEFINER allows the trigger to bypass RLS
-- - The app no longer needs to INSERT into public.users during signup
-- - User profiles are guaranteed to exist after auth account creation
