-- Fix messaging RLS policies to allow adding other users to threads
-- The previous policy only allowed users to add themselves, breaking DM creation

-- Update the thread_participants INSERT policy to allow adding any participant
-- as long as the user creating the thread is authenticated
DROP POLICY IF EXISTS "Users can add themselves to threads" ON public.thread_participants;

CREATE POLICY "Users can add participants to threads" ON public.thread_participants
  FOR INSERT
  WITH CHECK (
    -- Allow insertion if:
    -- 1. User is adding themselves, OR
    -- 2. The thread creator is the current user (they can add others)
    email = auth.jwt() ->> 'email' OR
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE id = thread_participants.thread_id
      AND created_by = auth.uid()
    )
  );
