-- Fix crew_members with missing user_id by matching email with auth.users
-- This is a follow-up to migration 031 in case some records were added after the initial migration

UPDATE public.crew_members cm
SET user_id = au.id
FROM auth.users au
WHERE cm.email = au.email AND cm.user_id IS NULL;

-- Also handle specific case: Joanna T at joannat@richcogroup.com
UPDATE public.crew_members
SET user_id = 'c73cbb0b-9524-4e6a-a2aa-680fa7d997db'
WHERE email = 'joannat@richcogroup.com' AND user_id IS NULL;
