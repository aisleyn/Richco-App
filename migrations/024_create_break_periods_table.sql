-- Create break_periods table for tracking employee breaks
CREATE TABLE IF NOT EXISTS public.break_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL,
  break_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_break_periods_time_entry_id ON public.break_periods(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_break_periods_break_start ON public.break_periods(break_start);

-- Enable RLS
ALTER TABLE public.break_periods ENABLE ROW LEVEL SECURITY;

-- Policies for break_periods (inherit from time_entries via foreign key)
-- Allow authenticated users to view their own breaks
DROP POLICY IF EXISTS "Users can view own break periods" ON public.break_periods;
CREATE POLICY "Users can view own break periods" ON public.break_periods
  FOR SELECT
  USING (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
    OR (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

-- Allow authenticated users to insert break periods for their own entries
DROP POLICY IF EXISTS "Users can create break periods for own entries" ON public.break_periods;
CREATE POLICY "Users can create break periods for own entries" ON public.break_periods
  FOR INSERT
  WITH CHECK (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Allow authenticated users to update their own break periods
DROP POLICY IF EXISTS "Users can update own break periods" ON public.break_periods;
CREATE POLICY "Users can update own break periods" ON public.break_periods
  FOR UPDATE
  USING (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = (SELECT id::TEXT FROM public.crew_members WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Allow admins to manage all breaks
DROP POLICY IF EXISTS "Admins can manage all break periods" ON public.break_periods;
CREATE POLICY "Admins can manage all break periods" ON public.break_periods
  FOR ALL
  USING (
    (SELECT is_admin FROM public.crew_members WHERE email = auth.jwt() ->> 'email') = true
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.break_periods TO authenticated;
GRANT SELECT ON public.break_periods TO anon;
