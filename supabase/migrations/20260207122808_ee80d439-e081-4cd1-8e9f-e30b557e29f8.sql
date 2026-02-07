-- Allow admins to view all user scenes (for admin dashboard)
CREATE POLICY "Admins can view all user scenes"
ON public.user_scenes
FOR SELECT
USING (is_admin(auth.uid()));