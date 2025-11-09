-- Fix user_roles RLS to work with SECURITY DEFINER functions
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Allow all authenticated users to read user_roles
-- This is safe because role information needs to be readable for access control
CREATE POLICY "Anyone authenticated can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);