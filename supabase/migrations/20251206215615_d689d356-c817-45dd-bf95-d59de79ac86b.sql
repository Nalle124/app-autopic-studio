-- Allow admins to upload scene images
CREATE POLICY "Admins can upload scene images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
  AND public.is_admin(auth.uid())
);

-- Allow admins to update scene images  
CREATE POLICY "Admins can update scene images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
  AND public.is_admin(auth.uid())
);

-- Allow public read access to scene images
CREATE POLICY "Anyone can view scene images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
);