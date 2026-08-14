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

-- RLS - inherit from shifts table via join
ALTER TABLE shift_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View shift locations" ON shift_locations;
CREATE POLICY "View shift locations" ON shift_locations FOR SELECT USING (
  shift_id IN (SELECT id FROM shifts WHERE crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email'))
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
DROP POLICY IF EXISTS "Admins manage shift locations" ON shift_locations;
CREATE POLICY "Admins manage shift locations" ON shift_locations FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
