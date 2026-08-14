-- Create time_entries table for time tracking
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
  -- Admin timecard adjustment columns (migration 022)
  adjusted_hours NUMERIC(10, 2),
  adjusted_by_admin BOOLEAN DEFAULT false,
  admin_adjustment_note TEXT,
  adjusted_at TIMESTAMP WITH TIME ZONE,
  adjusted_by_user_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON public.time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON public.time_entries(employee_id, clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_out_null ON public.time_entries(clock_out_time) WHERE clock_out_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_by_admin ON public.time_entries(adjusted_by_admin);
CREATE INDEX IF NOT EXISTS idx_time_entries_adjusted_at ON public.time_entries(adjusted_at);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Policies for time_entries
-- Allow authenticated users to view their own entries
DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR SELECT
  USING (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    OR (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

-- Allow authenticated users to insert their own entries
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
CREATE POLICY "Users can insert own time entries" ON public.time_entries
  FOR INSERT
  WITH CHECK (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
  );

-- Allow authenticated users to update their own entries (before clock out)
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE
  USING (
    employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
  );

-- Allow admins to view/update all entries
DROP POLICY IF EXISTS "Admins can manage all time entries" ON public.time_entries;
CREATE POLICY "Admins can manage all time entries" ON public.time_entries
  FOR ALL
  USING (
    (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.time_entries TO authenticated;
GRANT SELECT ON public.time_entries TO anon;
