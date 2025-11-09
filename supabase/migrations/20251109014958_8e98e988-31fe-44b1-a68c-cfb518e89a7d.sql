-- Fix RLS policies for scenes table
DROP POLICY IF EXISTS "Admins can insert scenes" ON public.scenes;
DROP POLICY IF EXISTS "Admins can update scenes" ON public.scenes;
DROP POLICY IF EXISTS "Admins can delete scenes" ON public.scenes;

-- Recreate policies with correct admin check
CREATE POLICY "Admins can insert scenes"
ON public.scenes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update scenes"
ON public.scenes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete scenes"
ON public.scenes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Fix storage policies for scenes folder
DROP POLICY IF EXISTS "Admins can upload to scenes folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view scenes folder" ON storage.objects;

CREATE POLICY "Admins can upload to scenes folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Anyone can view scenes folder"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'processed-cars' 
  AND (storage.foldername(name))[1] = 'scenes'
);