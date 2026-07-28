-- Create shift_roster_rows table
CREATE TABLE IF NOT EXISTS shift_roster_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL,
  shift_type VARCHAR(50) NOT NULL CHECK (shift_type IN ('day', 'night')),
  geolocation JSONB,
  custom_data JSONB NOT NULL DEFAULT '{}',
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_roster_columns table
CREATE TABLE IF NOT EXISTS shift_roster_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  column_type VARCHAR(50) NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'select')),
  options TEXT[],
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_shift_roster_rows_project_id ON shift_roster_rows(project_id);
CREATE INDEX idx_shift_roster_columns_project_id ON shift_roster_columns(project_id);

-- Enable RLS
ALTER TABLE shift_roster_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_roster_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_roster_rows
CREATE POLICY "Anyone can read shift roster rows" ON shift_roster_rows FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can create shift roster rows" ON shift_roster_rows FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update shift roster rows" ON shift_roster_rows FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete shift roster rows" ON shift_roster_rows FOR DELETE USING (TRUE);

-- RLS Policies for shift_roster_columns
CREATE POLICY "Anyone can read shift roster columns" ON shift_roster_columns FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can create shift roster columns" ON shift_roster_columns FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update shift roster columns" ON shift_roster_columns FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete shift roster columns" ON shift_roster_columns FOR DELETE USING (TRUE);
