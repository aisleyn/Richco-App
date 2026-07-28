-- Create comment replies table
CREATE TABLE IF NOT EXISTS notification_comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reply TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_comment_replies_comment_id ON notification_comment_replies(comment_id);

-- Create comment reactions table (like/dislike/question)
CREATE TABLE IF NOT EXISTS notification_comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_reaction_per_user UNIQUE (comment_id, reaction_by, reaction_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_comment_reactions_comment_id ON notification_comment_reactions(comment_id);

-- Add view tracking for comments
CREATE TABLE IF NOT EXISTS notification_comment_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  viewed_by TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_comment_viewer UNIQUE (comment_id, viewed_by)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_comment_views_comment_id ON notification_comment_views(comment_id);

-- Enable RLS
ALTER TABLE notification_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_comment_views ENABLE ROW LEVEL SECURITY;

-- Policies for replies (anyone can read, authenticated can create)
CREATE POLICY "Anyone can read comment replies" ON notification_comment_replies
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can reply to comments" ON notification_comment_replies
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for reactions (anyone can read, authenticated can create/delete)
CREATE POLICY "Anyone can read comment reactions" ON notification_comment_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react to comments" ON notification_comment_reactions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can remove their own reactions" ON notification_comment_reactions
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for comment views (anyone can read, authenticated can create)
CREATE POLICY "Anyone can read comment views" ON notification_comment_views
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can track comment views" ON notification_comment_views
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON notification_comment_replies TO anon, authenticated;
GRANT INSERT ON notification_comment_replies TO authenticated;
GRANT SELECT ON notification_comment_reactions TO anon, authenticated;
GRANT INSERT ON notification_comment_reactions TO authenticated;
GRANT DELETE ON notification_comment_reactions TO authenticated;
GRANT SELECT ON notification_comment_views TO anon, authenticated;
GRANT INSERT ON notification_comment_views TO authenticated;
