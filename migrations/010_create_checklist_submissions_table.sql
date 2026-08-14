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

-- RLS - users update own submissions, admins see all
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own submissions" ON checklist_submissions;
CREATE POLICY "Users can view their own submissions" ON checklist_submissions FOR SELECT USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
  OR (SELECT is_admin FROM crew_members WHERE email = auth.jwt() ->> 'email') = true
);
DROP POLICY IF EXISTS "Users can update their own submissions" ON checklist_submissions;
CREATE POLICY "Users can update their own submissions" ON checklist_submissions FOR UPDATE USING (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
);
DROP POLICY IF EXISTS "Users can insert their own submissions" ON checklist_submissions;
CREATE POLICY "Users can insert their own submissions" ON checklist_submissions FOR INSERT WITH CHECK (
  crew_member_id = (SELECT id FROM crew_members WHERE email = auth.jwt() ->> 'email')
);
