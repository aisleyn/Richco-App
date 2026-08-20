-- Add user_id field to crew_members to link with auth.users
-- This allows crew_members to reference auth user IDs for messaging and other features

ALTER TABLE public.crew_members
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS crew_members_user_id_idx ON public.crew_members(user_id);

-- Populate user_id by matching email with auth.users
UPDATE public.crew_members cm
SET user_id = au.id
FROM auth.users au
WHERE cm.email = au.email;

-- Update RLS policy to grant access
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_crew" ON public.crew_members;
CREATE POLICY "allow_read_all_crew" ON public.crew_members
  FOR SELECT
  USING (TRUE);
