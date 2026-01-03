-- Allow authenticated users to upload files to their own user folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);