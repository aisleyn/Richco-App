-- Fix messaging RLS policies to allow adding other users to threads
-- The previous policy only allowed users to add themselves, breaking DM creation
-- Use a simpler approach to avoid infinite recursion with message_threads RLS

-- Update the thread_participants INSERT policy
-- Allow insertion if:
-- 1. User is adding themselves (email matches current user), OR
-- 2. User is already a participant in this thread (can add others)
DROP POLICY IF EXISTS "Users can add themselves to threads" ON public.thread_participants;

CREATE POLICY "Users can add participants to threads" ON public.thread_participants
  FOR INSERT
  WITH CHECK (
    email = auth.jwt() ->> 'email' OR
    EXISTS (
      SELECT 1 FROM public.thread_participants AS tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.email = auth.jwt() ->> 'email'
    )
  );
