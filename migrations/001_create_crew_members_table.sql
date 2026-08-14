-- Create crew_members table for Richco app
-- This stores crew member profiles with numeric IDs, persistent across devices

CREATE TABLE IF NOT EXISTS public.crew_members (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'field',
  status VARCHAR(50) DEFAULT 'available',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast lookups
  CONSTRAINT email_format CHECK (email LIKE '%@%.%'),
  CONSTRAINT role_check CHECK (role IN ('field', 'supervisor', 'admin', 'ceo'))
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS crew_members_email_idx ON public.crew_members(email);

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS crew_members_role_idx ON public.crew_members(role);

-- Enable RLS (Row Level Security) - Allow public read/write for now
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all crew members
DROP POLICY IF EXISTS "allow_read_all_crew" ON public.crew_members;
CREATE POLICY "allow_read_all_crew" ON public.crew_members
  FOR SELECT
  USING (TRUE);

-- Policy: Allow authenticated users to insert their own registration
DROP POLICY IF EXISTS "allow_insert_crew" ON public.crew_members;
CREATE POLICY "allow_insert_crew" ON public.crew_members
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Allow users to update their own record
DROP POLICY IF EXISTS "allow_update_own_crew" ON public.crew_members;
CREATE POLICY "allow_update_own_crew" ON public.crew_members
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crew_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS crew_members_updated_at_trigger ON public.crew_members;
CREATE TRIGGER crew_members_updated_at_trigger
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.crew_members TO anon, authenticated;
