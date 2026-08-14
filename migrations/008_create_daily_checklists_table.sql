CREATE TABLE daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_daily_checklists_date ON daily_checklists(checklist_date);

-- RLS - everyone can read, admins can write
ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view checklists" ON daily_checklists;
CREATE POLICY "Everyone can view checklists" ON daily_checklists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage checklists" ON daily_checklists;
CREATE POLICY "Admins manage checklists" ON daily_checklists FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
