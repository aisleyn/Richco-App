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

-- RLS Policies
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own assignments" ON shift_assignments;
CREATE POLICY "Users can view their own assignments" ON shift_assignments FOR SELECT USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
DROP POLICY IF EXISTS "Admins can manage assignments" ON shift_assignments;
CREATE POLICY "Admins can manage assignments" ON shift_assignments FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
