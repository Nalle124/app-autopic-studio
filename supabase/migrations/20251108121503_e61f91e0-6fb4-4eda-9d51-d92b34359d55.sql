-- Make sure the processed-cars bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('processed-cars', 'processed-cars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to scenes folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to scenes folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from processed-cars" ON storage.objects;

-- Allow anyone to upload to the scenes folder
CREATE POLICY "Allow public uploads to scenes folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'processed-cars' AND (storage.foldername(name))[1] = 'scenes');

-- Allow anyone to update files in the scenes folder
CREATE POLICY "Allow public updates to scenes folder"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'processed-cars' AND (storage.foldername(name))[1] = 'scenes');

-- Allow anyone to read from processed-cars bucket
CREATE POLICY "Allow public reads from processed-cars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'processed-cars');