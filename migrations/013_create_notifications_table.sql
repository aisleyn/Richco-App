-- Create notifications table for persistent admin updates
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'update' CHECK (type IN ('update', 'alert', 'announcement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read notifications
CREATE POLICY "Anyone can read notifications" ON notifications
  FOR SELECT
  USING (true);

-- Create policy: Only authenticated users can create notifications
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy: Only creators can delete their notifications (or admins)
CREATE POLICY "Users can delete notifications" ON notifications
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON notifications TO anon, authenticated;
GRANT INSERT ON notifications TO authenticated;
GRANT DELETE ON notifications TO authenticated;
