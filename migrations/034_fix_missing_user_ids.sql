-- Fix crew_members with missing user_id by matching email with auth.users
-- This is a follow-up to migration 031 in case some records were added after the initial migration

UPDATE public.crew_members cm
SET user_id = au.id
FROM auth.users au
WHERE cm.email = au.email AND cm.user_id IS NULL;

-- Log the update count
-- The UPDATE statement above will populate user_id for all crew members
-- that have matching emails in auth.users but currently have NULL user_id
