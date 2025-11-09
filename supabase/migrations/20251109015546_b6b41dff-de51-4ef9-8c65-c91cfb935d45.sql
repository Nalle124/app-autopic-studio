-- Simplify storage policies for scenes folder
-- Remove conflicting policies
DROP POLICY IF EXISTS "Admins can upload to scenes folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to scenes folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to scenes folder" ON storage.objects;

-- Create simple policy for authenticated users to upload to scenes
CREATE POLICY "Authenticated users can upload to scenes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
);