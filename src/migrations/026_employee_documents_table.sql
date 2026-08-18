-- Migration 026: Create employee_documents table with RLS for identification, qualifications, and employment files

-- Create the employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id BIGSERIAL PRIMARY KEY,
  crew_member_email TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('identification', 'qualification', 'employment_file')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_date BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (crew_member_email) REFERENCES public.crew_members(email) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_employee_documents_email ON public.employee_documents(crew_member_email);
CREATE INDEX idx_employee_documents_type ON public.employee_documents(document_type);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Crew members can view their own documents
CREATE POLICY "crew_members_view_own_documents" ON public.employee_documents
  FOR SELECT
  USING (
    crew_member_email = auth.jwt() ->> 'email'
  );

-- RLS Policy 2: Crew members can insert their own documents
CREATE POLICY "crew_members_insert_own_documents" ON public.employee_documents
  FOR INSERT
  WITH CHECK (
    crew_member_email = auth.jwt() ->> 'email'
  );

-- RLS Policy 3: Crew members can update their own documents
CREATE POLICY "crew_members_update_own_documents" ON public.employee_documents
  FOR UPDATE
  USING (
    crew_member_email = auth.jwt() ->> 'email'
  )
  WITH CHECK (
    crew_member_email = auth.jwt() ->> 'email'
  );

-- RLS Policy 4: Crew members can delete their own documents
CREATE POLICY "crew_members_delete_own_documents" ON public.employee_documents
  FOR DELETE
  USING (
    crew_member_email = auth.jwt() ->> 'email'
  );

-- RLS Policy 5: Admins can view all documents
CREATE POLICY "admins_view_all_documents" ON public.employee_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.email = auth.jwt() ->> 'email'
      AND users.is_admin = true
    )
  );

-- RLS Policy 6: Service role (backend) can do everything
CREATE POLICY "service_role_all_documents" ON public.employee_documents
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
