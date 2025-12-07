-- Fix user_roles visibility: restrict to own roles only
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);