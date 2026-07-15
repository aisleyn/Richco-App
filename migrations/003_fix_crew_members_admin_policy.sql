-- Fix crew_members RLS to allow admins to update any crew member

-- Drop the overly restrictive update policy
DROP POLICY IF EXISTS "allow_update_own_crew" ON public.crew_members;

-- New policy: Allow users to update their own record
CREATE POLICY "Users can update own record" ON public.crew_members
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- New policy: Allow admins to update any record
CREATE POLICY "Admins can update any crew member" ON public.crew_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email'
      AND is_admin = TRUE
    )
  );

-- Also allow admin inserts (for the app to create new crew members)
DROP POLICY IF EXISTS "allow_insert_crew" ON public.crew_members;

CREATE POLICY "Anyone can insert crew" ON public.crew_members
  FOR INSERT
  WITH CHECK (TRUE);
