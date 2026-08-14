# Complete Migration Setup Guide

## 🎯 Overview

You need to apply **24 migrations** to create the complete database schema. Below is the **exact SQL to copy-paste** in order.

### Where to Apply
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a **New Query** for each migration below
4. Click **Run** after pasting each one
5. You should see ✅ **"Query executed successfully"**

---

## ✅ Migration 001: Create crew_members table

```sql
CREATE TABLE IF NOT EXISTS public.crew_members (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'field',
  status VARCHAR(50) DEFAULT 'available',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_format CHECK (email LIKE '%@%.%'),
  CONSTRAINT role_check CHECK (role IN ('field', 'supervisor', 'admin', 'ceo'))
);

CREATE INDEX IF NOT EXISTS crew_members_email_idx ON public.crew_members(email);
CREATE INDEX IF NOT EXISTS crew_members_role_idx ON public.crew_members(role);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_all_crew" ON public.crew_members
  FOR SELECT USING (TRUE);

CREATE POLICY "allow_insert_crew" ON public.crew_members
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "allow_update_own_crew" ON public.crew_members
  FOR UPDATE USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE OR REPLACE FUNCTION update_crew_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crew_members_updated_at_trigger ON public.crew_members;
CREATE TRIGGER crew_members_updated_at_trigger
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.crew_members TO anon, authenticated;
```

---

## ✅ Migration 002: Create users table

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'crew')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read all crew members" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() and role = 'admin'
    )
  );

CREATE POLICY "Admin can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() and role = 'admin'
    )
  );

CREATE POLICY "Admin can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() and role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
```

---

## ✅ Migration 003: Fix crew_members admin policy

```sql
DROP POLICY IF EXISTS "allow_update_own_crew" ON public.crew_members;

CREATE POLICY "Users can update own record" ON public.crew_members
  FOR UPDATE USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Admins can update any crew member" ON public.crew_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "allow_insert_crew" ON public.crew_members;

CREATE POLICY "Anyone can insert crew" ON public.crew_members
  FOR INSERT WITH CHECK (TRUE);
```

---

## ✅ Migration 004: Create shift_roster tables

```sql
CREATE TABLE IF NOT EXISTS shift_roster_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL,
  shift_type VARCHAR(50) NOT NULL CHECK (shift_type IN ('day', 'night')),
  geolocation JSONB,
  custom_data JSONB NOT NULL DEFAULT '{}',
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_roster_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  column_type VARCHAR(50) NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'select')),
  options TEXT[],
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shift_roster_rows_project_id ON shift_roster_rows(project_id);
CREATE INDEX idx_shift_roster_columns_project_id ON shift_roster_columns(project_id);

ALTER TABLE shift_roster_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_roster_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shift roster rows" ON shift_roster_rows FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can create shift roster rows" ON shift_roster_rows FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update shift roster rows" ON shift_roster_rows FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete shift roster rows" ON shift_roster_rows FOR DELETE USING (TRUE);

CREATE POLICY "Anyone can read shift roster columns" ON shift_roster_columns FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can create shift roster columns" ON shift_roster_columns FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update shift roster columns" ON shift_roster_columns FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete shift roster columns" ON shift_roster_columns FOR DELETE USING (TRUE);
```

---

## ✅ Migration 005: Create projects table

```sql
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  client VARCHAR(255),
  location TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (TRUE);
CREATE POLICY "Admin can create projects" ON projects FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Admin can update projects" ON projects FOR UPDATE USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY "Admin can delete projects" ON projects FOR DELETE USING (FALSE);
```

---

## ✅ Migration 006: Create shifts table

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id BIGINT NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type VARCHAR(50) CHECK (shift_type IN ('day', 'night')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_shifts_crew_date ON shifts(crew_member_id, scheduled_date);
CREATE INDEX idx_shifts_date ON shifts(scheduled_date);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shifts" ON shifts FOR SELECT USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
);

CREATE POLICY "Admins can view all shifts" ON shifts FOR SELECT USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);

CREATE POLICY "Admins can create/update/delete shifts" ON shifts FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
```

---

## ✅ Migration 007: Create shift_locations table

```sql
CREATE TABLE shift_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shift_locations_shift_id ON shift_locations(shift_id);

ALTER TABLE shift_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View shift locations" ON shift_locations FOR SELECT USING (
  shift_id IN (SELECT id FROM shifts WHERE crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email'))
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);

CREATE POLICY "Admins manage shift locations" ON shift_locations FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
```

---

## ✅ Migration 008: Create daily_checklists table

```sql
CREATE TABLE daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_daily_checklists_date ON daily_checklists(checklist_date);

ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view checklists" ON daily_checklists FOR SELECT USING (true);

CREATE POLICY "Admins manage checklists" ON daily_checklists FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
```

---

## ✅ Migration 009: Create checklist_items table

```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_checklist_id UUID NOT NULL REFERENCES daily_checklists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_num INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(daily_checklist_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view checklist items" ON checklist_items FOR SELECT USING (true);

CREATE POLICY "Admins manage checklist items" ON checklist_items FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
```

---

## ✅ Migration 010: Create checklist_submissions table

```sql
CREATE TABLE checklist_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  crew_member_id BIGINT NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  checklist_date DATE NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  reason_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_submissions_crew_date ON checklist_submissions(crew_member_id, checklist_date);
CREATE INDEX idx_checklist_submissions_item_date ON checklist_submissions(checklist_item_id, checklist_date);

ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own submissions" ON checklist_submissions FOR SELECT USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);

CREATE POLICY "Users can update their own submissions" ON checklist_submissions FOR UPDATE USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
);

CREATE POLICY "Users can insert their own submissions" ON checklist_submissions FOR INSERT WITH CHECK (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
);
```

---

## ✅ Migration 011: Create shift_assignments table

```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  crew_member_id BIGINT NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shift_assignments_crew_date ON shift_assignments(crew_member_id, assigned_date);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments" ON shift_assignments FOR SELECT USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);

CREATE POLICY "Admins can manage assignments" ON shift_assignments FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
```

---

## ✅ Migration 012: Add shift details columns

```sql
ALTER TABLE shifts ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE shifts ADD COLUMN park_opening_hour TIME;
ALTER TABLE shifts ADD COLUMN park_closing_hour TIME;

CREATE INDEX idx_shifts_project_id ON shifts(project_id);
```

---

## ✅ Migration 013: Create notifications table

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'update' CHECK (type IN ('update', 'alert', 'announcement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete notifications" ON notifications FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON notifications TO anon, authenticated;
GRANT INSERT ON notifications TO authenticated;
GRANT DELETE ON notifications TO authenticated;
```

---

## ✅ Migration 014: Add notification comments

```sql
ALTER TABLE notifications ADD COLUMN views_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS notifications_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  viewed_by TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_views_notification_id ON notifications_views(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_views_viewed_by ON notifications_views(viewed_by);

CREATE TABLE IF NOT EXISTS notifications_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_comments_notification_id ON notifications_comments(notification_id);

ALTER TABLE notifications_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notification views" ON notifications_views FOR SELECT USING (true);
CREATE POLICY "Authenticated users can track views" ON notifications_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read notification comments" ON notifications_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON notifications_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON notifications_views TO anon, authenticated;
GRANT INSERT ON notifications_views TO authenticated;
GRANT SELECT ON notifications_comments TO anon, authenticated;
GRANT INSERT ON notifications_comments TO authenticated;
```

---

## ✅ Migration 015: Add comment replies and reactions

```sql
CREATE TABLE IF NOT EXISTS notification_comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reply TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_comment_replies_comment_id ON notification_comment_replies(comment_id);

CREATE TABLE IF NOT EXISTS notification_comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_reaction_per_user UNIQUE (comment_id, reaction_by, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_comment_reactions_comment_id ON notification_comment_reactions(comment_id);

CREATE TABLE IF NOT EXISTS notification_comment_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  viewed_by TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_comment_viewer UNIQUE (comment_id, viewed_by)
);

CREATE INDEX IF NOT EXISTS idx_notification_comment_views_comment_id ON notification_comment_views(comment_id);

ALTER TABLE notification_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_comment_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment replies" ON notification_comment_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can reply to comments" ON notification_comment_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read comment reactions" ON notification_comment_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react to comments" ON notification_comment_reactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can remove their own reactions" ON notification_comment_reactions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read comment views" ON notification_comment_views FOR SELECT USING (true);
CREATE POLICY "Authenticated users can track comment views" ON notification_comment_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON notification_comment_replies TO anon, authenticated;
GRANT INSERT ON notification_comment_replies TO authenticated;
GRANT SELECT ON notification_comment_reactions TO anon, authenticated;
GRANT INSERT ON notification_comment_reactions TO authenticated;
GRANT DELETE ON notification_comment_reactions TO authenticated;
GRANT SELECT ON notification_comment_views TO anon, authenticated;
GRANT INSERT ON notification_comment_views TO authenticated;
```

---

## ✅ Migration 016: Add notification reactions

```sql
CREATE TABLE IF NOT EXISTS notification_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_notification_reaction_per_user UNIQUE (notification_id, reaction_by, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_reactions_notification_id ON notification_reactions(notification_id);

ALTER TABLE notification_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notification reactions" ON notification_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react to notifications" ON notification_reactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can remove their own reactions" ON notification_reactions FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON notification_reactions TO anon, authenticated;
GRANT INSERT ON notification_reactions TO authenticated;
GRANT DELETE ON notification_reactions TO authenticated;
```

---

## ✅ Migration 017: Add nested replies

```sql
ALTER TABLE notification_comment_replies
ADD COLUMN reply_to_id UUID REFERENCES notification_comment_replies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_comment_replies_reply_to_id ON notification_comment_replies(reply_to_id);

CREATE TABLE IF NOT EXISTS notification_reaction_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reaction_id UUID NOT NULL REFERENCES notification_reactions(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_reaction_details_notification_id ON notification_reaction_details(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reaction_details_reaction_type ON notification_reaction_details(reaction_type);

CREATE TABLE IF NOT EXISTS comment_reaction_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reaction_id UUID NOT NULL REFERENCES notification_comment_reactions(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES notifications_comments(id) ON DELETE CASCADE,
  reaction_by TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'question')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_reaction_details_comment_id ON comment_reaction_details(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reaction_details_reaction_type ON comment_reaction_details(reaction_type);

ALTER TABLE notification_reaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reaction_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notification reaction details" ON notification_reaction_details FOR SELECT USING (true);
CREATE POLICY "Anyone can read comment reaction details" ON comment_reaction_details FOR SELECT USING (true);

GRANT SELECT ON notification_reaction_details TO anon, authenticated;
GRANT SELECT ON comment_reaction_details TO anon, authenticated;
```

---

## ✅ Migration 018: Create password reset codes

```sql
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  email text not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS password_reset_codes_user_id_idx ON public.password_reset_codes(user_id);
CREATE INDEX IF NOT EXISTS password_reset_codes_code_idx ON public.password_reset_codes(code);
CREATE INDEX IF NOT EXISTS password_reset_codes_email_idx ON public.password_reset_codes(email);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reset codes" ON public.password_reset_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow password reset code verification" ON public.password_reset_codes FOR SELECT USING (true);
CREATE POLICY "Users can update their own reset codes" ON public.password_reset_codes FOR UPDATE USING (email = auth.jwt() ->> 'email');
```

---

## ✅ Migration 019: Fix users RLS for self-registration

```sql
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;

CREATE POLICY "Users can insert own profile or admin can insert users" ON public.users
  FOR INSERT WITH CHECK (
    (id = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    ))
  );
```

---

## ✅ Migration 020: Fix user registration RLS

```sql
DROP POLICY IF EXISTS "Users can insert own profile or admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read all crew members" ON public.users;
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Admin can update users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (id = auth.uid() OR role = 'admin');

CREATE POLICY "Users can read all crew members" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid() OR role = 'admin')
  WITH CHECK (id = auth.uid() OR role = 'admin');
```

---

## ✅ Migration 021: Fix notifications RLS

```sql
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT ARRAY['crew'],
ADD COLUMN IF NOT EXISTS is_broadcast boolean DEFAULT false;

DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read notifications for them" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can read notifications for them" ON public.notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR recipient_id = auth.uid()
    OR is_broadcast = true
    OR (
      auth.uid() IN (SELECT id FROM public.users WHERE role = ANY(target_roles))
      AND target_roles IS NOT NULL
      AND array_length(target_roles, 1) > 0
    )
  );

CREATE POLICY "Admins can update notifications" ON public.notifications
  FOR UPDATE USING (
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

CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## ✅ Migration 023: Create time_entries table

```sql
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  site_id VARCHAR(255) NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_in_latitude NUMERIC(10, 8),
  clock_in_longitude NUMERIC(11, 8),
  clock_in_address TEXT,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_latitude NUMERIC(10, 8),
  clock_out_longitude NUMERIC(11, 8),
  clock_out_address TEXT,
  total_hours NUMERIC(10, 2),
  break_hours NUMERIC(10, 2) DEFAULT 0,
  regular_hours NUMERIC(10, 2),
  overtime_hours NUMERIC(10, 2),
  shift_notes TEXT,
  concerns TEXT,
  vehicle_used VARCHAR(255),
  break_taken BOOLEAN DEFAULT false,
  photos_count INTEGER DEFAULT 0,
  geofence_flag BOOLEAN DEFAULT false,
  adjusted_hours NUMERIC(10, 2),
  adjusted_by_admin BOOLEAN DEFAULT false,
  admin_adjustment_note TEXT,
  adjusted_at TIMESTAMP WITH TIME ZONE,
  adjusted_by_user_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON public.time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON public.time_entries(employee_id, clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_out_null ON public.time_entries(clock_out_time) WHERE clock_out_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_by_admin ON public.time_entries(adjusted_by_admin);
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_at ON public.time_entries(adjusted_at);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR SELECT USING (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    OR (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

CREATE POLICY "Users can insert own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE USING (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins can manage all time entries" ON public.time_entries
  FOR ALL USING (
    (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

GRANT SELECT, INSERT, UPDATE ON public.time_entries TO authenticated;
GRANT SELECT ON public.time_entries TO anon;
```

---

## ✅ Migration 024: Create break_periods table

```sql
CREATE TABLE IF NOT EXISTS public.break_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL,
  break_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_break_periods_time_entry_id ON public.break_periods(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_break_periods_break_start ON public.break_periods(break_start);

ALTER TABLE public.break_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own break periods" ON public.break_periods
  FOR SELECT USING (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
    OR (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

CREATE POLICY "Users can create break periods for own entries" ON public.break_periods
  FOR INSERT WITH CHECK (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users can update own break periods" ON public.break_periods
  FOR UPDATE USING (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can manage all break periods" ON public.break_periods
  FOR ALL USING (
    (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

GRANT SELECT, INSERT, UPDATE ON public.break_periods TO authenticated;
GRANT SELECT ON public.break_periods TO anon;
```

---

## ⚠️ IMPORTANT: After All Migrations

Once you've run migrations 001-024, you still need to apply the **Messaging & Storage RLS Policies**.

These are SEPARATE from the migrations and should be applied AFTER all migrations complete.

See the next section in this guide or go to `docs/STORAGE_AND_MESSAGING_RLS_FIXES.md`

---

## ✅ Checklist

- [ ] Migration 001 - Create crew_members ✅
- [ ] Migration 002 - Create users ✅
- [ ] Migration 003 - Fix crew_members admin policy ✅
- [ ] Migration 004 - Create shift_roster tables ✅
- [ ] Migration 005 - Create projects ✅
- [ ] Migration 006 - Create shifts ✅
- [ ] Migration 007 - Create shift_locations ✅
- [ ] Migration 008 - Create daily_checklists ✅
- [ ] Migration 009 - Create checklist_items ✅
- [ ] Migration 010 - Create checklist_submissions ✅
- [ ] Migration 011 - Create shift_assignments ✅
- [ ] Migration 012 - Add shift details ✅
- [ ] Migration 013 - Create notifications ✅
- [ ] Migration 014 - Add notification comments ✅
- [ ] Migration 015 - Add comment replies and reactions ✅
- [ ] Migration 016 - Add notification reactions ✅
- [ ] Migration 017 - Add nested replies ✅
- [ ] Migration 018 - Create password reset codes ✅
- [ ] Migration 019 - Fix users RLS ✅
- [ ] Migration 020 - Fix user registration RLS ✅
- [ ] Migration 021 - Fix notifications RLS ✅
- [ ] Migration 023 - Create time_entries ✅
- [ ] Migration 024 - Create break_periods ✅

**Then:**
- [ ] Apply Messaging RLS Policies (from earlier prompt)
- [ ] Apply Storage RLS Policies (from earlier prompt)

---

## 🚀 Next Steps

1. Copy-paste each migration SQL into Supabase SQL Editor
2. Click **Run** and wait for ✅ success
3. Move to next migration
4. After all 24 migrations are done, apply the Messaging & Storage RLS policies
5. Then you can test all the features!
