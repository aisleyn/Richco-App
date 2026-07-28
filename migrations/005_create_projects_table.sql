-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  client VARCHAR(255),
  location TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_projects_status ON projects(status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (TRUE);
CREATE POLICY "Admin can create projects" ON projects FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Admin can update projects" ON projects FOR UPDATE USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY "Admin can delete projects" ON projects FOR DELETE USING (FALSE);
