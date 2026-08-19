-- Create messaging system tables for Richco app
-- Supports 1-to-1 and group conversations with real-time sync

-- ============================================================================
-- MESSAGE_THREADS TABLE - Conversations (1-to-1 or group)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255), -- NULL for 1-to-1, set for group chats
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE -- For sorting
);

-- ============================================================================
-- THREAD_PARTICIPANTS TABLE - Who's in each conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE, -- For unread count

  UNIQUE(thread_id, user_id)
);

-- ============================================================================
-- MESSAGES TABLE - Individual messages in threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete support
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS thread_participants_thread_id_idx ON public.thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS thread_participants_user_id_idx ON public.thread_participants(user_id);
CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS message_threads_last_message_idx ON public.message_threads(last_message_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Message Threads
-- ============================================================================
-- Users can read threads they're a participant in
DROP POLICY IF EXISTS "Users can read their threads" ON public.message_threads;
CREATE POLICY "Users can read their threads" ON public.message_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = message_threads.id
      AND email = auth.jwt() ->> 'email'
    )
  );

-- Users can create threads
DROP POLICY IF EXISTS "Users can create threads" ON public.message_threads;
CREATE POLICY "Users can create threads" ON public.message_threads
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- RLS POLICIES - Thread Participants
-- ============================================================================
-- Users can read participant lists for their threads
DROP POLICY IF EXISTS "Users can read thread participants" ON public.thread_participants;
CREATE POLICY "Users can read thread participants" ON public.thread_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants p2
      WHERE p2.thread_id = thread_participants.thread_id
      AND p2.email = auth.jwt() ->> 'email'
    )
  );

-- Users can insert themselves as participants
DROP POLICY IF EXISTS "Users can add themselves to threads" ON public.thread_participants;
CREATE POLICY "Users can add themselves to threads" ON public.thread_participants
  FOR INSERT
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Users can update their own read_at timestamp
DROP POLICY IF EXISTS "Users can update own read status" ON public.thread_participants;
CREATE POLICY "Users can update own read status" ON public.thread_participants
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- ============================================================================
-- RLS POLICIES - Messages
-- ============================================================================
-- Users can read messages in threads they're a participant in
DROP POLICY IF EXISTS "Users can read messages in their threads" ON public.messages;
CREATE POLICY "Users can read messages in their threads" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = messages.thread_id
      AND email = auth.jwt() ->> 'email'
    )
  );

-- Users can insert messages into threads they're in
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = messages.thread_id
      AND email = auth.jwt() ->> 'email'
    )
  );

-- Users can only delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.message_threads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.thread_participants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO anon, authenticated;
