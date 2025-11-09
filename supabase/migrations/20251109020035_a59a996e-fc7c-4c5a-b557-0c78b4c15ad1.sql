-- Remove all existing scene storage policies
DROP POLICY IF EXISTS "Authenticated users can upload to scenes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Create simple, permissive policy for scenes folder
CREATE POLICY "Public can upload to scenes folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
);