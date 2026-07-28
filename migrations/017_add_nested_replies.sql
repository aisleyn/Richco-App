-- Add parent_reply_id to support nested replies
ALTER TABLE notification_comment_replies
ADD COLUMN reply_to_id UUID REFERENCES notification_comment_replies(id) ON DELETE CASCADE;

-- Create index for faster nested reply queries
CREATE INDEX IF NOT EXISTS idx_notification_comment_replies_reply_to_id ON notification_comment_replies(reply_to_id);

-- Create view reaction tracking table
CREATE TABLE IF NOT EXISTS notification_reaction_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reaction_id UUID NOT NULL REFERENCES notification_reactions(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_reaction_details_notification_id ON notification_reaction_details(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reaction_details_reaction_type ON notification_reaction_details(reaction_type);

-- Create comment reaction details table
CREATE TABLE IF NOT EXISTS comment_reaction_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reaction_id UUID NOT NULL REFERENCES notification_comment_reactions(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_reaction_details_comment_id ON comment_reaction_details(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reaction_details_reaction_type ON comment_reaction_details(reaction_type);

-- Enable RLS on new tables
ALTER TABLE notification_reaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reaction_details ENABLE ROW LEVEL SECURITY;

-- Policies for reaction details (public read)
CREATE POLICY "Anyone can read notification reaction details" ON notification_reaction_details
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read comment reaction details" ON comment_reaction_details
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT SELECT ON notification_reaction_details TO anon, authenticated;
GRANT SELECT ON comment_reaction_details TO anon, authenticated;
