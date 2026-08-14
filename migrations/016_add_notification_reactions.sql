-- Create notification reactions table (like/dislike/question)
CREATE TABLE IF NOT EXISTS notification_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_notification_reaction_per_user UNIQUE (notification_id, reaction_by, reaction_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_reactions_notification_id ON notification_reactions(notification_id);

-- Enable RLS
ALTER TABLE notification_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions
DROP POLICY IF EXISTS "Anyone can read notification reactions" ON notification_reactions;
CREATE POLICY "Anyone can read notification reactions" ON notification_reactions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can react to notifications" ON notification_reactions;
CREATE POLICY "Authenticated users can react to notifications" ON notification_reactions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can remove their own reactions" ON notification_reactions;
CREATE POLICY "Users can remove their own reactions" ON notification_reactions
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON notification_reactions TO anon, authenticated;
GRANT INSERT ON notification_reactions TO authenticated;
GRANT DELETE ON notification_reactions TO authenticated;
