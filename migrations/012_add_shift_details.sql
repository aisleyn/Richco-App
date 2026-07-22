-- Add new columns to shifts table for enhanced shift management
ALTER TABLE shifts ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE shifts ADD COLUMN park_opening_hour TIME;
ALTER TABLE shifts ADD COLUMN park_closing_hour TIME;

-- Create index for project lookups
CREATE INDEX idx_shifts_project_id ON shifts(project_id);
