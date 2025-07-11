-- SQL script to create Supabase Storage bucket and policies
-- Run this in your Supabase SQL Editor

-- First, create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can access all files" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files (simplified)
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to view files they uploaded
CREATE POLICY "Users can view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' 
  AND (auth.uid()::text = owner OR auth.role() = 'authenticated')
);

-- Policy to allow authenticated users to delete files they uploaded
CREATE POLICY "Users can delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = owner
);

-- Policy to allow service role full access (for backend processing)
CREATE POLICY "Service role full access" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' 
  AND auth.jwt() ->> 'role' = 'service_role'
);

-- Alternative: If RLS is causing issues, you can temporarily disable it for testing
-- WARNING: Only use this for testing, not in production
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Alternative Manual Setup via Supabase Dashboard:
-- 
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Click "Create bucket"
-- 4. Bucket name: documents
-- 5. Set as Private (not public)
-- 6. File size limit: 10MB
-- 7. Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
-- 8. Click "Create bucket"
--
-- Then for policies, go to Storage > Policies and create these policies:
--
-- Policy 1: "Allow authenticated users to upload"
-- - Target: INSERT
-- - Policy: auth.role() = 'authenticated' AND bucket_id = 'documents'
--
-- Policy 2: "Allow users to view their files"  
-- - Target: SELECT
-- - Policy: auth.role() = 'authenticated' AND bucket_id = 'documents'
--
-- Policy 3: "Allow users to delete their files"
-- - Target: DELETE  
-- - Policy: auth.uid()::text = owner AND bucket_id = 'documents'
