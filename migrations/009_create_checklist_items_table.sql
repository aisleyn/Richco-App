CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_checklist_id UUID NOT NULL REFERENCES daily_checklists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_num INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(daily_checklist_id);

-- RLS
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view checklist items" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "Admins manage checklist items" ON checklist_items FOR ALL USING (
  (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
