-- Drop the insecure public upload policy for scenes folder
DROP POLICY IF EXISTS "Public can upload to scenes folder" ON storage.objects;

-- Create a secure policy that requires admin authentication for scene uploads
CREATE POLICY "Admins can upload to scenes folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
  AND is_admin(auth.uid())
);