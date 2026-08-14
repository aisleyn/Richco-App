-- Add view count to notifications table
ALTER TABLE notifications ADD COLUMN views_count INTEGER DEFAULT 0;

-- Create notifications_views table to track who viewed
CREATE TABLE IF NOT EXISTS notifications_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  viewed_by TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_views_notification_id ON notifications_views(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_views_viewed_by ON notifications_views(viewed_by);

-- Create notifications_comments table
CREATE TABLE IF NOT EXISTS notifications_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_comments_notification_id ON notifications_comments(notification_id);

-- Enable RLS
ALTER TABLE notifications_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_comments ENABLE ROW LEVEL SECURITY;

-- Policies for views (anyone can read/create)
DROP POLICY IF EXISTS "Anyone can read notification views" ON notifications_views;
CREATE POLICY "Anyone can read notification views" ON notifications_views
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can track views" ON notifications_views;
CREATE POLICY "Authenticated users can track views" ON notifications_views
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for comments (anyone can read, authenticated can create)
DROP POLICY IF EXISTS "Anyone can read notification comments" ON notifications_comments;
CREATE POLICY "Anyone can read notification comments" ON notifications_comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON notifications_comments;
CREATE POLICY "Authenticated users can comment" ON notifications_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON notifications_views TO anon, authenticated;
GRANT INSERT ON notifications_views TO authenticated;
GRANT SELECT ON notifications_comments TO anon, authenticated;
GRANT INSERT ON notifications_comments TO authenticated;
