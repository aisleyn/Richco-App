-- Store push notification subscriptions for web push API
-- Each user can have multiple subscriptions (phone, tablet, desktop, etc.)

CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,

  -- Push API subscription details
  endpoint TEXT NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,

  -- Device info for management
  user_agent TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notification preferences
  notify_messages BOOLEAN DEFAULT TRUE,
  notify_mentions BOOLEAN DEFAULT TRUE,
  notify_shifts BOOLEAN DEFAULT TRUE,
  notify_roster BOOLEAN DEFAULT TRUE,
  notify_leave_requests BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique per endpoint (a subscription can't exist twice)
  UNIQUE(endpoint)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS notification_subscriptions_user_id_idx ON public.notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS notification_subscriptions_email_idx ON public.notification_subscriptions(email);

-- Enable RLS
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can read own subscriptions" ON public.notification_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can create own subscriptions" ON public.notification_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.notification_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.notification_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_subscriptions TO authenticated;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_notification_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS notification_subscriptions_updated_at_trigger ON public.notification_subscriptions;
CREATE TRIGGER notification_subscriptions_updated_at_trigger
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_subscriptions_updated_at();
