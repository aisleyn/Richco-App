-- Fix crew_members role constraint to match application roles
-- Previous constraint only allowed: 'field', 'supervisor', 'admin', 'ceo'
-- We need: 'site_employee', 'office_staff', 'leadership'

-- Drop old constraint
ALTER TABLE public.crew_members
DROP CONSTRAINT IF EXISTS role_check;

-- Add updated constraint with all valid roles
ALTER TABLE public.crew_members
ADD CONSTRAINT role_check CHECK (role IN ('site_employee', 'office_staff', 'leadership', 'field', 'supervisor', 'admin', 'ceo'));

-- Ensure the insert policy for crew_members allows anon users (for registration)
DROP POLICY IF EXISTS "allow_insert_crew" ON public.crew_members;
CREATE POLICY "allow_insert_crew" ON public.crew_members
  FOR INSERT
  WITH CHECK (TRUE);

-- Add policy for users to read all crew members
DROP POLICY IF EXISTS "allow_read_all_crew" ON public.crew_members;
CREATE POLICY "allow_read_all_crew" ON public.crew_members
  FOR SELECT
  USING (TRUE);

-- Ensure authenticated users can update their own record
DROP POLICY IF EXISTS "allow_update_own_crew" ON public.crew_members;
CREATE POLICY "allow_update_own_crew" ON public.crew_members
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.crew_members TO anon, authenticated;
