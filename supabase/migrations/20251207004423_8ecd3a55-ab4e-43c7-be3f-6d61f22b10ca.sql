-- Fix 1: Drop the public storage upload policy
DROP POLICY IF EXISTS "Public can upload to scenes folder" ON storage.objects;

-- Create admin-only policy for scenes uploads
CREATE POLICY "Admins can upload to scenes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'processed-cars'
  AND (storage.foldername(name))[1] = 'scenes'
  AND public.is_admin(auth.uid())
);

-- Fix 2: Add explicit admin-only policies for user_roles table
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));