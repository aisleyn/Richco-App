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

-- RLS Policies
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
