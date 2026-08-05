-- Fix notifications RLS to prevent users seeing all alerts
-- Currently broken: All users can read all notifications (OPEN READ policy)
-- Fix: Add recipient scoping and proper RLS policies

-- 1. Add recipient columns to notifications table if not exist
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT ARRAY['crew'],
ADD COLUMN IF NOT EXISTS is_broadcast boolean DEFAULT false;

-- 2. Drop the old open-read policy
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;

-- 3. Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read notifications for them" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

-- 4. Create new RLS policies for notifications

-- Policy: Admin can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can read notifications intended for them
CREATE POLICY "Users can read notifications for them"
  ON public.notifications
  FOR SELECT
  USING (
    -- Admin can read all
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- User can read if intended for them specifically
    recipient_id = auth.uid()
    OR
    -- User can read broadcast notifications
    is_broadcast = true
    OR
    -- User can read if their role is in target_roles
    (
      auth.uid() IN (SELECT id FROM public.users WHERE role = ANY(target_roles))
      AND target_roles IS NOT NULL
      AND array_length(target_roles, 1) > 0
    )
  );

-- Policy: Admins can update notifications
CREATE POLICY "Admins can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON public.notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create a function to send notifications to specific users
CREATE OR REPLACE FUNCTION public.send_notification(
  p_title text,
  p_message text,
  p_type text,
  p_recipient_id uuid DEFAULT NULL,
  p_target_roles text[] DEFAULT NULL,
  p_is_broadcast boolean DEFAULT false
)
RETURNS json AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    title,
    message,
    type,
    recipient_id,
    target_roles,
    is_broadcast,
    created_at
  )
  VALUES (
    p_title,
    p_message,
    p_type,
    p_recipient_id,
    p_target_roles,
    p_is_broadcast,
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN json_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'message', 'Notification sent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Example usage:
-- -- Send to specific user:
-- SELECT send_notification('Hello', 'Message for John', 'update', recipient_id => 'john-uuid');
--
-- -- Send to all crew members:
-- SELECT send_notification('Team Alert', 'Important update', 'urgent', target_roles => ARRAY['crew']);
--
-- -- Send to admins and leadership:
-- SELECT send_notification('Report', 'Monthly summary', 'report', target_roles => ARRAY['admin', 'leadership']);
--
-- -- Broadcast to everyone:
-- SELECT send_notification('System', 'Maintenance scheduled', 'info', is_broadcast => true);

-- IMPORTANT NOTES:
-- 1. recipient_id is for individual targeted notifications
-- 2. target_roles is for role-based notifications (crew, admin, leadership)
-- 3. is_broadcast sends to everyone regardless of role
-- 4. Update existing notifications to set appropriate columns:
--    UPDATE notifications SET is_broadcast = true WHERE type IN ('weather', 'announcement');
--    UPDATE notifications SET target_roles = ARRAY['crew'] WHERE type IN ('update', 'alert');
-- 5. RLS now properly scopes who can see what
