-- Fix RLS policies to use is_admin function
DROP POLICY IF EXISTS "Admins can insert scenes" ON public.scenes;
DROP POLICY IF EXISTS "Admins can update scenes" ON public.scenes;
DROP POLICY IF EXISTS "Admins can delete scenes" ON public.scenes;

-- Recreate policies using is_admin function
CREATE POLICY "Admins can insert scenes"
ON public.scenes
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update scenes"
ON public.scenes
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete scenes"
ON public.scenes
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));