-- RLS Policies for Remaining Tables (only 5 tables need RLS added)
-- All other tables already have RLS from earlier migrations

-- ============================================================================
-- 1. PROJECTS TABLE
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

-- All users can read projects
CREATE POLICY "Users can read projects"
  ON public.projects
  FOR SELECT
  USING (true);

-- Only admins can insert projects
CREATE POLICY "Admins can insert projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can update projects
CREATE POLICY "Admins can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- ============================================================================
-- 2. SHIFTS TABLE
-- ============================================================================
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;

-- All users can read shifts
CREATE POLICY "Users can read shifts"
  ON public.shifts
  FOR SELECT
  USING (true);

-- Only admins can insert shifts
CREATE POLICY "Admins can insert shifts"
  ON public.shifts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can update shifts
CREATE POLICY "Admins can update shifts"
  ON public.shifts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can delete shifts
CREATE POLICY "Admins can delete shifts"
  ON public.shifts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- ============================================================================
-- 3. SHIFT_LOCATIONS TABLE
-- ============================================================================
ALTER TABLE public.shift_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read shift locations" ON public.shift_locations;
DROP POLICY IF EXISTS "Admins can manage shift locations" ON public.shift_locations;

-- All users can read shift locations
CREATE POLICY "Users can read shift locations"
  ON public.shift_locations
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert shift locations"
  ON public.shift_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update shift locations"
  ON public.shift_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete shift locations"
  ON public.shift_locations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- ============================================================================
-- 4. DAILY_CHECKLISTS TABLE
-- ============================================================================
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read checklists" ON public.daily_checklists;
DROP POLICY IF EXISTS "Admins can manage checklists" ON public.daily_checklists;

-- All users can read checklists
CREATE POLICY "Users can read checklists"
  ON public.daily_checklists
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert checklists"
  ON public.daily_checklists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update checklists"
  ON public.daily_checklists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete checklists"
  ON public.daily_checklists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- ============================================================================
-- 5. CHECKLIST_ITEMS TABLE
-- ============================================================================
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Admins can manage checklist items" ON public.checklist_items;

-- All users can read checklist items
CREATE POLICY "Users can read checklist items"
  ON public.checklist_items
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert checklist items"
  ON public.checklist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update checklist items"
  ON public.checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete checklist items"
  ON public.checklist_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_members
      WHERE email = auth.jwt() ->> 'email' AND is_admin = true
    )
  );

-- ============================================================================
-- SUMMARY: 5 RLS policies applied to remaining tables
-- ============================================================================
-- Tables with RLS added: projects, shifts, shift_locations, daily_checklists, checklist_items
-- All other tables already have RLS from migrations: 003, 010, 011, 014, 015, 016, 018, 019, 020, 021, 023, 024
